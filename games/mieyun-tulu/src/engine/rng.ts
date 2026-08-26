/**
 * rng.ts — 星轨 (the dice authority)
 *
 * A seeded, serializable mulberry32 PRNG: the single source of every random
 * outcome in the game. `GameState.rngState` is an 8-char hex string, so a save
 * carries the exact position of the wheel and a run can be replayed roll by
 * roll from its seed.
 *
 * The pure primitives (`nextFloat`, `rollDie`, `peekDice`) never touch the
 * audit trail; the audited gateway (`roll`, `rollRange`, `weightedPick`)
 * advances the PRNG on a turn-local state clone and appends a numbered
 * `DiceRoll`.
 *
 * `peekDice` is what makes 命运推演 honest: divination looks ahead at the
 * values the wheel is *about* to produce without turning it, so a forecast and
 * the future it describes cannot disagree.
 *
 * This is the only module permitted to call `Math.random`, and only inside
 * `generateSeed()` — entropy for the seed itself, never for an outcome.
 */

import type { Die, DiceRoll, GameState } from './types';
import { ROLL_CAP } from './types';

export const DIE_SIDES: Record<Die, number> = { D100: 100, D20: 20, D6: 6 };

// ============================================================================
// Pure primitives
// ============================================================================

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

function step(state: number): { value: number; nextState: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, nextState };
}

function encode(state: number): string {
  return (state >>> 0).toString(16).padStart(8, '0');
}

function decode(hex: string): number {
  if (!/^[0-9a-f]{1,8}$/i.test(hex)) throw new Error(`rng: 星轨错乱 "${hex}"`);
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) throw new Error(`rng: 星轨错乱 "${hex}"`);
  return n >>> 0;
}

/** Fold a seed string into the initial serialized PRNG state. */
export function initRngState(seed: string): string {
  return encode(xmur3(seed));
}

/** One PRNG step: a float in [0,1) plus the advanced state. */
export function nextFloat(rngState: string): { value: number; state: string } {
  const { value, nextState } = step(decode(rngState));
  return { value, state: encode(nextState) };
}

/** Roll a die: an integer in [1, sides] plus the advanced state. Pure. */
export function rollDie(rngState: string, die: Die): { value: number; state: string } {
  const { value, state } = nextFloat(rngState);
  return { value: Math.floor(value * DIE_SIDES[die]) + 1, state };
}

/** Integer in [min, max] inclusive plus the advanced state. Pure. */
export function rangeFrom(
  rngState: string,
  min: number,
  max: number,
): { value: number; state: string } {
  const { value, state } = nextFloat(rngState);
  return { value: min + Math.floor(value * (max - min + 1)), state };
}

/**
 * Look ahead at the next `count` rolls of `die` *without* advancing anything.
 * The backbone of 命运推演: the engine can promise "下一掷为 37" and be right,
 * because the promise is read off the same wheel the future will turn.
 */
export function peekDice(rngState: string, die: Die, count: number): number[] {
  const out: number[] = [];
  let cursor = rngState;
  for (let i = 0; i < count; i++) {
    const r = rollDie(cursor, die);
    out.push(r.value);
    cursor = r.state;
  }
  return out;
}

// ============================================================================
// Audited gateway
// ============================================================================

function appendRoll(
  state: GameState,
  die: Die,
  value: number,
  reason: string,
  seedState: string,
): DiceRoll {
  const id = state.rollSeq + 1;
  state.rollSeq = id;
  const record: DiceRoll = { id, turn: state.turn, die, value, reason, seedState };
  state.rolls.push(record);
  if (state.rolls.length > ROLL_CAP) {
    state.rolls.splice(0, state.rolls.length - ROLL_CAP);
  }
  state.stats.totalRolls += 1;
  return record;
}

/**
 * The single entry point for game randomness. Advances the PRNG on the
 * (already cloned, turn-local) state and files the roll with its reason and
 * pre-roll snapshot.
 */
export function roll(state: GameState, die: Die, reason: string): number {
  const seedState = state.rngState;
  const { value, state: next } = rollDie(seedState, die);
  state.rngState = next;
  appendRoll(state, die, value, reason, seedState);
  return value;
}

/** Audited integer in [min, max] — loot counts, damage spreads, stone drops. */
export function rollRange(
  state: GameState,
  min: number,
  max: number,
  reason: string,
): number {
  const seedState = state.rngState;
  const { value, state: next } = rangeFrom(seedState, min, max);
  state.rngState = next;
  appendRoll(state, 'D100', value, `${reason}〔${min}–${max}〕`, seedState);
  return value;
}

/**
 * Audited weighted pick. Returns `null` for an empty pool (callers treat that
 * as "nothing happens" rather than throwing mid-turn).
 */
export function weightedPick<T>(
  state: GameState,
  pool: readonly T[],
  weightOf: (item: T) => number,
  reason: string,
): T | null {
  const weights = pool.map((item) => Math.max(0, weightOf(item)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (pool.length === 0 || total <= 0) return null;
  const pick = rollRange(state, 1, Math.round(total * 100), reason) / 100;
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += weights[i]!;
    if (pick <= acc) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

// ============================================================================
// Seeds
// ============================================================================

/** Fresh seed for a new life — the one sanctioned use of ambient entropy. */
export function generateSeed(): string {
  const g = globalThis as {
    crypto?: { getRandomValues?: (buf: Uint32Array) => Uint32Array };
  };
  if (g.crypto?.getRandomValues) {
    const buf = g.crypto.getRandomValues(new Uint32Array(3));
    return `图-${Date.now().toString(36)}-${Array.from(buf, (n) => n.toString(36)).join('')}`;
  }
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 6);
  return `图-${Date.now().toString(36)}-${a}${b}`;
}
