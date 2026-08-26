/**
 * creation.ts — 立命 (the four-step gate)
 *
 * 立名 → 出身 → 属性 → 抽命. The step machine lives in the engine, not the UI:
 * calling `submitOrigin` while the draft is still on step 0 is *rejected*, so a
 * hand-crafted store call or a replayed command sequence cannot skip a gate.
 *
 * Step 4 casts three D100 through the audited wheel, in a fixed order:
 *   1. 灵根 — visible, and there is no reroll;
 *   2. 命格 — visible;
 *   3. 道缘 — sealed, filed under an opaque reason, never shown.
 *
 * Because all three go through `roll()`, the whole of a character's origin is
 * reproducible from the seed alone.
 */

import { fateById, fateForRoll } from '@/data/fates';
import { itemById } from '@/data/items';
import { originById, ORIGINS } from '@/data/origins';
import { realmDef } from '@/data/realms';
import { spiritRootDefForRoll } from '@/data/spiritRoots';
import { buildChainEntry, GENESIS_HASH, isForbiddenWish, WISH_REJECTION } from './audit';
import { derive } from './derived';
import { initRngState, roll } from './rng';
import { SEAL_REASON } from './seal';
import {
  ATTRIBUTE_KEYS,
  SAVE_VERSION,
  type Attributes,
  type Character,
  type CreationDraft,
  type Element,
  type FlagValue,
  type GameState,
  type SpiritRoot,
  type TurnResult,
} from './types';
import { addItem, cloneState, entry, pushLog } from './util';

/** Every attribute starts here before points and 出身 modifiers. */
export const BASE_ATTRIBUTE = 3;
/** Points the player distributes at step 2. */
export const CREATION_POINTS = 12;
/** Ceiling on a single attribute's *allocated* share (base excluded). */
export const MAX_ALLOCATION = 7;
export const MAX_NAME_LENGTH = 12;
export const START_AGE = 16;

export const CREATION_STEP_LABELS: readonly string[] = ['立名', '出身', '资质', '抽命', '入世'];

export const ORIGIN_CHOICES = ORIGINS;

export function emptyAllocation(): Attributes {
  return { shenHun: 0, tiPo: 0, wuXing: 0, dingLi: 0, jiBian: 0 };
}

export function allocationTotal(allocation: Attributes): number {
  return ATTRIBUTE_KEYS.reduce((sum, k) => sum + allocation[k], 0);
}

export function allocationRemaining(allocation: Attributes): number {
  return CREATION_POINTS - allocationTotal(allocation);
}

export function emptyStats(): GameState['stats'] {
  return {
    turns: 0,
    years: 0,
    peakRealm: 'mortal',
    peakRealmLabel: '凡尘',
    totalRolls: 0,
    stonesEarned: 0,
    battlesWon: 0,
    extinguished: 0,
    calamitiesSurvived: 0,
    calamitiesDissolved: 0,
    peakCalamity: 0,
    peakFortune: 0,
    merit: 0,
    divinations: 0,
  };
}

export function initialState(seed: string): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rngState: initRngState(seed),
    phase: 'title',
    creationStep: 0,
    draft: null,
    turn: 0,
    character: null,
    combat: null,
    pendingEvent: null,
    forecast: null,
    log: [],
    rolls: [],
    rollSeq: 0,
    auditHash: GENESIS_HASH,
    chain: [],
    stats: emptyStats(),
    ending: null,
  };
}

function reject(state: GameState, reason: string): TurnResult {
  return { state, entries: [], rejected: reason };
}

// ============================================================================
// Step 0 — 开卷
// ============================================================================

export function beginCreation(state: GameState): TurnResult {
  if (state.phase !== 'title') return reject(state, '图录已开,不能重来。');
  const next = cloneState(state);
  next.phase = 'creation';
  next.creationStep = 0;
  next.draft = {
    name: '',
    gender: '男',
    originId: null,
    allocation: emptyAllocation(),
    spiritRoot: null,
    fateId: null,
  };
  const entries = [
    entry(0, '图录', '图录既开。此卷记一人之运,亦记其劫。', 'violet'),
    entry(0, '天机', '先报姓名。无名者不入册。', 'calm'),
  ];
  pushLog(next, entries);
  return { state: next, entries };
}

// ============================================================================
// Step 0 → 1 — 立名
// ============================================================================

export function submitName(state: GameState, name: string, gender: '男' | '女'): TurnResult {
  if (state.phase !== 'creation' || state.creationStep !== 0) {
    return reject(state, '此时不当立名。');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) return reject(state, '无名者不入册。');
  if (trimmed.length > MAX_NAME_LENGTH) return reject(state, `姓名不得逾 ${MAX_NAME_LENGTH} 字。`);
  if (isForbiddenWish(trimmed)) return reject(state, WISH_REJECTION);

  const next = cloneState(state);
  next.draft = { ...next.draft!, name: trimmed, gender };
  next.creationStep = 1;
  const entries = [entry(0, '图录', `录:${trimmed},${gender}。`, 'violet')];
  pushLog(next, entries);
  return { state: next, entries };
}

// ============================================================================
// Step 1 → 2 — 出身
// ============================================================================

export function submitOrigin(state: GameState, originId: string): TurnResult {
  if (state.phase !== 'creation' || state.creationStep !== 1) {
    return reject(state, '尚未立名,何谈出身。');
  }
  const origin = originById(originId);
  if (!origin) return reject(state, '无此出身。');

  const next = cloneState(state);
  next.draft = { ...next.draft!, originId };
  next.creationStep = 2;
  const entries = [entry(0, '图录', `出身:${origin.name}。${origin.special}`, 'violet')];
  pushLog(next, entries);
  return { state: next, entries };
}

// ============================================================================
// Step 2 → 3 — 属性
// ============================================================================

export function submitAllocation(state: GameState, allocation: Attributes): TurnResult {
  if (state.phase !== 'creation' || state.creationStep !== 2) {
    return reject(state, '尚未择出身,不能分配资质。');
  }
  const total = allocationTotal(allocation);
  if (total !== CREATION_POINTS) {
    return reject(state, `资质点须恰好用尽 ${CREATION_POINTS} 点(现为 ${total})。`);
  }
  for (const k of ATTRIBUTE_KEYS) {
    const v = allocation[k];
    if (!Number.isInteger(v) || v < 0 || v > MAX_ALLOCATION) {
      return reject(state, `单项资质须在 0–${MAX_ALLOCATION} 之间。`);
    }
  }

  const next = cloneState(state);
  next.draft = { ...next.draft!, allocation: { ...allocation } };
  next.creationStep = 3;
  const entries = [entry(0, '图录', '资质既定。落子无悔。', 'violet')];
  pushLog(next, entries);
  return { state: next, entries };
}

// ============================================================================
// Step 3 → 4 — 抽命(灵根 / 命格 / 暗掷)
// ============================================================================

function buildSpiritRoot(state: GameState, rollValue: number): SpiritRoot {
  const def = spiritRootDefForRoll(rollValue);
  const elements: Element[] = [];
  const pool = [...def.pool];
  for (let i = 0; i < def.elementCount && pool.length > 0; i++) {
    const pick = roll(state, 'D6', '灵根·属性') % pool.length;
    elements.push(pool[pick]!);
    pool.splice(pick, 1);
  }
  return {
    grade: def.grade,
    elements,
    speedMultiplier: def.speedMultiplier,
    calamityAffinity: def.calamityAffinity,
    rollValue,
  };
}

export function drawDestiny(state: GameState): TurnResult {
  if (state.phase !== 'creation' || state.creationStep !== 3) {
    return reject(state, '资质未定,不可抽命。');
  }
  const next = cloneState(state);

  const rootRoll = roll(next, 'D100', '灵根·定品');
  const spiritRoot = buildSpiritRoot(next, rootRoll);
  const fateRoll = roll(next, 'D100', '命格·定盘');
  const fate = fateForRoll(fateRoll);
  // The sealed roll. Filed, hashed, and never named.
  const daoYuan = roll(next, 'D100', SEAL_REASON);

  next.draft = { ...next.draft!, spiritRoot, fateId: fate.id };
  next.creationStep = 4;
  next.character = assembleCharacter(next.draft, daoYuan);

  const entries = [
    entry(
      0,
      '图录',
      `灵根:${spiritRoot.grade}〔${spiritRoot.elements.join('')}〕(D100=${rootRoll})。`,
      'violet',
    ),
    entry(0, '图录', `命格:${fate.name}(D100=${fateRoll})。${fate.desc}`, 'violet'),
    entry(0, '天机', '尚有一掷,不予示人。', 'calm'),
  ];
  pushLog(next, entries);
  return { state: next, entries };
}

// ============================================================================
// Step 4 — 入世
// ============================================================================

function assembleCharacter(draft: CreationDraft, daoYuan: number): Character {
  const origin = originById(draft.originId!)!;
  const fate = fateById(draft.fateId!) ?? fateForRoll(30);

  const attributes: Attributes = emptyAllocation();
  for (const k of ATTRIBUTE_KEYS) {
    attributes[k] =
      BASE_ATTRIBUTE + draft.allocation[k] + (origin.attributeMods[k] ?? 0) + (fate.attributeMods[k] ?? 0);
  }

  const rd = realmDef('mortal');
  const inventory = origin.startItems.map((s) => ({ ...s }));
  const flags: Record<string, FlagValue> = { ...(origin.startFlags ?? {}) };
  if (draft.fateId === 'mieyun') {
    addItem(inventory, 'tulu1', 1);
    flags.tulu1 = true;
    flags.tuluTrace = true;
  }

  const character: Character = {
    name: draft.name,
    gender: draft.gender,
    originId: origin.id,
    fateId: fate.id,
    attributes,
    spiritRoot: draft.spiritRoot!,
    realm: { realm: 'mortal', layer: 0, stage: '初期', exp: 0, expNeeded: rd.baseExp },
    age: START_AGE,
    lifespan: rd.lifespan,
    hp: 1,
    maxHp: 1,
    mana: 1,
    maxMana: 1,
    fortune: Math.max(0, Math.min(100, origin.startFortune + fate.startFortune)),
    calamity: {
      value: Math.max(0, origin.startCalamity + (draft.fateId === 'yinghuo' ? 12 : 0)),
      peak: 0,
      survived: 0,
      dissolved: 0,
      streak: 0,
    },
    merit: origin.startMerit + fate.startMerit,
    spiritStones: origin.startStones,
    routeId: null,
    learned: [],
    inventory,
    equipped: {},
    sectId: null,
    reputation: 0,
    sectRankIndex: -1,
    injuries: [],
    breakthroughBuff: 0,
    flags,
    extinguishCount: 0,
    sparedCount: 0,
    seenEvents: [],
    daoYuan,
  };
  character.calamity.peak = character.calamity.value;

  const d = derive(character);
  character.maxHp = d.maxHp;
  character.hp = d.maxHp;
  character.maxMana = d.maxMana;
  character.mana = d.maxMana;

  // Auto-equip whatever the 出身 handed over, so turn 1 is not spent dressing.
  for (const stack of inventory) {
    const def = itemById(stack.itemId);
    if (!def) continue;
    if (def.kind === 'weapon' && !character.equipped.weapon) character.equipped.weapon = def.id;
    if (def.kind === 'robe' && !character.equipped.robe) character.equipped.robe = def.id;
    if (def.kind === 'charm' && !character.equipped.charm) character.equipped.charm = def.id;
  }
  return character;
}

export function finishCreation(state: GameState): TurnResult {
  if (state.phase !== 'creation' || state.creationStep !== 4) {
    return reject(state, '命数未定,不可入世。');
  }
  if (!state.character) return reject(state, '图录未成。');

  const next = cloneState(state);
  const c = next.character!;
  next.phase = 'playing';
  next.turn = 1;
  next.draft = null;
  next.stats.peakFortune = c.fortune;
  next.stats.peakCalamity = c.calamity.value;

  const entries = [
    entry(1, '图录', `${c.name},年 ${c.age},入册。`, 'violet'),
    entry(1, '天机', '气运一栏已启,劫运一栏亦然。二者同涨,从无例外。', 'calm'),
  ];
  pushLog(next, entries);

  const chainEntry = buildChainEntry(next.auditHash, next.turn, '入世', []);
  next.chain.push(chainEntry);
  next.auditHash = chainEntry.hash;
  return { state: next, entries };
}
