// ============================================================================
// cultivation.ts — 修炼: exp per turn & the speed formula
//
//   exp/turn = (baseExp(realm) + expNeeded(level) × rate(realm))
//              × 灵根速率 × (1 + 悟性×0.05) × 功法加成 × 伤势惩罚 × 丹药增益
//
// The `expNeeded × rate` term flattens the geometric level curve into a
// smooth arc: early layers fly by, later layers take steadily longer without
// ever exploding. Minor levels (炼气 layers, 初期→大圆满 stages) advance
// automatically with overflow carry; major gates cap exp and demand 突破.
//
// PURE TypeScript. No randomness needed — variance comes from events/pills.
// ============================================================================

import type { Attributes, Injury, RealmId, RealmState, SpiritRoot, Technique } from './types';
import { comprehensionSpeedFactor, injurySpeedMultiplier } from './attributes';
import { advanceLevel, isFinalLevel, majorGateTarget, normalizedRealmDef, realmLabel } from './realms';

/** Per-realm pacing: fraction of the current level's expNeeded gained per turn. */
export const CULTIVATION_EXP_RATE: Record<RealmId, number> = {
  mortal: 0.5,
  qi: 0.12,
  foundation: 0.05,
  core: 0.035,
  nascent: 0.025,
  deity: 0.018,
};

/** A 功法 whose element matches the spirit root cultivates ×1.2 faster. */
export const ELEMENT_MATCH_BONUS = 1.2;

export interface CultivateContext {
  realm: RealmState;
  attributes: Attributes;
  spiritRoot: SpiritRoot;
  technique?: Pick<Technique, 'speedBonus' | 'elementAffinity'> | null;
  injuries?: Injury[];
  /** e.g. 1.5 while a 聚气丹 buff is active. */
  pillBuffMult?: number;
}

export interface CultivateResult {
  realm: RealmState;
  expGained: number;
  /** Labels of every minor level reached this turn (multi-level jumps possible early). */
  leveledTo: string[];
  /** True when progress is capped at a major gate — 突破 required. */
  atGate: boolean;
  gateTarget: RealmId | null;
  logs: string[];
}

/** 功法 speed multiplier, including the element-affinity match bonus. */
export function techniqueSpeedMultiplier(
  root: SpiritRoot,
  technique?: Pick<Technique, 'speedBonus' | 'elementAffinity'> | null
): number {
  if (!technique) return 1;
  let m = technique.speedBonus > 0 ? technique.speedBonus : 1;
  if (technique.elementAffinity?.some((e) => root.elements.includes(e))) m *= ELEMENT_MATCH_BONUS;
  return m;
}

/** Exp gained per cultivating turn for this context (≥ 1). */
export function cultivationSpeed(ctx: CultivateContext): number {
  const def = normalizedRealmDef(ctx.realm.realm);
  const base = def.baseExp + ctx.realm.expNeeded * CULTIVATION_EXP_RATE[ctx.realm.realm];
  const speed =
    base *
    ctx.spiritRoot.speedMultiplier *
    comprehensionSpeedFactor(ctx.attributes.wuXing) *
    techniqueSpeedMultiplier(ctx.spiritRoot, ctx.technique) *
    injurySpeedMultiplier(ctx.injuries) *
    (ctx.pillBuffMult ?? 1);
  return Math.max(1, Math.round(speed));
}

function gateLog(rs: RealmState): string {
  if (rs.realm === 'mortal') return '气感已成，天门微启。可试引气入体，行突破之事。';
  return `${realmLabel(rs)}圆满，灵力盈溢而无所去。前路如壁——须行突破。`;
}

/** Resolve one turn of 修炼. Returns the new realm state; never mutates input. */
export function cultivateOnce(ctx: CultivateContext): CultivateResult {
  const expGained = cultivationSpeed(ctx);
  const logs: string[] = [];
  const leveledTo: string[] = [];

  let rs: RealmState = { ...ctx.realm, exp: ctx.realm.exp + expGained };
  let atGate = false;

  while (rs.exp >= rs.expNeeded) {
    if (isFinalLevel(rs)) {
      // Major gate: exp caps here until a successful 突破.
      rs = { ...rs, exp: rs.expNeeded };
      atGate = true;
      break;
    }
    const overflow = rs.exp - rs.expNeeded;
    const advanced = advanceLevel(rs);
    if (!advanced) break; // defensive; isFinalLevel above already guards this
    rs = { ...advanced, exp: overflow };
    leveledTo.push(realmLabel(rs));
  }

  logs.push(`吐纳三月，得纯元${expGained}点。`);
  for (const label of leveledTo) logs.push(`灵力凝转，臻至${label}。`);
  if (atGate) logs.push(gateLog(rs));

  return {
    realm: rs,
    expGained,
    leveledTo,
    atGate,
    gateTarget: atGate ? majorGateTarget(rs) : null,
    logs,
  };
}
