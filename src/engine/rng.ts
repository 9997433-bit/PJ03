/**
 * rng.ts — 骰子权柄 (Dice Authority)
 *
 * Seeded, serializable, deterministic PRNG (mulberry32) — the single source
 * of ALL randomness in the game (PLAN §3.1, anti-cheat layers 1 & 4).
 *
 * Pure functions over a serialized hex state string (`GameState.rngState`):
 * every roll takes a state and returns `{ value, state }` — nothing here
 * mutates anything. The audited gateway that appends to the roll log lives
 * in audit.ts (`recordRoll`).
 *
 * Determinism contract: same seed + same command sequence ⇒ identical
 * playthrough. Any DiceRoll can be replayed from its `seedState` snapshot.
 *
 * THIS IS THE ONLY FILE in the codebase allowed to touch Math.random
 * (enforced by ESLint), and only inside `generateSeed()` at 开始游戏 —
 * entropy for the seed itself, never for game outcomes.
 */

import type { Die } from './types';

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
export function createRngState(seed: string): string {
  return encodeState(xmur3(seed));
}

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

/** Integer in [min, max] inclusive (loot amounts, stone drops …). Pure. */
export function rollRange(
  rngState: string,
  min: number,
  max: number,
): { value: number; state: string } {
  const { value, state } = nextFloat(rngState);
  return { value: min + Math.floor(value * (max - min + 1)), state };
}

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
