/**
 * rng.ts — 骰子权柄 (Dice Authority)
 *
 * Seeded, serializable, deterministic PRNG (mulberry32) — the single source
 * of ALL randomness in the game (PLAN §3.1, anti-cheat layers 1 & 4).
 *
 * Two API levels:
 *
 * 1. Pure string-state primitives (`GameState.rngState` is 8-char hex):
 *    `initRngState`, `nextFloat`, `rawRoll`, `rollDie`, `rollD100/D20/D6` —
 *    take a state string, return the value plus the advanced state, never
 *    mutate anything, never touch the audit trail.
 *
 * 2. The audited gateway over GameState:
 *    - `roll(state, die, reason)` — advances the PRNG and appends a numbered
 *      DiceRoll to `state.rolls` (turn-local, already-cloned state). The
 *      result is an `AuditedRoll`: it behaves as the rolled number in any
 *      arithmetic/comparison, and also carries `.value`, `.roll` and
 *      `.state` for callers written in a pure style.
 *    - `rollRange(state, min, max, reason)` — audited integer range.
 *    Rolls whose reason carries 暗掷 are auto-sealed (hidden 机缘, layer 3).
 *
 * Determinism contract: same seed + same command sequence ⇒ identical
 * playthrough. Any DiceRoll can be replayed from its `seedState` snapshot.
 *
 * THIS IS THE ONLY FILE in the codebase allowed to touch Math.random
 * (enforced by ESLint), and only inside `generateSeed()` at 开始游戏 —
 * entropy for the seed itself, never for game outcomes.
 */

import type { DiceRoll, Die, GameState } from './types';
import { ROLL_CAP } from './types';

// ============================================================================
// Pure string-state primitives
// ============================================================================

/** xmur3 string hash — folds an arbitrary seed string into a uint32. */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** One mulberry32 step: [0,1) float plus the advanced 32-bit state. */
function mulberry32Step(state: number): { value: number; nextState: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

/** Serialize a 32-bit state as 8-char hex (the `rngState` save format). */
function encodeState(state: number): string {
  return (state >>> 0).toString(16).padStart(8, '0');
}

function decodeState(hex: string): number {
  const n = parseInt(hex, 16);
  if (Number.isNaN(n) || !/^[0-9a-f]{1,8}$/i.test(hex)) {
    throw new Error(`rng: corrupt state "${hex}"`);
  }
  return n >>> 0;
}

/** Create the initial serialized PRNG state from a seed string. */
export function initRngState(seed: string): string {
  return encodeState(xmur3(seed));
}

/** Alias of `initRngState`. */
export const createRngState = initRngState;

/** Advance the PRNG once; returns a float in [0,1) and the next state. */
export function nextFloat(rngState: string): { value: number; state: string } {
  const { value, nextState } = mulberry32Step(decodeState(rngState));
  return { value, state: encodeState(nextState) };
}

export const DIE_SIDES: Record<Die, number> = {
  D100: 100,
  D20: 20,
  D6: 6,
};

/** Roll a die: integer in [1, sides] plus the advanced state. Pure. */
export function rollDie(rngState: string, die: Die): { value: number; state: string } {
  const { value, state } = nextFloat(rngState);
  return { value: Math.floor(value * DIE_SIDES[die]) + 1, state };
}

/**
 * Roll a die outside the audit trail — for callers that append their own
 * (e.g. sealed 暗掷) record. Pure.
 */
export function rawRoll(rngState: string, die: Die): { value: number; nextRngState: string } {
  const { value, state } = rollDie(rngState, die);
  return { value, nextRngState: state };
}

/** D100 — 灵根抽取, 突破, 事件掷 … */
export function rollD100(rngState: string): { value: number; state: string } {
  return rollDie(rngState, 'D100');
}

/** D20 — 属性检定 (D20 + attr vs DC), 战斗轮掷 … */
export function rollD20(rngState: string): { value: number; state: string } {
  return rollDie(rngState, 'D20');
}

/** D6 — 零散伤害/数量掷 */
export function rollD6(rngState: string): { value: number; state: string } {
  return rollDie(rngState, 'D6');
}

// ============================================================================
// The audited gateway (anti-cheat layer 1)
// ============================================================================

/**
 * Rolls whose reason carries this marker are sealed automatically:
 * the audit trail keeps the record, the value is never displayed (layer 3).
 */
export const SEALED_REASON_MARKER = '暗掷';

/**
 * An audited roll result: usable directly as the rolled number
 * (`raw + 2`, `d20 <= dc`, `${v}`), and also carrying the envelope
 * (`.value`, `.roll`, `.state`) for pure-style callers.
 */
export type AuditedRoll = number & {
  value: number;
  roll: DiceRoll;
  state: GameState;
};

/** Appends a numbered DiceRoll to the (turn-local) state. Internal. */
function appendRoll(
  state: GameState,
  die: Die,
  value: number,
  reason: string,
  seedState: string,
  sealed: boolean,
): DiceRoll {
  const id = (state.rollSeq ?? 0) + 1;
  state.rollSeq = id;
  if (state.nextRollId !== undefined) state.nextRollId = id + 1;
  const record: DiceRoll = {
    id,
    turn: state.turn,
    die,
    value,
    reason,
    seedState,
    ...(sealed ? { sealed: true } : {}),
  };
  state.rolls.push(record);
  if (state.rolls.length > ROLL_CAP) {
    state.rolls.splice(0, state.rolls.length - ROLL_CAP);
  }
  if (state.stats) state.stats.totalRolls++;
  return record;
}

function toAuditedRoll(value: number, record: DiceRoll, state: GameState): AuditedRoll {
  // Boxed number: arithmetic/comparison coerce via valueOf, envelope rides along.
  return Object.assign(Object(value) as object, {
    value,
    roll: record,
    state,
  }) as AuditedRoll;
}

/**
 * The single entry point for game randomness. Advances the PRNG and appends
 * the roll — with reason and pre-roll PRNG snapshot — to the audit trail on
 * the (already-cloned, turn-local) state.
 */
export function roll(state: GameState, die: Die, reason: string, sealed?: boolean): AuditedRoll {
  const seedState = state.rngState;
  const { value, state: nextState } = rollDie(seedState, die);
  state.rngState = nextState;
  const record = appendRoll(
    state,
    die,
    value,
    reason,
    seedState,
    sealed ?? reason.includes(SEALED_REASON_MARKER),
  );
  return toAuditedRoll(value, record, state);
}

/**
 * Audited integer in [min, max] inclusive (loot amounts, weighted picks …).
 * Recorded in the trail with the range annotated in the reason.
 */
export function rollRange(
  state: GameState,
  min: number,
  max: number,
  reason: string,
): AuditedRoll {
  const seedState = state.rngState;
  const { value: u, state: nextState } = nextFloat(seedState);
  const value = min + Math.floor(u * (max - min + 1));
  state.rngState = nextState;
  const record = appendRoll(state, 'D100', value, `${reason}〔${min}–${max}〕`, seedState, false);
  return toAuditedRoll(value, record, state);
}

// ============================================================================
// Seed generation
// ============================================================================

/**
 * Generate a fresh seed string for a new life. The one sanctioned use of
 * ambient entropy in the whole codebase.
 */
export function generateSeed(): string {
  const g = globalThis as {
    crypto?: { getRandomValues?: (buf: Uint32Array) => Uint32Array };
  };
  if (g.crypto?.getRandomValues) {
    const buf = g.crypto.getRandomValues(new Uint32Array(3));
    return `道-${Date.now().toString(36)}-${Array.from(buf, (n) => n.toString(36)).join('')}`;
  }
  // eslint-disable-next-line no-restricted-properties -- sanctioned: dice-authority seed entropy
  const r = Math.random().toString(36).slice(2, 10);
  // eslint-disable-next-line no-restricted-properties -- sanctioned: dice-authority seed entropy
  const r2 = Math.random().toString(36).slice(2, 6);
  return `道-${Date.now().toString(36)}-${r}${r2}`;
}

/** stubEngine compatibility aliases */
export const createSeed = generateSeed;
export const seedToState = initRngState;

export function makeAuditedRoll(
  rngState: string,
  die: Die,
  reason: string,
  id: number,
  turn: number,
): { value: number; nextState: string; roll: DiceRoll } {
  const { value, state } = rollDie(rngState, die);
  return {
    value,
    nextState: state,
    roll: { id, turn, die, value, reason, seedState: rngState },
  };
}
