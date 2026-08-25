/**
 * audit.ts — 天道审计 (roll log, hash chain, anti-cheat)
 *
 * Anti-cheat layers implemented here:
 *   1. Dice authority — recordRoll is the only way game logic obtains a roll;
 *      every roll is appended to state.rolls with a reason + PRNG snapshot.
 *   3. Hidden attribute seal — sealed rolls are logged as having happened,
 *      but their values must never be rendered (DiceRoll.sealed).
 *   5. Hash chain — auditHash = fnv1a64(prevHash | turn | command | rolls).
 *   7. State invariants — checkInvariants() runs after every turn; a
 *      violation rolls the whole turn back (enforced in turn.ts).
 */

import type { Die, DiceRoll, GameState } from './types';
import { ROLL_CAP } from './types';
import { rollDie } from './rng';

// ============================================================================
// Audited rolls
// ============================================================================

/**
 * The single gateway for game randomness. Mutates the (already-cloned,
 * turn-local) state: advances the PRNG, appends the roll to the audit trail.
 */
export function recordRoll(
  state: GameState,
  die: Die,
  reason: string,
  sealed = false,
): number {
  const seedState = state.rngState;
  const { value, state: nextState } = rollDie(state.rngState, die);
  state.rngState = nextState;

  const roll: DiceRoll = {
    id: state.nextRollId++,
    turn: state.turn,
    die,
    value,
    reason,
    seedState,
    ...(sealed ? { sealed: true } : {}),
  };
  state.rolls.push(roll);
  if (state.rolls.length > ROLL_CAP) {
    state.rolls.splice(0, state.rolls.length - ROLL_CAP);
  }
  state.stats.totalRolls++;
  return value;
}

// ============================================================================
// Hash chain (FNV-1a 64-bit, hex) — deterministic, synchronous, pure TS
// ============================================================================

const FNV_PRIME = 0x100000001b3n;
const FNV_OFFSET = 0xcbf29ce484222325n;
const MASK64 = 0xffffffffffffffffn;

export function fnv1a64(input: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
}

export const GENESIS_HASH = fnv1a64('太初有道');

/**
 * Advance the audit chain for one resolved command.
 * `rollValues` are the values rolled during this command (in order).
 */
export function chainAuditHash(
  prevHash: string,
  turn: number,
  command: string,
  rollValues: number[],
): string {
  return fnv1a64(`${prevHash}|${turn}|${command}|${rollValues.join(',')}`);
}

// ============================================================================
// State invariants (layer 7)
// ============================================================================

const REALM_ORDER: Record<string, number> = {
  mortal: 0,
  qi: 1,
  foundation: 2,
  core: 3,
  nascent: 4,
  deity: 5,
};

/** returns a list of violations; empty = state is lawful (合乎天道) */
export function checkInvariants(state: GameState): string[] {
  const v: string[] = [];
  const c = state.character;
  if (c) {
    if (c.spiritStones < 0) v.push(`灵石为负: ${c.spiritStones}`);
    if (c.hp > c.maxHp) v.push(`气血逾上限: ${c.hp}/${c.maxHp}`);
    if (c.realm.exp < 0) v.push(`修为为负: ${c.realm.exp}`);
    if (c.realm.exp > c.realm.expNeeded) v.push(`修为溢出: ${c.realm.exp}/${c.realm.expNeeded}`);
    if (!(c.realm.realm in REALM_ORDER)) v.push(`未知境界: ${c.realm.realm}`);
    if (c.realm.realm === 'qi' && (c.realm.qiLayer < 1 || c.realm.qiLayer > 13)) {
      v.push(`炼气层数异常: ${c.realm.qiLayer}`);
    }
    if (c.age < 0 || c.age > c.lifespan + 1) v.push(`年岁异常: ${c.age}/${c.lifespan}`);
    for (const s of c.inventory) {
      if (s.count <= 0) v.push(`物品堆叠异常: ${s.itemId}×${s.count}`);
    }
    const attrs = c.attributes;
    for (const [k, val] of Object.entries(attrs)) {
      if (val < 0 || val > 30) v.push(`属性越界: ${k}=${val}`);
    }
  }
  if (state.turn < 0) v.push(`回合为负: ${state.turn}`);
  return v;
}

/** compare realm order — returns true if `a` is at or beyond `b` */
export function realmAtLeast(a: string, b: string): boolean {
  return (REALM_ORDER[a] ?? -1) >= (REALM_ORDER[b] ?? 99);
}

export { REALM_ORDER };
