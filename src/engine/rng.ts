// ============================================================================
// rng.ts — 骰子权柄 (Dice Authority)
// Single seeded PRNG. Every point of randomness in the game flows through
// `roll()`, which appends an audited DiceRoll to the state. No other module
// may call Math.random().
// ============================================================================

import type { Die, DiceRoll, GameState } from './types';
import { ROLL_LOG_CAP } from './types';

/** xmur3 string hash — turns an arbitrary seed string into a uint32. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** One mulberry32 step: state uint32 → { random float [0,1), next state }. */
export function mulberry32Step(s: number): { value: number; next: number } {
  const next = (s + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, next };
}

/** Serialize a PRNG state (uint32) as a string for storage/audit. */
export function encodeRngState(s: number): string {
  return s.toString(36);
}

export function decodeRngState(str: string): number {
  const n = parseInt(str, 36);
  if (!Number.isFinite(n)) throw new Error(`非法乱数状态: ${str}`);
  return n >>> 0;
}

/** Initial PRNG state derived from a seed string. */
export function initRngState(seed: string): string {
  return encodeRngState(hashSeed(seed));
}

export function dieSides(die: Die): number {
  switch (die) {
    case 'D100':
      return 100;
    case 'D20':
      return 20;
    case 'D6':
      return 6;
  }
}

/** Low-level: roll a die against a serialized state, no audit. */
export function rawRoll(rngState: string, die: Die): { value: number; nextRngState: string } {
  const { value, next } = mulberry32Step(decodeRngState(rngState));
  return {
    value: Math.floor(value * dieSides(die)) + 1,
    nextRngState: encodeRngState(next),
  };
}

/**
 * The single audited entry point for randomness.
 * Rolls a die, appends a DiceRoll (with reason + post-roll PRNG snapshot)
 * to the state's audit trail and returns the new state.
 */
export function roll(
  state: GameState,
  die: Die,
  reason: string
): { value: number; roll: DiceRoll; state: GameState } {
  const { value, nextRngState } = rawRoll(state.rngState, die);
  const record: DiceRoll = {
    id: state.rollSeq + 1,
    turn: state.turn,
    die,
    value,
    reason,
    seedState: nextRngState,
  };
  const rolls = [...state.rolls, record];
  const trimmed = rolls.length > ROLL_LOG_CAP ? rolls.slice(rolls.length - ROLL_LOG_CAP) : rolls;
  return {
    value,
    roll: record,
    state: {
      ...state,
      rngState: nextRngState,
      rollSeq: state.rollSeq + 1,
      rolls: trimmed,
    },
  };
}

/** Pick an index from a weight array using one audited D100 (+ modulo spread). */
export function weightedPick(
  state: GameState,
  weights: number[],
  reason: string
): { index: number; state: GameState } {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || weights.length === 0) return { index: 0, state };
  const r = roll(state, 'D100', reason);
  // Map the D100 uniformly onto the cumulative weight space.
  const point = ((r.value - 1) / 100) * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (point < acc) return { index: i, state: r.state };
  }
  return { index: weights.length - 1, state: r.state };
}

/** Generate a fresh seed string (allowed to use entropy — game start only). */
export function generateSeed(entropy?: string): string {
  const t = Date.now().toString(36);
  const e = entropy ?? Math.random().toString(36).slice(2, 10);
  return `${t}-${e}`;
}
