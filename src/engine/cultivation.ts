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
// PURE core (cultivationSpeed / cultivateOnce) — no randomness; variance
// comes from events and pills. GameState wrappers (cultivate / settleLevelUps)
// mutate the turn-local clone owned by turn.ts.
// ============================================================================

import type { AnyElement, Attributes, Character, GameState, Injury, LogEntry, RealmId, RealmState, SpiritRoot } from './types';
import { LOG_CAP } from './types';
import { comprehensionSpeedFactor, injurySpeedMult, type Notice } from './attributes';
import { advanceLevel, isAtMajorGate, isFinalLevel, majorGateTarget, normalizedRealmDef, realmLabelOf } from './realms';
import { getTechnique } from '@/data/techniques';

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

export interface TechniqueLike {
  speedBonus?: number;
  elementAffinity?: AnyElement[] | null;
}

export interface CultivateContext {
  realm: RealmState;
  attributes: Attributes;
  spiritRoot: SpiritRoot;
  technique?: TechniqueLike | null;
  injuries?: Injury[];
  /** e.g. 1.5 while a 聚气丹 buff is active. */
  pillBuffMult?: number;
}

export interface CultivateResult {
  realm: RealmState;
  expGained: number;
  /** labels of every minor level reached this turn (multi-level jumps possible early) */
  leveledTo: string[];
  /** true when progress is capped at a major gate — 突破 required */
  atGate: boolean;
  gateTarget: RealmId | null;
  logs: string[];
}

/** 功法 speed multiplier, including the element-affinity match bonus. */
export function techniqueSpeedMultiplier(root: SpiritRoot, technique?: TechniqueLike | null): number {
  if (!technique) return 1;
  const bonus = technique.speedBonus ?? 1;
  let m = bonus > 0 ? bonus : 1;
  if (technique.elementAffinity?.some((e) => root.elements.includes(e))) m *= ELEMENT_MATCH_BONUS;
  return m;
}

/** Exp gained per cultivating turn for this context (≥ 1). */
export function cultivationSpeed(ctx: CultivateContext): number {
  const def = normalizedRealmDef(ctx.realm.realm);
  const base = def.cultivateExpBase + ctx.realm.expNeeded * CULTIVATION_EXP_RATE[ctx.realm.realm];
  const speed =
    base *
    ctx.spiritRoot.speedMultiplier *
    comprehensionSpeedFactor(ctx.attributes.wuXing) *
    techniqueSpeedMultiplier(ctx.spiritRoot, ctx.technique) *
    injurySpeedMult(ctx.injuries) *
    (ctx.pillBuffMult ?? 1);
  return Math.max(1, Math.round(speed));
}

function gateLine(rs: RealmState): string {
  if (rs.realm === 'mortal') return '气感已成，天门微启。可试引气入体，行【突破】之事。';
  if (rs.realm === 'deity') return '化神大圆满。肉身已近天地之极，飞升之门，将为汝启。';
  return `${realmLabelOf(rs)}圆满，灵力盈溢而无所去。前路如壁——须行【突破】。`;
}

/** Resolve one turn of 修炼 (pure). Returns the new realm state; never mutates input. */
export function cultivateOnce(ctx: CultivateContext): CultivateResult {
  const expGained = cultivationSpeed(ctx);
  const logs: string[] = [];
  const leveledTo: string[] = [];

  let rs: RealmState = { ...ctx.realm, exp: ctx.realm.exp + expGained };
  let atGate = false;

  while (rs.exp >= rs.expNeeded) {
    if (isFinalLevel(rs)) {
      rs = { ...rs, exp: rs.expNeeded }; // major gate: exp caps until 突破
      atGate = true;
      break;
    }
    const overflow = rs.exp - rs.expNeeded;
    const advanced = advanceLevel(rs);
    if (!advanced) break; // defensive; isFinalLevel above already guards this
    rs = { ...advanced, exp: overflow };
    leveledTo.push(realmLabelOf(rs));
  }

  logs.push(`吐纳三月，得纯元${expGained}点。`);
  for (const label of leveledTo) logs.push(`灵力凝转，臻至${label}。`);
  if (atGate) logs.push(gateLine(rs));

  return { realm: rs, expGained, leveledTo, atGate, gateTarget: atGate ? majorGateTarget(rs) : null, logs };
}

// ============================================================================
// GameState wrappers (mutate the turn-local clone; single writer is turn.ts)
// ============================================================================

function log(state: GameState, speaker: LogEntry['speaker'], text: string, tone?: LogEntry['tone']): void {
  const id = state.nextLogId ?? (state.narrativeLog[state.narrativeLog.length - 1]?.id ?? 0) + 1;
  state.nextLogId = id + 1;
  state.narrativeLog.push({ id, turn: state.turn, speaker, text, tone });
  if (state.narrativeLog.length > LOG_CAP) state.narrativeLog.splice(0, state.narrativeLog.length - LOG_CAP);
}

const CULTIVATE_FLAVOR = [
  '汝盘膝而坐，吐纳灵气。窗外日升月落，不知几度。',
  '灵气如丝，缓缓入体。修行无岁月，一坐又三月。',
  '汝依法行功，周天流转。进境或迟或速，天道皆记。',
] as const;

function techniqueFor(c: Character): TechniqueLike | null {
  if (!c.techniqueId) return null;
  return (getTechnique(c.techniqueId) as TechniqueLike | undefined) ?? null;
}

/** Cultivation buff multiplier from active status effects (聚气丹 etc.). */
function statusSpeedMult(c: Character): number {
  let m = 1;
  for (const s of c.statusEffects ?? []) m *= s.speedMult ?? 1;
  return Math.max(0.1, m);
}

/** True when the character stands at a major gate and 突破 is the only way on. */
export function atBreakthroughGate(c: Character): boolean {
  return isAtMajorGate(c.realm);
}

/** One turn of 修炼 against the (turn-local) state. */
export function cultivate(state: GameState): Notice[] {
  const c = state.character;
  if (!c || state.phase !== 'playing') return [];
  const notices: Notice[] = [];

  if (isAtMajorGate(c.realm)) {
    log(state, '天道', gateLine(c.realm), 'jade');
    log(state, '天道', '修为已至此境之极，再多吐纳，亦是徒劳。', 'muted');
    return notices;
  }

  const result = cultivateOnce({
    realm: c.realm,
    attributes: c.attributes,
    spiritRoot: c.spiritRoot,
    technique: techniqueFor(c),
    injuries: c.injuries,
    pillBuffMult: statusSpeedMult(c),
  });
  c.realm = result.realm;

  log(state, '天道', CULTIVATE_FLAVOR[state.turn % CULTIVATE_FLAVOR.length] ?? CULTIVATE_FLAVOR[0]);
  log(state, '系统', `此番闭关，修为增长${result.expGained}点。`, 'muted');
  for (const label of result.leveledTo) {
    log(state, '天道', `经脉中灵气轰然一涨——${label}。水到，渠成。`, 'jade');
    notices.push({ kind: 'success', title: '境界提升', desc: label });
    if (state.stats) state.stats.peakRealmLabel = label;
  }
  if (result.atGate) {
    log(state, '天道', gateLine(c.realm), 'gold');
    notices.push({ kind: 'info', title: '瓶颈已至', desc: '可尝试【突破】。' });
  }
  return notices;
}

/**
 * Settle pending level-ups after exp was granted by events/pills:
 * advances minor levels with overflow carry and caps exp at major gates.
 */
export function settleLevelUps(state: GameState): Notice[] {
  const c = state.character;
  if (!c) return [];
  const notices: Notice[] = [];

  while (c.realm.exp >= c.realm.expNeeded) {
    if (isFinalLevel(c.realm)) {
      if (c.realm.exp > c.realm.expNeeded) c.realm = { ...c.realm, exp: c.realm.expNeeded };
      if (state.phase === 'playing') log(state, '天道', gateLine(c.realm), 'gold');
      break;
    }
    const overflow = c.realm.exp - c.realm.expNeeded;
    const advanced = advanceLevel(c.realm);
    if (!advanced) break;
    c.realm = { ...advanced, exp: overflow };
    const label = realmLabelOf(c.realm);
    log(state, '天道', `道行圆融，更上一重。今为${label}。`, 'jade');
    notices.push({ kind: 'success', title: '境界提升', desc: label });
    if (state.stats) state.stats.peakRealmLabel = label;
  }
  return notices;
}
