// ============================================================================
// attributes.ts — 五维 (Five Attributes) math & derived stats
// 根骨 genGu · 悟性 wuXing · 心性 xinXing · 机缘 jiYuan (hidden) · 气运 qiYun
//
// PURE TypeScript. No React, no browser APIs, no Math.random().
// ============================================================================

import type { Attributes, Character, Injury, RealmState } from './types';
import { realmPower } from './realms';
import { ITEM_BY_ID } from '@/data/items';
import { getTechnique } from '@/data/techniques';

// ===== creation constants =====
export const BASE_ATTRIBUTE = 5; // every visible attribute starts here
export const FREE_POINTS = 10; // allocatable at creation
export const CREATION_CAP = 10; // max per visible attribute at creation
export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 20; // lifetime cap (pills / events included)

export const ATTR_LABELS: Record<keyof Attributes, string> = {
  genGu: '根骨',
  wuXing: '悟性',
  xinXing: '心性',
  jiYuan: '机缘',
  qiYun: '气运',
};

/** Engine-level notice for toasts/FX; structurally compatible with UI notices. */
export interface Notice {
  kind: 'info' | 'success' | 'warning' | 'danger' | 'gold';
  title: string;
  desc?: string;
}

export function clampAttr(v: number): number {
  return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.round(v)));
}

// ===== creation allocation (step 2) =====

export interface AllocationInput {
  genGu: number;
  wuXing: number;
  xinXing: number;
  qiYun: number;
}

/**
 * Validate a creation-time allocation. Convention: the input carries FINAL
 * values (base 5 + distributed free points), i.e. each 5–10 and the four
 * together exactly 5×4+10 = 30. 机缘 is never allocatable.
 * Returns an error string, or null when valid.
 */
export function validateAllocation(alloc: AllocationInput): string | null {
  const values = [alloc.genGu, alloc.wuXing, alloc.xinXing, alloc.qiYun];
  for (const v of values) {
    if (!Number.isInteger(v)) return '属性须为整数。';
    if (v < BASE_ATTRIBUTE) return `属性不得低于基础值${BASE_ATTRIBUTE}。`;
    if (v > CREATION_CAP) return `创角时单项属性至多${CREATION_CAP}。`;
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const expected = BASE_ATTRIBUTE * 4 + FREE_POINTS;
  if (sum !== expected) return `属性点须恰好分尽：合计应为${expected}，现为${sum}。`;
  return null;
}

/** Allocation + origin modifiers → the character's attribute block (机缘 sealed at 0). */
export function buildAttributes(alloc: AllocationInput, mods: Partial<Attributes> = {}): Attributes {
  return {
    genGu: clampAttr(alloc.genGu + (mods.genGu ?? 0)),
    wuXing: clampAttr(alloc.wuXing + (mods.wuXing ?? 0)),
    xinXing: clampAttr(alloc.xinXing + (mods.xinXing ?? 0)),
    qiYun: clampAttr(alloc.qiYun + (mods.qiYun ?? 0)),
    jiYuan: 0,
  };
}

/** Apply a delta to one attribute, clamped. */
export function bumpAttribute(attrs: Attributes, key: keyof Attributes, delta: number): Attributes {
  return { ...attrs, [key]: clampAttr(attrs[key] + delta) };
}

/** Sealed hidden roll → 机缘 1–10. The mapping is never surfaced in UI text. */
export function mapHiddenRollToJiYuan(d100: number): number {
  return Math.max(1, Math.min(10, Math.ceil(d100 / 10)));
}

// ===== derived stats =====

/** 悟性 → cultivation speed factor (1 + 悟性 × 0.05). */
export function comprehensionSpeedFactor(wuXing: number): number {
  return 1 + wuXing * 0.05;
}

/** 根骨×2 + 心性×1 — flat percentage-point bonus to breakthrough chance. */
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

// ===== injuries =====

/** Injuries slow cultivation: Π (1 + effect.speed), floored at 0.3. */
export function injurySpeedMult(injuries: readonly Injury[] | undefined): number {
  if (!injuries || injuries.length === 0) return 1;
  let m = 1;
  for (const inj of injuries) m *= 1 + (inj.effect.speed ?? 0);
  return Math.max(0.3, m);
}

/** Injuries weaken combat power: Π (1 + effect.power), floored at 0.3. */
export function injuryPowerMult(injuries: readonly Injury[] | undefined): number {
  if (!injuries || injuries.length === 0) return 1;
  let m = 1;
  for (const inj of injuries) m *= 1 + (inj.effect.power ?? 0);
  return Math.max(0.3, m);
}

/**
 * Total percentage-POINT penalty injuries apply to breakthrough chance.
 * Injury effects use the fractional dialect ({ breakthrough: -0.1 } = −10pp).
 */
export function injuryBreakthroughPenalty(injuries: readonly Injury[] | undefined): number {
  if (!injuries || injuries.length === 0) return 0;
  return Math.round(injuries.reduce((acc, inj) => acc + Math.abs(inj.effect.breakthrough ?? 0), 0) * 100);
}

// ===== HP / combat =====

/** Max HP: 根骨-driven body plus realm-power bonus. 凡人根骨5 ≈ 100 HP. */
export function maxHpFor(attrs: Attributes, realm?: RealmState): number {
  const body = 40 + attrs.genGu * 12;
  const realmBonus = realm ? Math.round(realmPower(realm) * 0.5) : 0;
  return Math.max(1, body + realmBonus);
}

/** Character-shaped convenience over maxHpFor (used at creation / level-up). */
export function deriveMaxHp(char: Pick<Character, 'attributes' | 'realm'>): number {
  return maxHpFor(char.attributes, char.realm);
}

interface LooseGear {
  power?: number;
  defense?: number;
  powerBonus?: number;
}

function gearOf(id: string | null | undefined): LooseGear | undefined {
  if (!id) return undefined;
  return (ITEM_BY_ID as Record<string, LooseGear | undefined>)[id];
}

function techniqueOf(id: string | null | undefined): LooseGear | undefined {
  if (!id) return undefined;
  return getTechnique(id) as LooseGear | undefined;
}

/**
 * 战力 = 境界底蕴×阶段系数 + 根骨×3 + 兵刃 + 功法底蕴, ×伤势 ×出身修正.
 * (术法加成在战斗回合内另计。)
 */
export function combatPower(char: Character): number {
  let p = realmPower(char.realm) + char.attributes.genGu * 3;
  p += gearOf(char.equipped.weapon)?.power ?? 0;
  p += techniqueOf(char.techniqueId)?.powerBonus ?? 0;
  p *= injuryPowerMult(char.injuries);
  if (char.flags.slayer === true) p *= 1.05; // 猎户遗孤·搏杀
  return Math.round(p);
}
/** legacy alias */
export const powerOf = combatPower;

/** 防御 = 根骨 + 甲胄 + 佩饰。 */
export function defenseValue(char: Character): number {
  let d = char.attributes.genGu;
  d += gearOf(char.equipped.armor)?.defense ?? 0;
  d += gearOf(char.equipped.accessory)?.defense ?? 0;
  return Math.round(d);
}
/** legacy alias */
export const defenseOf = defenseValue;

// ===== panel summary =====

export interface DerivedStats {
  maxHp: number;
  speedFactor: number;
  breakthroughBonus: number;
  luckShift: number;
}

/** Panel-facing derived stats. 机缘 deliberately contributes nothing visible. */
export function derivedStats(attrs: Attributes, realm?: RealmState): DerivedStats {
  return {
    maxHp: maxHpFor(attrs, realm),
    speedFactor: comprehensionSpeedFactor(attrs.wuXing),
    breakthroughBonus: breakthroughAttributeBonus(attrs),
    luckShift: luckEventShift(attrs.qiYun),
  };
}
