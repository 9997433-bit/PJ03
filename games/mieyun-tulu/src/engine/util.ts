/**
 * util.ts — small shared primitives
 *
 * `cloneState` is the reason turn resolution can promise atomicity: every
 * command works on a deep copy, and a failed invariant check simply throws the
 * copy away. `GameState` is plain JSON by construction (no Dates, Maps or
 * class instances), so a structural clone is both correct and cheap.
 */

import type { GameState, ItemStack, LogEntry, Speaker, Tone } from './types';
import { LOG_CAP } from './types';

export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function entry(turn: number, speaker: Speaker, text: string, tone: Tone = 'normal'): LogEntry {
  return { turn, speaker, text, tone };
}

export function pushLog(state: GameState, entries: readonly LogEntry[]): void {
  state.log.push(...entries);
  if (state.log.length > LOG_CAP) {
    state.log.splice(0, state.log.length - LOG_CAP);
  }
}

export function addItem(inventory: ItemStack[], itemId: string, count: number): void {
  if (count <= 0) return;
  const found = inventory.find((s) => s.itemId === itemId);
  if (found) found.count += count;
  else inventory.push({ itemId, count });
}

/** Returns false (and changes nothing) when the pack does not hold enough. */
export function removeItem(inventory: ItemStack[], itemId: string, count: number): boolean {
  const idx = inventory.findIndex((s) => s.itemId === itemId);
  if (idx < 0) return false;
  const stack = inventory[idx]!;
  if (stack.count < count) return false;
  stack.count -= count;
  if (stack.count === 0) inventory.splice(idx, 1);
  return true;
}

export function countItem(inventory: readonly ItemStack[], itemId: string): number {
  return inventory.find((s) => s.itemId === itemId)?.count ?? 0;
}
