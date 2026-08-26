// ============================================================================
// realms.ts — 境界 progression rules
// 凡人 → 炼气一至十三层 → 筑基 → 金丹 → 元婴 → 化神 (各分 初期/中期/后期/大圆满)
//
// Rules layer over `@/data/realmData`. Every read of a realm definition goes
// through `normalizedRealmDef`, which tolerates historical field-name
// variants of the data file and falls back to canonical values, so the rest
// of the engine never touches raw data-file shapes.
//
// PURE TypeScript — no React, no browser APIs, no randomness.
// ============================================================================

import type { RealmId, RealmState, Stage } from './types';
import { STAGES } from './types';
import { REALMS } from '@/data/realmData';

export { STAGES };

export const REALM_ORDER: RealmId[] = ['mortal', 'qi', 'foundation', 'core', 'nascent', 'deity'];

// ===== canonical fallbacks (used when the data file omits a field) =====

const FALLBACK_LIFESPAN: Record<RealmId, number> = {
  mortal: 80, qi: 120, foundation: 200, core: 500, nascent: 1000, deity: 1500,
};
const FALLBACK_BASE_CHANCE: Record<RealmId, number> = {
  mortal: 100, qi: 85, foundation: 40, core: 25, nascent: 15, deity: 8,
};
const FALLBACK_EXP_PER_LEVEL: Record<RealmId, number[]> = {
  mortal: [100],
  qi: [100, 130, 170, 220, 290, 370, 470, 590, 730, 900, 1100, 1330, 1600],
  foundation: [2400, 3600, 5200, 7200],
  core: [12000, 18000, 26000, 36000],
  nascent: [60000, 90000, 130000, 180000],
  deity: [300000, 450000, 650000, 900000],
};
const FALLBACK_POWER: Record<RealmId, number> = {
  mortal: 5, qi: 12, foundation: 160, core: 600, nascent: 2200, deity: 7000,
};
const FALLBACK_CULTIVATE_BASE: Record<RealmId, number> = {
  mortal: 4, qi: 10, foundation: 16, core: 22, nascent: 30, deity: 40,
};
const FALLBACK_EXP_LOSS: Record<RealmId, [number, number]> = {
  mortal: [0, 0], qi: [10, 20], foundation: [30, 50], core: [30, 50], nascent: [35, 50], deity: [40, 60],
};
const FALLBACK_INJURY_CHANCE: Record<RealmId, number> = {
  mortal: 0, qi: 10, foundation: 40, core: 50, nascent: 60, deity: 70,
};
const FALLBACK_DEATH_CHANCE: Record<RealmId, number> = {
  mortal: 0, qi: 0, foundation: 0, core: 5, nascent: 10, deity: 15,
};
const DEFAULT_STAGE_POWER_MULT = [1, 1.3, 1.7, 2.2];

/** Loose view over all data-file generations. */
interface LooseRealmDef {
  id: RealmId;
  name?: string;
  lifespan?: number;
  layers?: number;
  stages?: readonly Stage[];
  baseExpPerLevel?: number[];
  expPerLevel?: number;
  powerBase?: number;
  perLayerPower?: number;
  stagePowerMult?: number[];
  cultivateExpBase?: number;
  baseExp?: number;
  breakthroughBaseChance?: number;
  heartDemonDC?: number;
  failurePenalty?: {
    expLossPct?: [number, number];
    expLoss?: [number, number];
    expLossMin?: number;
    expLossMax?: number;
    injuryChance?: number;
    deathChance?: number;
  };
  breakthroughNarrative?: { success?: string; failure?: string; death?: string };
}

export interface NormalizedRealmDef {
  id: RealmId;
  name: string;
  /** absolute 寿元 once the realm is reached */
  lifespan: number;
  /** 凡人 1 · 炼气 13 · 筑基+ 4 stages */
  levelCount: number;
  /** exp wall of each level (index 0-based) */
  expPerLevel: number[];
  powerBase: number;
  perLayerPower: number;
  stagePowerMult: number[];
  /** base 修炼 exp per turn at this realm */
  cultivateExpBase: number;
  /** base % chance for a 突破 INTO this realm */
  breakthroughBaseChance: number;
  /** DC of the 心魔劫 guarding the 突破 INTO this realm (0 = no trial) */
  heartDemonDC: number;
  /** failure fallout of a 突破 INTO this realm */
  expLossPct: [number, number];
  injuryChance: number;
  deathChance: number;
  narrative: { success?: string; failure?: string; death?: string };
}

const REALM_NAMES: Record<RealmId, string> = {
  mortal: '凡人', qi: '炼气', foundation: '筑基', core: '金丹', nascent: '元婴', deity: '化神',
};

function rawDef(id: RealmId): LooseRealmDef | undefined {
  const list = REALMS as unknown as LooseRealmDef[];
  return Array.isArray(list) ? list.find((r) => r.id === id) : undefined;
}

const HEART_DEMON_FALLBACK: Record<RealmId, number> = {
  mortal: 0, qi: 0, foundation: 0, core: 13, nascent: 16, deity: 19,
};

export function levelCountOf(id: RealmId): number {
  if (id === 'mortal') return 1;
  if (id === 'qi') return rawDef(id)?.layers ?? 13;
  return rawDef(id)?.stages?.length ?? 4;
}

export function normalizedRealmDef(id: RealmId): NormalizedRealmDef {
  const def = rawDef(id) ?? { id };
  const fp = def.failurePenalty ?? {};
  const expLoss: [number, number] =
    fp.expLossPct ??
    fp.expLoss ??
    (fp.expLossMin !== undefined && fp.expLossMax !== undefined
      ? [fp.expLossMin, fp.expLossMax]
      : FALLBACK_EXP_LOSS[id]);
  const count = levelCountOf(id);
  let expPerLevel: number[];
  if (Array.isArray(def.baseExpPerLevel) && def.baseExpPerLevel.length > 0) {
    expPerLevel = def.baseExpPerLevel;
  } else if (typeof def.expPerLevel === 'number') {
    expPerLevel = Array.from({ length: count }, (_, i) => Math.round(def.expPerLevel! * Math.pow(1.25, i)));
  } else {
    expPerLevel = FALLBACK_EXP_PER_LEVEL[id];
  }
  return {
    id,
    name: def.name ?? REALM_NAMES[id],
    lifespan: def.lifespan ?? FALLBACK_LIFESPAN[id],
    levelCount: count,
    expPerLevel,
    powerBase: def.powerBase ?? FALLBACK_POWER[id],
    perLayerPower: def.perLayerPower ?? Math.max(1, Math.round((def.powerBase ?? FALLBACK_POWER[id]) * 0.66)),
    stagePowerMult: def.stagePowerMult ?? DEFAULT_STAGE_POWER_MULT,
    cultivateExpBase: def.cultivateExpBase ?? def.baseExp ?? FALLBACK_CULTIVATE_BASE[id],
    breakthroughBaseChance: def.breakthroughBaseChance ?? FALLBACK_BASE_CHANCE[id],
    heartDemonDC: def.heartDemonDC ?? HEART_DEMON_FALLBACK[id],
    expLossPct: expLoss,
    injuryChance: fp.injuryChance ?? FALLBACK_INJURY_CHANCE[id],
    deathChance: fp.deathChance ?? FALLBACK_DEATH_CHANCE[id],
    narrative: def.breakthroughNarrative ?? {},
  };
}

// ===== ordering =====

export function realmTier(id: RealmId): number {
  return REALM_ORDER.indexOf(id);
}
/** legacy alias */
export const realmIndex = realmTier;

/** The next major realm, or null at 化神 (ascension path instead). */
export function nextRealmId(id: RealmId): RealmId | null {
  const i = REALM_ORDER.indexOf(id);
  return i >= 0 && i < REALM_ORDER.length - 1 ? (REALM_ORDER[i + 1] ?? null) : null;
}

// ===== realm-state mechanics =====

/** Exp needed to clear level `levelIndex` (0-based) of a realm. */
export function expNeededAt(id: RealmId, levelIndex: number): number {
  const arr = normalizedRealmDef(id).expPerLevel;
  return arr[Math.max(0, Math.min(levelIndex, arr.length - 1))] ?? 100;
}

/** 0-based index of the current level inside its realm. */
export function levelIndexOf(rs: RealmState): number {
  if (rs.realm === 'mortal') return 0;
  if (rs.realm === 'qi') return Math.max(0, rs.qiLayer - 1);
  return Math.max(0, STAGES.indexOf(rs.stage));
}

/** Starting state: an ordinary mortal sensing toward 引气入体. */
export function initialRealmState(): RealmState {
  return { realm: 'mortal', qiLayer: 0, stage: '初期', exp: 0, expNeeded: expNeededAt('mortal', 0) };
}

/** First level of a realm, entered on a successful major breakthrough. */
export function enterRealm(id: RealmId): RealmState {
  return {
    realm: id,
    qiLayer: id === 'qi' ? 1 : 0,
    stage: '初期',
    exp: 0,
    expNeeded: expNeededAt(id, 0),
  };
}

/** True on the last level of the realm (炼气十三层 / 大圆满 / 凡人). */
export function isFinalLevel(rs: RealmState): boolean {
  return levelIndexOf(rs) >= levelCountOf(rs.realm) - 1;
}

/** Major gate: final level AND exp filled — further progress requires 突破. */
export function isAtMajorGate(rs: RealmState): boolean {
  return isFinalLevel(rs) && rs.exp >= rs.expNeeded;
}
/** legacy aliases */
export const atMajorGate = isAtMajorGate;
export const atMajorWall = isAtMajorGate;

/** The realm a 突破 from this state would enter, or null at 化神. */
export function majorGateTarget(rs: RealmState): RealmId | null {
  return nextRealmId(rs.realm);
}

/**
 * Advance one minor level within the current realm (炼气 layer or
 * 初期→…→大圆满 stage). Returns null on the final level (major gate).
 * The returned state starts at exp 0; the caller applies overflow carry.
 */
export function advanceLevel(rs: RealmState): RealmState | null {
  if (isFinalLevel(rs)) return null;
  const idx = levelIndexOf(rs) + 1;
  if (rs.realm === 'qi') {
    return { realm: 'qi', qiLayer: rs.qiLayer + 1, stage: rs.stage, exp: 0, expNeeded: expNeededAt('qi', idx) };
  }
  const stage: Stage = STAGES[idx] ?? '大圆满';
  return { realm: rs.realm, qiLayer: 0, stage, exp: 0, expNeeded: expNeededAt(rs.realm, idx) };
}

/** Absolute 寿元 for a realm. */
export function lifespanFor(id: RealmId): number {
  return normalizedRealmDef(id).lifespan;
}
/** legacy alias taking a realm state */
export function lifespanOf(rs: RealmState): number {
  return lifespanFor(rs.realm);
}

/** Stage/layer multiplier over the realm's powerBase. */
export function stageMultiplier(rs: RealmState): number {
  const def = normalizedRealmDef(rs.realm);
  if (rs.realm === 'qi') {
    return (def.powerBase + def.perLayerPower * Math.max(0, rs.qiLayer - 1)) / def.powerBase;
  }
  const i = Math.max(0, STAGES.indexOf(rs.stage));
  return def.stagePowerMult[Math.min(i, def.stagePowerMult.length - 1)] ?? 1;
}

/** Combat / body power of a realm state. */
export function realmPower(rs: RealmState): number {
  const def = normalizedRealmDef(rs.realm);
  return Math.round(def.powerBase * stageMultiplier(rs));
}

/** Base % chance for a 突破 INTO the target realm. */
export function breakthroughBaseChanceInto(target: RealmId): number {
  return normalizedRealmDef(target).breakthroughBaseChance;
}

/** Failure fallout parameters for a failed 突破 INTO the target realm. */
export function failurePenaltyInto(
  target: RealmId
): Pick<NormalizedRealmDef, 'expLossPct' | 'injuryChance' | 'deathChance'> {
  const { expLossPct, injuryChance, deathChance } = normalizedRealmDef(target);
  return { expLossPct, injuryChance, deathChance };
}

// ===== display =====

const CN_NUMS: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七',
  8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三',
};

/** 「凡人」「炼气七层」「金丹中期」 */
export function realmLabelOf(rs: RealmState): string {
  const def = normalizedRealmDef(rs.realm);
  if (rs.realm === 'mortal') return def.name;
  if (rs.realm === 'qi') return `${def.name}${CN_NUMS[rs.qiLayer] ?? rs.qiLayer}层`;
  return `${def.name}${rs.stage}`;
}
/** legacy alias */
export const realmDisplayName = realmLabelOf;
