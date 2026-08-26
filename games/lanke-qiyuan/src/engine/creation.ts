/**
 * creation.ts — 立命 (the four-step character creation state machine).
 *
 * The gate is in the engine, not in the wizard: every step checks
 * `state.creationStep` and refuses out-of-order calls. A UI bug therefore
 * cannot produce an unlawful character, and a half-finished creation survives
 * a page refresh because the draft lives in the saved state.
 *
 * Step 3 spends two dice: a public D100 for 棋缘 (落子无悔) and a sealed D100
 * for the hidden 缘法. The sealed value never leaves the engine.
 */

import { getOrigin } from '@/data/origins';
import { qiYuanRowFor } from '@/data/qiyuan';
import { getRealm } from '@/data/realms';
import { initialSpirits } from '@/data/spirits';
import { STARTING_PLACE } from '@/data/places';
import { getItem } from '@/data/items';
import { getManual } from '@/data/manuals';
import { GENESIS_HASH } from './audit';
import { initRngState, roll, rollPick } from './rng';
import { note, say } from './prose';
import {
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL,
  buildAttributes,
  defaultAllocation,
  deriveMaxSpirit,
  mapHiddenRollToYuanFa,
  validateAllocation,
  type AllocationInput,
} from './attributes';
import type {
  Affinity,
  Character,
  ChessAffinity,
  CreationDraft,
  GameState,
  ItemStack,
  LifeStats,
} from './types';
import { ALL_AFFINITIES, START_AGE, SAVE_VERSION } from './types';

export { ATTR_MAX, ATTR_MIN, ATTR_TOTAL, defaultAllocation, validateAllocation };
export type { AllocationInput };

export const NAME_MAX = 12;

export interface CreationResult {
  ok: boolean;
  message: string;
}

const OK = (message: string): CreationResult => ({ ok: true, message });
const NO = (message: string): CreationResult => ({ ok: false, message });

function emptyStats(): LifeStats {
  return {
    totalRolls: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    gamesWatched: 0,
    placesSeen: 1,
    spiritsBefriended: 0,
    manualsLearned: 0,
    breakthroughsFailed: 0,
    coinEarned: 0,
    peakRealmLabel: '凡尘·初境',
    peakChessDao: 0,
  };
}

export function emptyDraft(): CreationDraft {
  return { name: '', courtesy: '', originId: null, attributes: null, chessAffinity: null };
}

/** A brand-new life, parked at creation step 0. */
export function newGame(seed: string): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: initRngState(seed),
    phase: 'creation',
    creationStep: 0,
    creationDraft: emptyDraft(),
    turn: 0,
    placeId: STARTING_PLACE,
    character: null,
    spirits: initialSpirits(),
    match: null,
    pendingEvent: null,
    narrativeLog: [],
    rolls: [],
    auditHash: GENESIS_HASH,
    nextRollId: 1,
    nextLogId: 1,
    rollSeq: 0,
    seenEvents: [],
    stats: emptyStats(),
    ending: null,
  };
  say(
    state,
    '天地为枰,生人为子。汝这一子,尚未落下。',
    'jade',
  );
  say(state, '先报个名号罢。', 'muted');
  return state;
}

// ============================================================================
// Step 0 — 名号
// ============================================================================

export function setName(state: GameState, name: string, courtesy: string): CreationResult {
  if (state.phase !== 'creation') return NO('命格已定,不容重立。');
  if (state.creationStep !== 0) return NO('名号已定,不可回头。');
  const n = name.trim();
  const c = courtesy.trim();
  if (n.length === 0) return NO('无名者不可入局。');
  if (n.length > NAME_MAX) return NO(`名号至多 ${NAME_MAX} 字。`);
  if (c.length > NAME_MAX) return NO(`道号至多 ${NAME_MAX} 字。`);

  const draft = state.creationDraft ?? emptyDraft();
  draft.name = n;
  draft.courtesy = c.length > 0 ? c : '无名';
  state.creationDraft = draft;
  state.creationStep = 1;
  say(state, `「${n}」。记下了。`, 'jade');
  if (c.length > 0) note(state, `道号:${c}。山精鬼怪只认这个。`);
  return OK(`名号已立:${n}`);
}

// ============================================================================
// Step 1 — 出身
// ============================================================================

export function setOrigin(state: GameState, originId: string): CreationResult {
  if (state.phase !== 'creation') return NO('命格已定,不容重立。');
  if (state.creationStep < 1) return NO('尚未立名,何谈来处。');
  if (state.creationStep !== 1) return NO('来处已定,不可更改。');
  const origin = getOrigin(originId);
  if (!origin) return NO(`无此出身:${originId}`);

  const draft = state.creationDraft ?? emptyDraft();
  draft.originId = originId;
  state.creationDraft = draft;
  state.creationStep = 2;
  say(state, origin.flavor, 'bamboo');
  note(state, `〔${origin.perkName}〕${origin.perkDesc}`);
  return OK(`出身已定:${origin.name}`);
}

// ============================================================================
// Step 2 — 心性分配
// ============================================================================

export function setAttributes(state: GameState, alloc: AllocationInput): CreationResult {
  if (state.phase !== 'creation') return NO('命格已定,不容重立。');
  if (state.creationStep < 2) return NO('先定来处,再分心性。');
  if (state.creationStep !== 2) return NO('心性已分,不可再拨。');
  const err = validateAllocation(alloc);
  if (err) return NO(err);

  const draft = state.creationDraft ?? emptyDraft();
  draft.attributes = { ...alloc };
  state.creationDraft = draft;
  state.creationStep = 3;
  say(state, '心性既分,便是汝看世界的那副眼。', 'jade');
  note(state, '尚余一事:棋缘。此掷落子无悔。');
  return OK('心性已分。');
}

// ============================================================================
// Step 3 — 棋缘抽取 (public D100) + 缘法暗掷 (sealed D100)
// ============================================================================

/**
 * Draws the affinities for a grade. Each draw is an audited roll, so the pull
 * replays byte-for-byte from the seed.
 */
function drawAffinities(state: GameState, count: number): Affinity[] {
  const pool: Affinity[] = [...ALL_AFFINITIES];
  const out: Affinity[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const picked = rollPick(state, pool, `棋缘·灵机第${i + 1}`);
    out.push(picked);
    pool.splice(pool.indexOf(picked), 1);
  }
  return out;
}

export interface DrawResult extends CreationResult {
  affinity?: ChessAffinity;
}

export function drawChessAffinity(state: GameState): DrawResult {
  if (state.phase !== 'creation') return NO('命格已定,不容重掷。');
  if (state.creationStep < 3) return NO('心性未分,棋缘不显。');
  if (state.creationStep !== 3) return NO('棋缘已定。落子无悔。');

  const d100 = roll(state, 'D100', '棋缘抽取');
  const row = qiYuanRowFor(d100);
  const affinity: ChessAffinity = {
    grade: row.grade,
    affinities: drawAffinities(state, row.affinityCount),
    speedMultiplier: row.speedMultiplier,
    boardBonus: row.boardBonus,
    rollValue: d100,
  };

  const draft = state.creationDraft ?? emptyDraft();
  draft.chessAffinity = affinity;
  state.creationDraft = draft;

  say(state, row.blurb, 'moon');
  note(state, `棋缘:${row.grade}〔${affinity.affinities.join('·')}〕`);

  const finished = finalize(state);
  return { ok: finished.ok, message: finished.message, affinity };
}

// ============================================================================
// Finalize
// ============================================================================

function startingInventory(ids: readonly string[]): ItemStack[] {
  const out: ItemStack[] = [];
  for (const id of ids) {
    if (!getItem(id)) continue;
    const found = out.find((s) => s.itemId === id);
    if (found) found.count += 1;
    else out.push({ itemId: id, count: 1 });
  }
  return out;
}

/** Turns a complete draft into a live character and opens the first season. */
function finalize(state: GameState): CreationResult {
  const draft = state.creationDraft;
  if (!draft) return NO('无稿可成。');
  if (draft.name.length === 0) return NO('名号未立。');
  if (!draft.originId) return NO('来处未定。');
  if (!draft.attributes) return NO('心性未分。');
  if (!draft.chessAffinity) return NO('棋缘未抽。');
  const origin = getOrigin(draft.originId);
  if (!origin) return NO('来处不明。');

  // The one sealed roll of the whole creation: 缘法 never surfaces in any UI.
  const hidden = roll(state, 'D100', '缘法·暗掷');
  const yuanFa = mapHiddenRollToYuanFa(hidden);

  const visible = buildAttributes(draft.attributes, origin.attributeMods);
  const attributes = { ...visible, yuanFa };
  const realmDef = getRealm('chen');

  const manuals = origin.startManualId && getManual(origin.startManualId)
    ? [origin.startManualId]
    : [];

  const character: Character = {
    name: draft.name,
    courtesy: draft.courtesy || '无名',
    originId: origin.id,
    attributes,
    chessAffinity: draft.chessAffinity,
    realm: { realm: 'chen', stage: '初境', exp: 0, expNeeded: realmDef.expPerStage[0] },
    age: START_AGE,
    lifespan: realmDef.lifespan,
    spirit: 0,
    maxSpirit: 1,
    dust: 0,
    chessDao: origin.startChessDao,
    insight: 0,
    coin: origin.startCoin,
    moods: [],
    inventory: startingInventory(origin.startItems),
    manuals,
    studyingId: manuals[0] ?? null,
    visited: [STARTING_PLACE],
    flags: { ...(origin.startFlags ?? {}) },
  };
  character.maxSpirit = deriveMaxSpirit('chen', attributes);
  character.spirit = character.maxSpirit;

  state.character = character;
  state.creationStep = 4;
  state.creationDraft = null;
  state.phase = 'playing';
  state.turn = 1;
  state.stats.peakChessDao = character.chessDao;

  say(state, '——命格既定。', 'jade');
  say(
    state,
    '汝背起行囊,走出宁安县的城门。身后是一条自己走过的路,身前是一条谁也没走过的。',
    'bamboo',
  );
  note(state, '〔修炼〕〔观棋〕〔游历〕〔弈道〕皆可。不知从何起,便先「观棋」。');
  return OK('命格已定。');
}

/** True when every draft field is filled — the wizard's "next" gate. */
export function draftComplete(draft: CreationDraft | null): boolean {
  return (
    draft !== null &&
    draft.name.length > 0 &&
    draft.originId !== null &&
    draft.attributes !== null &&
    draft.chessAffinity !== null
  );
}
