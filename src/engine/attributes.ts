// ============================================================================
// attributes.ts — 五维 (Five Attributes) math & derived stats
// 根骨 genGu · 悟性 wuXing · 心性 xinXing · 机缘 jiYuan (hidden) · 气运 qiYun
//
// PURE TypeScript. No React, no browser APIs, no Math.random().
// ============================================================================

import type { Attributes, Injury, RealmState, VisibleAttribute } from './types';
import { powerOf } from './realms';

// ===== Creation constants =====
export const BASE_ATTRIBUTE = 5; // every visible attribute starts here
export const FREE_POINTS = 10; // allocatable at creation
export const CREATION_CAP = 10; // max (base + allocated) per attribute at creation
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 20; // lifetime cap (pills / events included)

export const VISIBLE_ATTRIBUTES: VisibleAttribute[] = ['genGu', 'wuXing', 'xinXing', 'qiYun'];

export const ATTRIBUTE_NAMES: Record<keyof Attributes, string> = {
  genGu: '根骨',
  wuXing: '悟性',
  xinXing: '心性',
  jiYuan: '机缘',
  qiYun: '气运',
};

/** Fresh attribute block: visible attributes at base, 机缘 unset (0) until the hidden roll. */
export function baseAttributes(): Attributes {
  return { genGu: BASE_ATTRIBUTE, wuXing: BASE_ATTRIBUTE, xinXing: BASE_ATTRIBUTE, jiYuan: 0, qiYun: BASE_ATTRIBUTE };
}

export function clampAttribute(v: number): number {
  return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.round(v)));
}

// ===== Point allocation (creation step 2) =====
export type Allocation = Partial<Record<VisibleAttribute, number>>;

export type AllocationCheck = { ok: true } | { ok: false; error: string };

/**
 * Creation allocation rules:
 *  - only the 4 visible attributes may receive points (机缘 is never allocatable)
 *  - non-negative integers, total exactly FREE_POINTS
 *  - base + allocated may not exceed CREATION_CAP on any single attribute
 */
export function validateAllocation(alloc: Allocation): AllocationCheck {
  let total = 0;
  for (const key of Object.keys(alloc) as VisibleAttribute[]) {
    if (!VISIBLE_ATTRIBUTES.includes(key)) {
      return { ok: false, error: `不可分配之属性：${String(key)}` };
    }
    const v = alloc[key] ?? 0;
    if (!Number.isInteger(v) || v < 0) {
      return { ok: false, error: '点数须为非负整数。' };
    }
    if (BASE_ATTRIBUTE + v > CREATION_CAP) {
      return { ok: false, error: `${ATTRIBUTE_NAMES[key]}超出上限（创角时至多${CREATION_CAP}）。` };
    }
    total += v;
  }
  if (total !== FREE_POINTS) {
    return { ok: false, error: `须恰好分配${FREE_POINTS}点（当前${total}点）。` };
  }
  return { ok: true };
}

/** Base 5 + allocation. Assumes the allocation already passed validateAllocation. */
export function applyAllocation(alloc: Allocation): Attributes {
  const a = baseAttributes();
  for (const key of VISIBLE_ATTRIBUTES) a[key] += alloc[key] ?? 0;
  return a;
}

/** Origin modifiers (or pill / event boosts) on top of an attribute block. */
export function applyAttributeMods(attrs: Attributes, mods: Partial<Attributes>): Attributes {
  const out = { ...attrs };
  for (const key of Object.keys(mods) as (keyof Attributes)[]) {
    out[key] = Math.min(ATTRIBUTE_MAX, out[key] + (mods[key] ?? 0));
  }
  return out;
}

/** Sealed hidden roll → 机缘 1–10. The mapping is never surfaced in any UI string. */
export function mapHiddenRollToJiYuan(d100: number): number {
  return Math.max(1, Math.min(10, Math.ceil(d100 / 10)));
}

// ===== Derived stats =====

/** 悟性 → cultivation speed factor (1 + 悟性 × 0.05). */
export function comprehensionSpeedFactor(wuXing: number): number {
  return 1 + wuXing * 0.05;
}

/** 根骨×2 + 心性×1 — flat bonus added to breakthrough chance. */
export function breakthroughAttributeBonus(attrs: Attributes): number {
  return attrs.genGu * 2 + attrs.xinXing;
}

/** 气运 → event-table shift: effective D100 = clamp(roll + (气运−5)×2). */
export function luckEventShift(qiYun: number): number {
  return (qiYun - 5) * 2;
}

/** 心性 — added to the D20 in 心魔劫 (heart-demon trial) checks. */
export function heartDemonResistance(xinXing: number): number {
  return xinXing;
}

/** Injuries slow cultivation: 1 + Σ effect.speed (negative values), floored at 0.3. */
export function injurySpeedMultiplier(injuries: Injury[] | undefined): number {
  if (!injuries || injuries.length === 0) return 1;
  const sum = injuries.reduce((acc, inj) => acc + (inj.effect.speed ?? 0), 0);
  return Math.max(0.3, 1 + sum);
}

/** Total flat penalty injuries apply to breakthrough chance (returned ≥ 0). */
export function injuryBreakthroughPenalty(injuries: Injury[] | undefined): number {
  if (!injuries || injuries.length === 0) return 0;
  return injuries.reduce((acc, inj) => acc + Math.abs(inj.effect.breakthrough ?? 0), 0);
}

/**
 * Max HP: 根骨-driven body multiplied by realm power.
 * 凡人根骨5 ≈ 100；筑基初期根骨7 ≈ 400；金丹 ≈ 1300+。
 */
export function maxHpFor(attrs: Attributes, realm?: RealmState): number {
  const body = 40 + attrs.genGu * 12;
  const mult = realm ? 1 + (powerOf(realm) - 5) / 50 : 1;
  return Math.max(1, Math.round(body * mult));
}

export interface DerivedStats {
  maxHp: number;
  speedFactor: number; // from 悟性 alone
  breakthroughBonus: number; // 根骨×2 + 心性
  luckShift: number; // event-table shift from 气运
}

/** Panel-facing derived stats. 机缘 deliberately contributes nothing visible here. */
export function derivedStats(attrs: Attributes, realm?: RealmState): DerivedStats {
  return {
    maxHp: maxHpFor(attrs, realm),
    speedFactor: comprehensionSpeedFactor(attrs.wuXing),
    breakthroughBonus: breakthroughAttributeBonus(attrs),
    luckShift: luckEventShift(attrs.qiYun),
  };
}
