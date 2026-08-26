/**
 * attributes.ts — the 心性 allocation rules and the derived stats.
 *
 * The budget is deliberately tight: four visible attributes, each 4–10, and
 * exactly 28 points between them. Origin modifiers land on top and may push
 * a value past 10 — the cap is on what you *choose*, not on what you *are*.
 */

import type { Attributes, Character, OriginDef, VisibleAttribute } from './types';
import { VISIBLE_ATTRIBUTES } from './types';
import { getRealm } from '@/data/realms';

export const ATTR_TOTAL = 28;
export const ATTR_MIN = 4;
export const ATTR_MAX = 10;

export type AllocationInput = Record<VisibleAttribute, number>;

export function defaultAllocation(): AllocationInput {
  return { xinJing: 7, wuXing: 7, caiXue: 7, qiYun: 7 };
}

/** Returns an error string, or null when the allocation is lawful. */
export function validateAllocation(alloc: AllocationInput): string | null {
  let total = 0;
  for (const key of VISIBLE_ATTRIBUTES) {
    const v = alloc[key];
    if (!Number.isInteger(v)) return `${key} 须为整数。`;
    if (v < ATTR_MIN || v > ATTR_MAX) return `每项须在 ${ATTR_MIN}–${ATTR_MAX} 之间。`;
    total += v;
  }
  if (total !== ATTR_TOTAL) return `四项之和须恰为 ${ATTR_TOTAL},今为 ${total}。`;
  return null;
}

/** Applies origin modifiers; results are floored at 1 and capped at 20. */
export function buildAttributes(
  alloc: AllocationInput,
  mods: Partial<Record<VisibleAttribute, number>>,
): Record<VisibleAttribute, number> {
  const out = {} as Record<VisibleAttribute, number>;
  for (const key of VISIBLE_ATTRIBUTES) {
    out[key] = Math.max(1, Math.min(20, alloc[key] + (mods[key] ?? 0)));
  }
  return out;
}

/**
 * The hidden 缘法, derived from a sealed D100. Weighted toward the middle so
 * that a very high or very low affinity genuinely is rare.
 */
export function mapHiddenRollToYuanFa(d100: number): number {
  if (d100 <= 3) return 1;
  if (d100 <= 10) return 2;
  if (d100 <= 22) return 3;
  if (d100 <= 40) return 4;
  if (d100 <= 60) return 5;
  if (d100 <= 78) return 6;
  if (d100 <= 90) return 7;
  if (d100 <= 96) return 8;
  if (d100 <= 99) return 9;
  return 10;
}

/** 心神上限 — realm floor plus the steadiness of the mind. */
export function deriveMaxSpirit(realmId: Character['realm']['realm'], attrs: Attributes): number {
  return getRealm(realmId).spiritBase + attrs.xinJing * 4 + Math.floor(attrs.wuXing * 1.5);
}

/**
 * The flat bonus a check of `attr` receives. 才学 gets the 笔生 perk here
 * because that perk reads as "you are simply better at this", not as a
 * situational modifier.
 */
export function checkBonus(c: Character, attr: keyof Attributes, origin?: OriginDef): number {
  let bonus = c.attributes[attr];
  if (origin?.perk === 'brushBorn' && attr === 'caiXue') bonus += 2;
  // A cluttered mind fumbles: every 25 points of 心尘 costs one point.
  bonus -= Math.floor(c.dust / 25);
  return bonus;
}
