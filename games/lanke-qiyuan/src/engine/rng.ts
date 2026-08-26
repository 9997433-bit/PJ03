/**
 * rng.ts — 骰子权柄 (dice authority)
 *
 * Adapted from the root simulator's engine: a seeded, serializable,
 * deterministic mulberry32 PRNG that is the single source of ALL randomness
 * in the game.
 *
 * Two API levels:
 *
 * 1. Pure string-state primitives (`GameState.rngState` is 8-char hex):
 *    `initRngState`, `nextFloat`, `rollDie`, `rollD100/D20/D6` — take a state
 *    string, return the value plus the advanced state, mutate nothing.
 *
 * 2. The audited gateway over GameState: `roll(state, die, reason)` advances
 *    the PRNG and appends a numbered DiceRoll to `state.rolls`. Reasons
 *    carrying 暗掷 are sealed automatically — the audit proves the roll
 *    happened without ever revealing its value.
 *
 * Determinism contract: same seed + same command sequence ⇒ identical life.
 * This is the ONLY file allowed to touch Math.random, and only inside
 * `generateSeed()` — entropy for the seed itself, never for an outcome.
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

function encodeState(state: number): string {
  return (state >>> 0).toString(16).padStart(8, '0');
}

function decodeState(hex: string): number {
  if (!/^[0-9a-f]{1,8}$/i.test(hex)) {
    throw new Error(`rng: corrupt state "${hex}"`);
  }
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) throw new Error(`rng: corrupt state "${hex}"`);
  return n >>> 0;
}

/** Create the initial serialized PRNG state from a seed string. */
export function initRngState(seed: string): string {
  return encodeState(xmur3(seed));
}

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

export function rollD100(rngState: string): { value: number; state: string } {
  return rollDie(rngState, 'D100');
}

export function rollD20(rngState: string): { value: number; state: string } {
  return rollDie(rngState, 'D20');
}

export function rollD6(rngState: string): { value: number; state: string } {
  return rollDie(rngState, 'D6');
}

// ============================================================================
// The audited gateway
// ============================================================================

/** Rolls whose reason carries this marker are sealed automatically. */
export const SEALED_REASON_MARKER = '暗掷';

function appendRoll(
  state: GameState,
  die: Die,
  value: number,
  reason: string,
  seedState: string,
  sealed: boolean,
): DiceRoll {
  const id = state.nextRollId;
  state.nextRollId = id + 1;
  state.rollSeq = id;
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
  state.stats.totalRolls += 1;
  return record;
}

/**
 * The single entry point for game randomness. Advances the PRNG and appends
 * the roll — with reason and pre-roll PRNG snapshot — to the audit trail on
 * the (already-cloned, turn-local) state.
 */
export function roll(state: GameState, die: Die, reason: string, sealed?: boolean): number {
  const seedState = state.rngState;
  const { value, state: nextState } = rollDie(seedState, die);
  state.rngState = nextState;
  appendRoll(state, die, value, reason, seedState, sealed ?? reason.includes(SEALED_REASON_MARKER));
  return value;
}

/** Audited integer in [min, max] inclusive. */
export function rollRange(
  state: GameState,
  min: number,
  max: number,
  reason: string,
): number {
  if (max < min) [min, max] = [max, min];
  const seedState = state.rngState;
  const { value: u, state: nextState } = nextFloat(seedState);
  const value = min + Math.floor(u * (max - min + 1));
  state.rngState = nextState;
  appendRoll(state, 'D100', value, `${reason}〔${min}–${max}〕`, seedState, false);
  return value;
}

/** Audited uniform pick from a non-empty list. */
export function rollPick<T>(state: GameState, options: readonly T[], reason: string): T {
  if (options.length === 0) throw new Error('rollPick: empty options');
  const at = rollRange(state, 0, options.length - 1, reason);
  return options[at] as T;
}

/**
 * Audited weighted pick. Weights must be positive; the chosen entry is
 * recorded in the trail so the draw can be replayed.
 */
export function rollWeighted<T>(
  state: GameState,
  entries: readonly { item: T; weight: number }[],
  reason: string,
): T {
  const usable = entries.filter((e) => e.weight > 0);
  if (usable.length === 0) throw new Error('rollWeighted: no positive weights');
  const total = usable.reduce((sum, e) => sum + e.weight, 0);
  // Resolution of 1/10000 is far finer than any weight the data uses.
  const ticket = rollRange(state, 1, 10000, reason) / 10000;
  let acc = 0;
  for (const entry of usable) {
    acc += entry.weight / total;
    if (ticket <= acc) return entry.item;
  }
  return (usable[usable.length - 1] as { item: T }).item;
}

// ============================================================================
// Seed generation
// ============================================================================

/** Fresh seed for a new life — the one sanctioned use of ambient entropy. */
export function generateSeed(): string {
  const g = globalThis as {
    crypto?: { getRandomValues?: (buf: Uint32Array) => Uint32Array };
  };
  if (g.crypto?.getRandomValues) {
    const buf = g.crypto.getRandomValues(new Uint32Array(3));
    return `棋-${Date.now().toString(36)}-${Array.from(buf, (n) => n.toString(36)).join('')}`;
  }
  // sanctioned: seed entropy only (rng.ts is exempt from the Math.random ban)
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 6);
  return `棋-${Date.now().toString(36)}-${a}${b}`;
}
