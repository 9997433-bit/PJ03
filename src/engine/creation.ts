// ============================================================================
// creation.ts — 入世四步 (mandatory 4-step character creation state machine)
//   step 0 → ① 出身 → step 1 → ② 属性分配 → step 2 → ③ 灵根抽取 (D100)
//   → step 3 → ④ 天命暗掷 (sealed D100 → 机缘) → step 4, phase 'playing'
//
// Steps gate each other: cannot skip, cannot redo, cannot re-roll.
// Every public step function takes a GameState and returns a NEW GameState
// (invalid input ⇒ a 系统 log line, state otherwise unchanged) — the shape
// the store facade expects. All randomness flows through the shared seeded
// PRNG and lands in the audit trail; the hidden 机缘 roll is recorded with
// `sealed: true` so 审计 shows the roll happened but never its value.
// ============================================================================

import type {
  AnyElement,
  Attributes,
  Character,
  Die,
  GameState,
  ItemStack,
  LogEntry,
  SpiritRoot,
  SpiritRootGrade,
} from './types';
import { LOG_CAP, ROLL_CAP, SAVE_VERSION } from './types';
import { createRngState, rollDie } from './rng';
import {
  buildAttributes,
  deriveMaxHp,
  mapHiddenRollToJiYuan,
  validateAllocation,
  type AllocationInput,
} from './attributes';
import { initialRealmState, lifespanFor } from './realms';
import { START_AGE } from './lifecycle';
import { ORIGINS } from '@/data/origins';

export const DEFAULT_NAME = '无名散人';

// ============================================================================
// 灵根 D100 lottery (PLAN §6.2) — canonical table, embedded so the creation
// rules stay stable even while presentation data evolves elsewhere.
// ============================================================================

export interface SpiritRootRow {
  min: number;
  max: number;
  grade: SpiritRootGrade;
  elementCount: number;
  speedMultiplier: number;
  /** 异灵根 draws from 雷/冰/风 */
  mutant?: boolean;
  blurb: string;
}

export const SPIRIT_ROOT_LOTTERY: SpiritRootRow[] = [
  { min: 1, max: 40, grade: '五灵根', elementCount: 5, speedMultiplier: 0.5,
    blurb: '碑面五色驳杂，黯淡如泥。五灵根，俗谓伪灵根。仙路于汝，近乎闭塞——然韩立亦起于此。' },
  { min: 41, max: 65, grade: '四灵根', elementCount: 4, speedMultiplier: 0.7,
    blurb: '四色微光，浊而不清。四灵根，资质下下。修行之路，汝当以苦为舟。' },
  { min: 66, max: 82, grade: '三灵根', elementCount: 3, speedMultiplier: 0.9,
    blurb: '三色光华，勉强成形。三灵根，中人之姿。可入门墙，难望绝顶。' },
  { min: 83, max: 93, grade: '双灵根', elementCount: 2, speedMultiplier: 1.2,
    blurb: '两色灵光，清亮夺目。双灵根，已胜世间九成之人。' },
  { min: 94, max: 97, grade: '真灵根', elementCount: 1, speedMultiplier: 1.6,
    blurb: '一色纯光，直上三尺！真灵根——百年难遇，宗门必争。' },
  { min: 98, max: 99, grade: '异灵根', elementCount: 1, speedMultiplier: 2.2, mutant: true,
    blurb: '碑光骤变，异色横空！变异灵根，天地钟爱，妖孽之姿。' },
  { min: 100, max: 100, grade: '天灵根', elementCount: 1, speedMultiplier: 3.0,
    blurb: '万丈光柱，贯穿天地！天灵根！测灵碑嗡鸣不止——此界百年，唯汝一人。' },
];

export const BASE_ELEMENTS: AnyElement[] = ['金', '木', '水', '火', '土'];
export const MUTANT_ELEMENTS: AnyElement[] = ['雷', '冰', '风'];

export function lookupSpiritRootRow(d100: number): SpiritRootRow {
  const row = SPIRIT_ROOT_LOTTERY.find((r) => d100 >= r.min && d100 <= r.max);
  if (!row) throw new Error(`灵根天数溢出: ${d100}`);
  return row;
}

/**
 * Pure resolver: maps a D100 to a SpiritRoot. `draw(n)` must return an index
 * 0…n−1 and is invoked once per element sub-pick. Exported for tests/UI.
 */
export function resolveSpiritRoot(d100: number, draw: (options: number) => number): SpiritRoot {
  const row = lookupSpiritRootRow(d100);
  let elements: AnyElement[];
  if (row.mutant) {
    elements = [MUTANT_ELEMENTS[draw(MUTANT_ELEMENTS.length) % MUTANT_ELEMENTS.length] ?? '雷'];
  } else if (row.elementCount >= BASE_ELEMENTS.length) {
    elements = [...BASE_ELEMENTS];
  } else {
    const pool = [...BASE_ELEMENTS];
    elements = [];
    for (let i = 0; i < row.elementCount; i++) {
      const at = draw(pool.length) % pool.length;
      const el = pool[at];
      if (el === undefined) break; // unreachable; satisfies noUncheckedIndexedAccess
      elements.push(el);
      pool.splice(at, 1);
    }
  }
  return { grade: row.grade, elements, speedMultiplier: row.speedMultiplier, rollValue: d100 };
}

// ============================================================================
// internal helpers (mutate the local clone only)
// ============================================================================

function clone(state: GameState): GameState {
  return typeof structuredClone === 'function'
    ? structuredClone(state)
    : (JSON.parse(JSON.stringify(state)) as GameState);
}

function log(state: GameState, speaker: LogEntry['speaker'], text: string, tone?: LogEntry['tone']): void {
  const id = state.nextLogId ?? (state.narrativeLog[state.narrativeLog.length - 1]?.id ?? 0) + 1;
  state.nextLogId = id + 1;
  state.narrativeLog.push({ id, turn: state.turn, speaker, text, tone });
  if (state.narrativeLog.length > LOG_CAP) state.narrativeLog.splice(0, state.narrativeLog.length - LOG_CAP);
}

/** Audited dice: advances the shared PRNG and appends to the roll trail. */
function rollDice(state: GameState, die: Die, reason: string, sealed = false): number {
  const seedState = state.rngState;
  const { value, state: next } = rollDie(state.rngState, die);
  state.rngState = next;
  state.rollSeq = (state.rollSeq ?? 0) + 1;
  const id = state.nextRollId ?? (state.rolls[state.rolls.length - 1]?.id ?? 0) + 1;
  state.nextRollId = id + 1;
  state.rolls.push({ id, turn: state.turn, die, value, reason, seedState, ...(sealed ? { sealed: true } : {}) });
  if (state.rolls.length > ROLL_CAP) state.rolls.splice(0, state.rolls.length - ROLL_CAP);
  if (state.stats) state.stats.totalRolls += 1;
  return value;
}

function deny(state: GameState, text: string): GameState {
  const s = clone(state);
  log(s, '系统', text, 'muted');
  return s;
}

interface LooseOrigin {
  id: string;
  name: string;
  desc?: string;
  attributeMods?: Partial<Attributes>;
  startSpiritStones?: number;
  startItems?: string[];
  startFlags?: Record<string, boolean | number>;
  startTechniqueId?: string;
}

function findOrigin(originId: string): LooseOrigin | undefined {
  return (ORIGINS as unknown as LooseOrigin[]).find((o) => o.id === originId);
}

// ============================================================================
// entry — a brand-new GameState in creation phase
// ============================================================================

export function newGame(seed: string): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: createRngState(seed),
    phase: 'creation',
    creationStep: 0,
    creationDraft: {
      name: DEFAULT_NAME,
      gender: '男',
      originId: null,
      attributes: null,
      spiritRoot: null,
      hiddenRolled: false,
    },
    turn: 0,
    character: null,
    npcs: {},
    quests: [],
    combat: null,
    pendingEvent: null,
    pendingChoice: null,
    narrativeLog: [],
    rolls: [],
    auditHash: '',
    nextRollId: 1,
    nextLogId: 1,
    rollSeq: 0,
    killCount: 0,
    stats: {
      totalRolls: 0,
      stonesEarned: 0,
      enemiesSlain: 0,
      breakthroughsFailed: 0,
      pillsConsumed: 0,
      peakRealmLabel: '凡人',
    },
    ending: null,
  };
  log(state, '天道', '天地不仁，以万物为刍狗。');
  log(state, '天道', '今有一缕生魂，坠入尘寰。姓名未定，命数未书。');
  log(state, '天道', '天道执笔，记汝一生。落子无悔。先择尘世之身。');
  return state;
}

// ============================================================================
// step ① 出身 (also fixes name & gender)
// ============================================================================

export function chooseOrigin(state: GameState, originId: string, name?: string, gender?: '男' | '女'): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 0 || !state.creationDraft) {
    return deny(state, state.creationStep > 0 ? '此步已定，不可回溯。' : '命数未启，不可择身。');
  }
  const origin = findOrigin(originId);
  if (!origin) {
    return deny(state, `无此出身。可选：${(ORIGINS as unknown as LooseOrigin[]).map((o) => o.name).join('／')}`);
  }
  const s = clone(state);
  const draft = s.creationDraft!;
  const trimmed = (name ?? '').trim().slice(0, 12);
  draft.name = trimmed.length > 0 ? trimmed : draft.name || DEFAULT_NAME;
  if (gender) draft.gender = gender;
  draft.originId = origin.id;
  s.creationStep = 1;
  log(s, '天道', `汝生于${origin.name}。${origin.desc ?? ''}`);
  return s;
}

// ============================================================================
// step ② 属性分配 — final values 5–10 each, four together exactly 30;
// origin modifiers apply on top (may exceed the cap). 机缘不可分配。
// ============================================================================

export function allocateAttributes(state: GameState, alloc: AllocationInput): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 1 || !state.creationDraft?.originId) {
    return deny(state, state.creationStep > 1 ? '此步已定，不可回溯。' : '顺序不可乱，先择出身。');
  }
  const err = validateAllocation(alloc);
  if (err) return deny(state, err);

  const origin = findOrigin(state.creationDraft.originId);
  const attrs = buildAttributes(alloc, origin?.attributeMods ?? {});

  const s = clone(state);
  s.creationDraft!.attributes = {
    genGu: attrs.genGu,
    wuXing: attrs.wuXing,
    xinXing: attrs.xinXing,
    qiYun: attrs.qiYun,
  };
  s.creationStep = 2;
  log(
    s,
    '天道',
    `骨相既定：根骨${attrs.genGu}，悟性${attrs.wuXing}，心性${attrs.xinXing}，气运${attrs.qiYun}。命格如是，不增不减。`
  );
  return s;
}

// ============================================================================
// step ③ 灵根抽取 — one D100 against the lottery, final, no re-roll
// ============================================================================

export function rollSpiritRoot(state: GameState): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 2 || !state.creationDraft?.attributes) {
    return deny(state, state.creationStep > 2 ? '灵根已定，天不改命。' : '顺序不可乱，先定命格。');
  }
  const s = clone(state);
  log(s, '天道', '测灵碑前，汝伸手按上碑面。碑光明灭——');
  const main = rollDice(s, 'D100', '灵根抽取');
  const root = resolveSpiritRoot(main, (options) => (rollDice(s, 'D100', '灵根属性') - 1) % options);

  s.creationDraft!.spiritRoot = root;
  s.creationStep = 3;
  const tone = root.speedMultiplier >= 1.6 ? 'gold' : root.speedMultiplier <= 0.5 ? 'danger' : 'normal';
  log(s, '天道', `掷骰：D100 = ${main}。${lookupSpiritRootRow(main).blurb}`, tone);
  log(s, '系统', `灵根：${root.grade}，属性【${root.elements.join('·')}】，修行速率 ×${root.speedMultiplier}。`, 'muted');
  return s;
}

// ============================================================================
// step ④ 天命暗掷 — one SEALED D100 sets 机缘 (1–10) and finalizes the
// Character. The audit trail records the roll with `sealed: true`; the
// narration is fixed and digit-free. The value never appears anywhere.
// ============================================================================

export function rollHiddenFate(state: GameState): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 3 || !state.creationDraft?.spiritRoot) {
    return deny(state, state.creationStep > 3 ? '天道已掷，岂容再问。' : '顺序不可乱，先测灵根。');
  }
  const s = clone(state);
  const draft = s.creationDraft!;
  const hidden = rollDice(s, 'D100', '天命暗掷', true);
  const jiYuan = mapHiddenRollToJiYuan(hidden);

  const origin = findOrigin(draft.originId!) ?? { id: draft.originId!, name: draft.originId! };
  const attributes: Attributes = { ...draft.attributes!, jiYuan };

  const inventory: ItemStack[] = [];
  for (const itemId of origin.startItems ?? []) {
    const stack = inventory.find((st) => st.itemId === itemId);
    if (stack) stack.count += 1;
    else inventory.push({ itemId, count: 1 });
  }

  const realm = initialRealmState();
  const base: Character = {
    name: draft.name,
    gender: draft.gender,
    originId: origin.id,
    attributes,
    spiritRoot: draft.spiritRoot!,
    realm,
    age: START_AGE,
    lifespan: lifespanFor('mortal'),
    hp: 1,
    maxHp: 1,
    injuries: [],
    statusEffects: [],
    techniqueId: origin.startTechniqueId ?? null,
    combatArts: [],
    spiritStones: origin.startSpiritStones ?? 0,
    inventory,
    equipped: {},
    sectId: null,
    breakthroughBonus: 0,
    flags: { ...(origin.startFlags ?? {}) },
  };
  const maxHp = deriveMaxHp(base);
  const character: Character = { ...base, hp: maxHp, maxHp };

  draft.hiddenRolled = true;
  s.creationDraft = null;
  s.creationStep = 4;
  s.phase = 'playing';
  s.turn = 1;
  s.character = character;

  log(s, '天道', '最后，天道于幕后掷下一枚骰子。汝听见骰声，看不见点数。');
  log(s, '天道', '天道已掷，命数已定。');
  log(s, '天道', `尘埃落定。${character.name}，汝之仙路，自此始。生死祸福，俱在骰中。`, 'gold');
  return s;
}

/** legacy alias */
export const rollHidden = rollHiddenFate;
