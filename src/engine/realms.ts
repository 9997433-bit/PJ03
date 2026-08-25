// ============================================================================
// realms.ts — 境界 progression rules
// 凡人 → 炼气一至十三层 → 筑基 → 金丹 → 元婴 → 化神 (each 初期/中期/后期/大圆满)
//
// Rules layer over `@/data/realmData`. All realm-def reads go through
// `normalizedRealmDef` so the rest of the engine is insulated from the exact
// data-file field names. PURE TypeScript.
// ============================================================================

import type { RealmDef, RealmId, RealmState, Stage } from './types';
import {
  getRealmDef,
  nextRealm,
  realmLabel,
  realmTier,
  REALM_ORDER,
  STAGES,
  stageMultiplier,
} from '@/data/realmData';

export { nextRealm, realmLabel, realmTier, REALM_ORDER, STAGES, stageMultiplier };

// ===== Normalized realm definition =====

export interface NormalizedRealmDef {
  id: RealmId;
  name: string;
  lifespan: number; // absolute 寿元 once the realm is reached
  levelCount: number; // 凡人 1 · 炼气 13 · 筑基+ 4 stages
  powerBase: number;
  breakthroughBaseChance: number; // base % chance to break INTO this realm
  baseExp: number; // per-turn cultivation base for this realm
  expLossPct: [number, number]; // breakthrough failure: % exp lost (min, max)
  injuryChance: number; // % chance of injury on failed breakthrough
  deathChance: number; // % chance of death on failed breakthrough
}

// Fallbacks in case the data file's field names shift while modules converge.
const FALLBACK_BASE_EXP: Record<RealmId, number> = {
  mortal: 4,
  qi: 10,
  foundation: 16,
  core: 22,
  nascent: 30,
  deity: 40,
};
const FALLBACK_EXP_PER_LEVEL: Record<RealmId, number> = {
  mortal: 30,
  qi: 60,
  foundation: 400,
  core: 1500,
  nascent: 5000,
  deity: 15000,
};
const FALLBACK_LIFESPAN: Record<RealmId, number> = {
  mortal: 80,
  qi: 120,
  foundation: 200,
  core: 500,
  nascent: 1000,
  deity: 1500,
};

type LooseRealmDef = RealmDef & {
  baseExp?: number;
  expPerLevel?: number;
  baseExpPerLevel?: number[];
  failurePenalty?: {
    expLossPct?: [number, number];
    expLoss?: [number, number];
    injuryChance?: number;
    deathChance?: number;
  };
};

export function levelCountOf(id: RealmId): number {
  if (id === 'mortal') return 1;
  const def = getRealmDef(id) as LooseRealmDef;
  if (id === 'qi') return def.layers ?? 13;
  return def.stages?.length ?? 4;
}

export function normalizedRealmDef(id: RealmId): NormalizedRealmDef {
  const def = getRealmDef(id) as LooseRealmDef;
  const fp = def.failurePenalty ?? {};
  return {
    id,
    name: def.name,
    lifespan: def.lifespan ?? FALLBACK_LIFESPAN[id],
    levelCount: levelCountOf(id),
    powerBase: def.powerBase,
    breakthroughBaseChance: def.breakthroughBaseChance,
    baseExp: def.baseExp ?? FALLBACK_BASE_EXP[id],
    expLossPct: fp.expLossPct ?? fp.expLoss ?? [30, 50],
    injuryChance: fp.injuryChance ?? 40,
    deathChance: fp.deathChance ?? 0,
  };
}

/**
 * Exp needed to clear level `levelIndex` (0-based) of a realm.
 * Smooth geometric curve: expPerLevel × 1.25^levelIndex.
 */
export function expNeededAt(id: RealmId, levelIndex: number): number {
  const def = getRealmDef(id) as LooseRealmDef;
  if (Array.isArray(def.baseExpPerLevel) && def.baseExpPerLevel.length > 0) {
    const arr = def.baseExpPerLevel;
    return arr[Math.min(levelIndex, arr.length - 1)];
  }
  const per = def.expPerLevel ?? FALLBACK_EXP_PER_LEVEL[id];
  return Math.round(per * Math.pow(1.25, levelIndex));
}

// ===== Realm-state mechanics =====

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

/** True when the state sits on the last level of its realm (炼气十三层 / 大圆满 / 凡人). */
export function isFinalLevel(rs: RealmState): boolean {
  return levelIndexOf(rs) >= levelCountOf(rs.realm) - 1;
}

/** Major gate: final level AND exp filled — further progress requires 突破. */
export function isAtMajorGate(rs: RealmState): boolean {
  return isFinalLevel(rs) && rs.exp >= rs.expNeeded;
}

/** The realm a 突破 from this state would enter, or null at 化神 (ascension path instead). */
export function majorGateTarget(rs: RealmState): RealmId | null {
  return nextRealm(rs.realm);
}

/**
 * Advance one minor level within the current realm (炼气 layer or 初期→…→大圆满 stage).
 * Returns null when already on the final level (a major gate — use breakthrough.ts).
 * The returned state starts the new level with exp 0; the caller applies overflow.
 */
export function advanceLevel(rs: RealmState): RealmState | null {
  if (isFinalLevel(rs)) return null;
  const idx = levelIndexOf(rs) + 1;
  if (rs.realm === 'qi') {
    return { realm: 'qi', qiLayer: rs.qiLayer + 1, stage: rs.stage, exp: 0, expNeeded: expNeededAt('qi', idx) };
  }
  const stage: Stage = STAGES[idx];
  return { realm: rs.realm, qiLayer: 0, stage, exp: 0, expNeeded: expNeededAt(rs.realm, idx) };
}

/** Absolute 寿元 for a realm. */
export function lifespanFor(id: RealmId): number {
  return normalizedRealmDef(id).lifespan;
}

/** Combat / body power of a realm state (powerBase × stage multiplier). */
export function powerOf(rs: RealmState): number {
  return Math.round(normalizedRealmDef(rs.realm).powerBase * stageMultiplier(rs));
}

/** Base % chance for a 突破 INTO the target realm. */
export function breakthroughBaseChanceInto(target: RealmId): number {
  return normalizedRealmDef(target).breakthroughBaseChance;
}

/** Failure fallout parameters for a failed 突破 INTO the target realm. */
export function failurePenaltyInto(target: RealmId): Pick<NormalizedRealmDef, 'expLossPct' | 'injuryChance' | 'deathChance'> {
  const { expLossPct, injuryChance, deathChance } = normalizedRealmDef(target);
  return { expLossPct, injuryChance, deathChance };
}

/** True if a is strictly below b in the realm order. */
export function isRealmBelow(a: RealmId, b: RealmId): boolean {
  return realmTier(a) < realmTier(b);
}
