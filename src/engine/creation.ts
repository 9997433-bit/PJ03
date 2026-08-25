// ============================================================================
// creation.ts — 4-step character creation state machine
//   step 0 → 出身 (origin) → step 1 → 属性分配 → step 2 → 灵根抽取 (D100)
//   → step 3 → 暗掷天命 (sealed D100 → 机缘) → step 4 (character finalized)
//
// Steps gate each other: cannot skip, cannot redo, cannot re-roll.
// All randomness flows through the audited rng.roll on GameState.
// The hidden 机缘 value is NEVER written into any narrative string.
// ============================================================================

import type { Character, Element, GameState, ItemStack, LogEntry, SpiritRoot } from './types';
import { NARRATIVE_LOG_CAP } from './types';
import { roll } from './rng';
import { ORIGINS } from '@/data/origins';
import {
  BASE_ELEMENTS,
  lookupSpiritRoot,
  MUTATED_ELEMENTS,
  SPIRIT_ROOT_FLAVOR,
} from '@/data/spiritRoots';
import {
  applyAllocation,
  applyAttributeMods,
  mapHiddenRollToJiYuan,
  maxHpFor,
  validateAllocation,
  type Allocation,
} from './attributes';
import { initialRealmState, lifespanFor } from './realms';

export const START_AGE = 16;

/** 修仙家族旁系 begins with the 黄阶功法《引气诀》. */
export const CLAN_START_TECHNIQUE_ID = 'yinqijue';

export type CreationOutcome = { ok: true; state: GameState } | { ok: false; error: string };

// ===== log helper (local; creation runs before turn.ts owns the loop) =====
function withLogs(state: GameState, lines: Array<{ text: string; tone?: LogEntry['tone'] }>): GameState {
  const entries: LogEntry[] = lines.map((l) => ({ turn: state.turn, speaker: '天道', text: l.text, tone: l.tone }));
  const log = [...state.narrativeLog, ...entries];
  const capped = log.length > NARRATIVE_LOG_CAP ? log.slice(log.length - NARRATIVE_LOG_CAP) : log;
  return { ...state, narrativeLog: capped };
}

function guard(state: GameState, step: GameState['creationStep']): string | null {
  if (state.phase !== 'creation') return '未入创角之境。';
  if (state.creationStep > step) return '此步已定，不可回溯。';
  if (state.creationStep < step) return '顺序不可乱，先完成前一步。';
  return null;
}

// ===== step 0 entry =====

/** Enter the creation phase with a fresh draft. Name defaults when blank. */
export function beginCreation(state: GameState, name: string, gender: '男' | '女'): GameState {
  const trimmed = name.trim().slice(0, 12);
  const next: GameState = {
    ...state,
    phase: 'creation',
    creationStep: 0,
    character: null,
    ending: null,
    creationDraft: {
      name: trimmed.length > 0 ? trimmed : '无名散人',
      gender,
      originId: null,
      attributes: null,
      spiritRoot: null,
    },
  };
  return withLogs(next, [{ text: '天地不仁。汝既执意问道，先定尘世之身。' }]);
}

// ===== step 1: 出身 =====

export function chooseOrigin(state: GameState, originId: string): CreationOutcome {
  const err = guard(state, 0);
  if (err) return { ok: false, error: err };
  const draft = state.creationDraft;
  if (!draft) return { ok: false, error: '未入创角之境。' };
  const origin = ORIGINS.find((o) => o.id === originId);
  if (!origin) return { ok: false, error: `无此出身：${originId}` };

  const next: GameState = {
    ...state,
    creationStep: 1,
    creationDraft: { ...draft, originId: origin.id },
  };
  return { ok: true, state: withLogs(next, [{ text: `汝生于${origin.name}。${origin.desc}` }]) };
}

// ===== step 2: 属性分配 =====

/**
 * Base 5 in each visible attribute + 10 free points, per-attribute cap 10.
 * Origin modifiers are applied on top afterwards (they may exceed the cap).
 * 机缘 is not allocatable and stays 0 until the hidden roll.
 */
export function allocateAttributes(state: GameState, alloc: Allocation): CreationOutcome {
  const err = guard(state, 1);
  if (err) return { ok: false, error: err };
  const draft = state.creationDraft;
  if (!draft || !draft.originId) return { ok: false, error: '先择出身。' };

  const check = validateAllocation(alloc);
  if (!check.ok) return { ok: false, error: check.error };

  const origin = ORIGINS.find((o) => o.id === draft.originId);
  if (!origin) return { ok: false, error: `无此出身：${draft.originId}` };
  const attrs = applyAttributeMods(applyAllocation(alloc), origin.attributeMods);

  const next: GameState = {
    ...state,
    creationStep: 2,
    creationDraft: { ...draft, attributes: attrs },
  };
  return {
    ok: true,
    state: withLogs(next, [
      {
        text: `命格既定：根骨${attrs.genGu}，悟性${attrs.wuXing}，心性${attrs.xinXing}，气运${attrs.qiYun}。`,
      },
    ]),
  };
}

// ===== step 3: 灵根抽取 (D100 lottery) =====

/**
 * Pure resolver: maps a D100 to a SpiritRoot.
 * `draw(n)` must return an index 0…n−1 and is called for each element sub-pick.
 * Exported so the lottery table can be unit-tested without a GameState.
 */
export function resolveSpiritRoot(d100: number, draw: (options: number) => number): SpiritRoot {
  const row = lookupSpiritRoot(d100);
  let elements: Element[];
  if (row.mutated) {
    elements = [MUTATED_ELEMENTS[draw(MUTATED_ELEMENTS.length) % MUTATED_ELEMENTS.length]];
  } else if (row.elementCount >= BASE_ELEMENTS.length) {
    elements = [...BASE_ELEMENTS];
  } else {
    const pool = [...BASE_ELEMENTS];
    elements = [];
    for (let i = 0; i < row.elementCount; i++) {
      elements.push(pool.splice(draw(pool.length) % pool.length, 1)[0]);
    }
  }
  return { grade: row.grade, elements, speedMultiplier: row.speedMultiplier, rollValue: d100 };
}

function toneForRoot(root: SpiritRoot): LogEntry['tone'] {
  if (root.speedMultiplier >= 1.6) return 'gold';
  if (root.speedMultiplier >= 1.2) return 'jade';
  if (root.speedMultiplier <= 0.5) return 'danger';
  return 'normal';
}

/** One D100 against the lottery table. Result is final — no re-rolls, ever. */
export function rollSpiritRoot(state: GameState): CreationOutcome {
  const err = guard(state, 2);
  if (err) return { ok: false, error: err };
  const draft = state.creationDraft;
  if (!draft || !draft.attributes) return { ok: false, error: '先定命格。' };
  if (draft.spiritRoot) return { ok: false, error: '灵根已定，天不改命。' };

  let s = state;
  const main = roll(s, 'D100', '灵根抽取');
  s = main.state;

  const root = resolveSpiritRoot(main.value, (options) => {
    const sub = roll(s, 'D100', '灵根属性');
    s = sub.state;
    return (sub.value - 1) % options;
  });

  const next: GameState = {
    ...s,
    creationStep: 3,
    creationDraft: { ...draft, spiritRoot: root },
  };
  const elementText = root.elements.join('');
  return {
    ok: true,
    state: withLogs(next, [
      {
        text: `测灵盘微光流转，天数落于${main.value}。汝之灵根——${root.grade}（${elementText}）。${SPIRIT_ROOT_FLAVOR[root.grade]}`,
        tone: toneForRoot(root),
      },
    ]),
  };
}

// ===== step 4: 暗掷 (sealed hidden roll → 机缘) =====

/**
 * One sealed D100 sets 机缘 (1–10) and finalizes the Character.
 * The audit trail records that the roll happened; the mapped value is never
 * displayed anywhere — the narrative line is fixed and digit-free.
 */
export function rollHiddenFate(state: GameState): CreationOutcome {
  const err = guard(state, 3);
  if (err) return { ok: false, error: err };
  const draft = state.creationDraft;
  if (!draft || !draft.originId || !draft.attributes || !draft.spiritRoot) {
    return { ok: false, error: '前序未竟。' };
  }

  const hidden = roll(state, 'D100', '暗掷·天命');
  const jiYuan = mapHiddenRollToJiYuan(hidden.value);
  const attributes = { ...draft.attributes, jiYuan };

  const origin = ORIGINS.find((o) => o.id === draft.originId);
  if (!origin) return { ok: false, error: `无此出身：${draft.originId}` };

  const inventory: ItemStack[] = [];
  for (const itemId of origin.startItems) {
    const stack = inventory.find((st) => st.itemId === itemId);
    if (stack) stack.count += 1;
    else inventory.push({ itemId, count: 1 });
  }

  const realm = initialRealmState();
  const maxHp = maxHpFor(attributes, realm);
  const character: Character = {
    name: draft.name,
    gender: draft.gender,
    originId: origin.id,
    attributes,
    spiritRoot: draft.spiritRoot,
    realm,
    age: START_AGE,
    lifespan: lifespanFor('mortal'),
    hp: maxHp,
    maxHp,
    injuries: [],
    techniqueId: origin.id === 'clan' ? CLAN_START_TECHNIQUE_ID : null,
    combatArts: [],
    spiritStones: origin.startSpiritStones,
    inventory,
    equipped: {},
    sectId: null,
    flags: { ...(origin.startFlags ?? {}) },
  };

  const next: GameState = {
    ...hidden.state,
    creationStep: 4,
    phase: 'playing',
    creationDraft: null,
    character,
  };
  return {
    ok: true,
    state: withLogs(next, [
      { text: '天道已掷，命数已定。' },
      { text: '尘缘既了，仙途自此始。', tone: 'jade' },
    ]),
  };
}
