// ============================================================================
// breakthrough.ts — 突破: the dramatic D100 gate between realms
//
//   chance = base(target) + 根骨×2 + 心性×1 + 丹药 + 事件加成 − 伤势
//            (± 心魔劫 outcome at 金丹/元婴/化神; halved while bottlenecked)
//   → clamped to 1–95, then one D100 must land ≤ chance.
//
// 心魔劫 (heart-demon trial): attempts into 金丹 and beyond first face a
// D20 + 心性 vs DC check. A steady heart gains +5; a wavering heart suffers
// −15 and — if the breakthrough then fails — a guaranteed 心魔缠身 injury.
//
// Failure fallout: 30–50%+ exp burned, injury roll, death roll (金丹+),
// and after 2 consecutive failures a bottleneck halves further attempts
// until cleared by pill or event (flag `bottleneck`).
//
// Two API layers:
//   - resolveBreakthrough(ctx, roll) — PURE core with injected dice
//     (fully unit-testable, never mutates inputs);
//   - attemptBreakthrough(state) / breakthroughChance(state) — GameState
//     wrappers in the shape turn.ts and the store facade consume.
// ============================================================================

import type { Attributes, Die, GameState, Injury, LogEntry, RealmId, RealmState } from './types';
import { LOG_CAP, ROLL_CAP } from './types';
import { rollDie } from './rng';
import {
  breakthroughAttributeBonus,
  deriveMaxHp,
  heartDemonResistance,
  injuryBreakthroughPenalty,
  type Notice,
} from './attributes';
import {
  breakthroughBaseChanceInto,
  enterRealm,
  failurePenaltyInto,
  isAtMajorGate,
  lifespanFor,
  majorGateTarget,
  normalizedRealmDef,
  realmLabelOf,
  realmTier,
} from './realms';
import { finishGame, type EndingId } from './lifecycle';

export type RollFn = (die: Die, reason: string) => number;

export const CHANCE_MIN = 1; // heaven never fully closes the door…
export const CHANCE_MAX = 95; // …and never fully opens it. Drama, always.

export const HEART_DEMON_PASS_BONUS = 5;
export const HEART_DEMON_FAIL_PENALTY = -15;

export const BOTTLENECK_FLAG = 'bottleneck';
export const FAIL_STREAK_FLAG = 'breakthroughFailStreak';
/** Consumable one-shot bonus parked on flags by items/events (筑基丹 etc.). */
export const PILL_BONUS_FLAG = 'breakthroughPillBonus';

export interface BreakthroughContext {
  realm: RealmState;
  attributes: Attributes;
  injuries: Injury[];
  flags: Record<string, boolean | number>;
  hp: number;
  maxHp: number;
  /** explicit pill bonus; falls back to flags[PILL_BONUS_FLAG] when omitted */
  pillBonus?: number;
}

export interface ChanceParts {
  target: RealmId;
  targetName: string;
  base: number;
  attributeBonus: number; // 根骨×2 + 心性
  pillBonus: number;
  injuryPenalty: number;
  bottlenecked: boolean;
  /** final chance before any 心魔劫 adjustment, clamped 1–95 */
  chance: number;
}

export interface HeartDemonTrial {
  dc: number;
  roll: number; // the D20
  total: number; // D20 + 心性
  passed: boolean;
  adjustment: number; // +5 or −15 applied to the chance
}

export interface BreakthroughResult {
  attempted: boolean; // false when not at a major gate (no rolls consumed)
  success: boolean;
  died: boolean;
  nearMiss: boolean; // failed by ≤ 5 — agonizingly close
  chance: number; // final clamped chance the D100 was measured against
  rollValue: number; // the main D100 (0 when not attempted)
  target: RealmId | null;
  heartDemon: HeartDemonTrial | null;
  realm: RealmState; // updated realm state
  lifespan: number; // absolute 寿元 after the attempt
  expLost: number;
  injury: Injury | null; // new injury (already includes 耐苦 reduction)
  hpAfter: number;
  flags: Record<string, boolean | number>; // updated copy (streak / bottleneck)
  endingId: EndingId | null; // 'breakthroughDeath' when the attempt kills
  logs: string[];
}

// ============================================================================
// chance formula
// ============================================================================

/** Whether a 突破 may be attempted from this realm state. */
export function canAttemptBreakthrough(rs: RealmState): { ok: boolean; target: RealmId | null; reason?: string } {
  const target = majorGateTarget(rs);
  if (!target) return { ok: false, target: null, reason: '化神之上，非突破可至。静待飞升。' };
  if (!isAtMajorGate(rs)) return { ok: false, target, reason: '灵力未满，强突无益。且去修炼。' };
  return { ok: true, target };
}

/** Chance breakdown (before the 心魔劫 adjustment) — also used by the UI. */
export function breakthroughChanceParts(ctx: BreakthroughContext): ChanceParts {
  const target = majorGateTarget(ctx.realm) ?? ctx.realm.realm;
  const def = normalizedRealmDef(target);
  const base = breakthroughBaseChanceInto(target);
  const attributeBonus = breakthroughAttributeBonus(ctx.attributes);
  const flagPill = typeof ctx.flags[PILL_BONUS_FLAG] === 'number' ? (ctx.flags[PILL_BONUS_FLAG] as number) : 0;
  const pillBonus = ctx.pillBonus ?? flagPill;
  const injuryPenalty = injuryBreakthroughPenalty(ctx.injuries);
  const bottlenecked = ctx.flags[BOTTLENECK_FLAG] === true;

  let chance = base + attributeBonus + pillBonus - injuryPenalty;
  if (bottlenecked) chance = chance / 2;
  chance = Math.max(CHANCE_MIN, Math.min(CHANCE_MAX, Math.round(chance)));

  return { target, targetName: def.name, base, attributeBonus, pillBonus, injuryPenalty, bottlenecked, chance };
}

// ============================================================================
// pure core
// ============================================================================

function successLines(target: RealmId, rollValue: number, chance: number, label: string, lifespan: number): string[] {
  const def = normalizedRealmDef(target);
  const closers = ['天数在汝。', '关隘，破了。', '天不留难。'] as const;
  const lines = [`掷骰：D100 = ${rollValue}，所需 ≤ ${chance}。${closers[rollValue % closers.length] ?? closers[0]}`];
  lines.push(def.narrative.success ?? `霞光贯体，脱胎换骨。臻至${label}，寿元${lifespan}载。`);
  if (target !== 'qi') lines.push(`今为${label}。寿元随之而涨，至${lifespan}载。`);
  return lines;
}

function buildInjury(target: RealmId, heartDemon: boolean, hardy: boolean): Injury {
  const tier = realmTier(target);
  const severity = Math.max(1, Math.min(3, tier - 1)) as 1 | 2 | 3;
  const turns = Math.max(1, 4 + severity * 2 - (hardy ? 1 : 0));
  if (heartDemon) {
    return {
      id: `xinmo_${target}`,
      name: '心魔缠身',
      severity,
      turnsLeft: turns,
      effect: { speed: -(0.1 + severity * 0.1), breakthrough: -(0.05 * severity) },
    };
  }
  return {
    id: `jingmai_${target}`,
    name: '经脉受损',
    severity,
    turnsLeft: turns,
    effect: { speed: -(severity * 0.1), breakthrough: -(0.03 * severity) },
  };
}

/**
 * PURE core: attempt the 突破 with injected dice. Returns everything a
 * caller needs to update the Character. Inputs are never mutated.
 */
export function resolveBreakthrough(ctx: BreakthroughContext, roll: RollFn): BreakthroughResult {
  const gate = canAttemptBreakthrough(ctx.realm);
  if (!gate.ok || !gate.target) {
    return {
      attempted: false,
      success: false,
      died: false,
      nearMiss: false,
      chance: 0,
      rollValue: 0,
      target: gate.target,
      heartDemon: null,
      realm: ctx.realm,
      lifespan: lifespanFor(ctx.realm.realm),
      expLost: 0,
      injury: null,
      hpAfter: ctx.hp,
      flags: { ...ctx.flags },
      endingId: null,
      logs: [gate.reason ?? '此路不通。'],
    };
  }

  const target = gate.target;
  const def = normalizedRealmDef(target);
  const logs: string[] = ['汝闭死关，孤注一掷。天地屏息，骰子已在天道指间。'];

  // --- 心魔劫: heart-demon trial guarding 金丹/元婴/化神 ---
  let heartDemon: HeartDemonTrial | null = null;
  if (def.heartDemonDC > 0) {
    const d20 = roll('D20', `心魔劫·${def.name}`);
    const total = d20 + heartDemonResistance(ctx.attributes.xinXing);
    const passed = total >= def.heartDemonDC;
    heartDemon = {
      dc: def.heartDemonDC,
      roll: d20,
      total,
      passed,
      adjustment: passed ? HEART_DEMON_PASS_BONUS : HEART_DEMON_FAIL_PENALTY,
    };
    logs.push(
      passed
        ? `心魔现于识海，千相万态。汝道心澄明，一念斩之。（D20 = ${d20}，合心性 ${total}，须 ≥ ${def.heartDemonDC}）`
        : `心魔自幽暗中来，撼汝道基。汝心有隙——魔念入体。（D20 = ${d20}，合心性 ${total}，须 ≥ ${def.heartDemonDC}）`
    );
  }

  // --- final chance ---
  const parts = breakthroughChanceParts(ctx);
  let chance = parts.chance + (heartDemon?.adjustment ?? 0);
  chance = Math.max(CHANCE_MIN, Math.min(CHANCE_MAX, Math.round(chance)));
  if (parts.bottlenecked) logs.push('瓶颈如枷，此关比往日更险。');

  // --- the D100 ---
  const main = roll('D100', `突破·${def.name}`);
  const flags = { ...ctx.flags };

  if (main <= chance) {
    // ============ SUCCESS ============
    const realm = enterRealm(target);
    const lifespan = lifespanFor(target);
    delete flags[BOTTLENECK_FLAG];
    delete flags[FAIL_STREAK_FLAG];
    delete flags[PILL_BONUS_FLAG]; // one-shot pill bonus consumed
    logs.push(...successLines(target, main, chance, realmLabelOf(realm), lifespan));
    return {
      attempted: true,
      success: true,
      died: false,
      nearMiss: false,
      chance,
      rollValue: main,
      target,
      heartDemon,
      realm,
      lifespan,
      expLost: 0,
      injury: null,
      hpAfter: ctx.maxHp, // 洗筋伐髓 — a breakthrough fully restores the body
      flags,
      endingId: null,
      logs,
    };
  }

  // ============ FAILURE ============
  const penalty = failurePenaltyInto(target);
  const nearMiss = main - chance <= 5;
  delete flags[PILL_BONUS_FLAG]; // the pill is spent either way

  // exp burned: uniform within [min, max] % via one audited D100
  const lossRoll = roll('D100', '突破反噬');
  const [lo, hi] = penalty.expLossPct;
  const lossFraction = (lo + ((lossRoll - 1) / 99) * (hi - lo)) / 100;
  const expLost = Math.round(ctx.realm.exp * lossFraction);
  const realm: RealmState = { ...ctx.realm, exp: Math.max(0, ctx.realm.exp - expLost) };

  logs.push(
    nearMiss
      ? `掷骰：D100 = ${main}，所需 ≤ ${chance}。一线之差——气机于最后一刻逆行，功亏一篑。`
      : `掷骰：D100 = ${main}，所需 ≤ ${chance}。${def.narrative.failure ?? '气机逆行，经脉俱震。汝之道，止步于此乎？'}`
  );
  logs.push(`灵力溃散，修为折损${expLost}点。`);

  // death roll (金丹 and beyond carry a real death chance)
  if (penalty.deathChance > 0) {
    const deathRoll = roll('D100', '天劫·生死');
    if (deathRoll <= penalty.deathChance) {
      logs.push(def.narrative.death ?? '气逆冲脉，道基崩碎。走火入魔——身死道消。');
      return {
        attempted: true,
        success: false,
        died: true,
        nearMiss,
        chance,
        rollValue: main,
        target,
        heartDemon,
        realm,
        lifespan: lifespanFor(ctx.realm.realm),
        expLost,
        injury: null,
        hpAfter: 0,
        flags,
        endingId: 'breakthroughDeath',
        logs,
      };
    }
  }

  // injury: a failed 心魔劫 guarantees 心魔缠身; otherwise roll vs injuryChance
  const hardy = ctx.flags['hardy'] === true;
  let injury: Injury | null = null;
  if (heartDemon && !heartDemon.passed) {
    injury = buildInjury(target, true, hardy);
    logs.push('魔念滞留识海，挥之不去。汝染心魔之伤。');
  } else {
    const injuryRoll = roll('D100', '突破余伤');
    if (injuryRoll <= penalty.injuryChance) {
      injury = buildInjury(target, false, hardy);
      logs.push('经脉多处震裂，行功如针刺。');
    }
  }

  // bottleneck after 2 consecutive failures
  const prevStreak = typeof flags[FAIL_STREAK_FLAG] === 'number' ? (flags[FAIL_STREAK_FLAG] as number) : 0;
  const streak = prevStreak + 1;
  flags[FAIL_STREAK_FLAG] = streak;
  if (streak >= 2 && flags[BOTTLENECK_FLAG] !== true) {
    flags[BOTTLENECK_FLAG] = true;
    logs.push('两番受挫，心关渐固——瓶颈已生。丹药或机缘，或可破之。');
  }

  return {
    attempted: true,
    success: false,
    died: false,
    nearMiss,
    chance,
    rollValue: main,
    target,
    heartDemon,
    realm,
    lifespan: lifespanFor(ctx.realm.realm),
    expLost,
    injury,
    hpAfter: Math.max(1, Math.round(ctx.hp * 0.5)),
    flags,
    endingId: null,
    logs,
  };
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

/** Audited dice against the live state (same trail shape as audit.recordRoll). */
function rollDice(state: GameState, die: Die, reason: string): number {
  const seedState = state.rngState;
  const { value, state: next } = rollDie(state.rngState, die);
  state.rngState = next;
  state.rollSeq = (state.rollSeq ?? 0) + 1;
  const id = state.nextRollId ?? (state.rolls[state.rolls.length - 1]?.id ?? 0) + 1;
  state.nextRollId = id + 1;
  state.rolls.push({ id, turn: state.turn, die, value, reason, seedState });
  if (state.rolls.length > ROLL_CAP) state.rolls.splice(0, state.rolls.length - ROLL_CAP);
  if (state.stats) state.stats.totalRolls += 1;
  return value;
}

function contextOf(state: GameState): BreakthroughContext | null {
  const c = state.character;
  if (!c) return null;
  return {
    realm: c.realm,
    attributes: c.attributes,
    injuries: c.injuries,
    flags: c.flags,
    hp: c.hp,
    maxHp: c.maxHp,
    pillBonus:
      (c.breakthroughBonus ?? 0) +
      (typeof c.flags[PILL_BONUS_FLAG] === 'number' ? (c.flags[PILL_BONUS_FLAG] as number) : 0),
  };
}

/** Chance preview for the panel / breakthrough modal. Null when no character. */
export function breakthroughChance(state: GameState): ChanceParts | null {
  const ctx = contextOf(state);
  return ctx ? breakthroughChanceParts(ctx) : null;
}

/**
 * Execute the 突破 command against the (turn-local) state: rolls audited
 * dice, applies all fallout to the character, and seals the run on death.
 */
export function attemptBreakthrough(state: GameState): { notices: Notice[]; outcome: BreakthroughResult } {
  const c = state.character;
  const ctx = contextOf(state);
  if (!c || !ctx || state.phase !== 'playing') {
    const idle = resolveBreakthrough(
      ctx ?? {
        realm: { realm: 'mortal', qiLayer: 0, stage: '初期', exp: 0, expNeeded: 1 },
        attributes: { genGu: 0, wuXing: 0, xinXing: 0, jiYuan: 0, qiYun: 0 },
        injuries: [],
        flags: {},
        hp: 1,
        maxHp: 1,
      },
      () => 1
    );
    return { notices: [], outcome: { ...idle, attempted: false } };
  }

  const outcome = resolveBreakthrough(ctx, (die, reason) => rollDice(state, die, reason));
  const notices: Notice[] = [];

  if (!outcome.attempted) {
    for (const line of outcome.logs) log(state, '天道', line, 'muted');
    return { notices, outcome };
  }

  // consume the one-shot pill bonus regardless of the result
  c.breakthroughBonus = 0;
  if (PILL_BONUS_FLAG in c.flags) delete c.flags[PILL_BONUS_FLAG];

  c.realm = outcome.realm;
  c.flags = { ...outcome.flags }; // resolveBreakthrough returns the full updated flag set

  if (outcome.success) {
    c.lifespan = outcome.lifespan;
    c.maxHp = deriveMaxHp(c);
    c.hp = c.maxHp; // 洗筋伐髓
    const label = realmLabelOf(c.realm);
    if (state.stats) state.stats.peakRealmLabel = label;
    for (const line of outcome.logs) log(state, '天道', line, 'gold');
    notices.push({ kind: 'gold', title: '突破成功', desc: label });
    return { notices, outcome };
  }

  // failure
  if (state.stats) state.stats.breakthroughsFailed += 1;
  for (const line of outcome.logs) log(state, '天道', line, outcome.died ? 'danger' : 'normal');

  if (outcome.died) {
    c.hp = 0;
    finishGame(state, 'breakthroughDeath');
    notices.push({ kind: 'danger', title: '身死道消', desc: '强突天关，气逆焚身。' });
    return { notices, outcome };
  }

  c.hp = outcome.hpAfter;
  if (outcome.injury) {
    c.injuries = [...c.injuries, outcome.injury];
    notices.push({ kind: 'warning', title: outcome.injury.name, desc: '伤势将拖累修行与再突破。' });
  }
  notices.push({
    kind: 'danger',
    title: outcome.nearMiss ? '一线之差' : '突破失败',
    desc: `修为折损${outcome.expLost}点。`,
  });
  return { notices, outcome };
}
