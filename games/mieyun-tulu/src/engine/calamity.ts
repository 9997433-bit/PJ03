/**
 * calamity.ts — 劫运 (the signature system)
 *
 * Three moving parts, evaluated in this order at the head of every turn:
 *
 *   1. **积累** — 劫运 rises on its own, faster the higher you have climbed and
 *      the brighter your 气运 burns. Nothing you do is free.
 *   2. **判定** — one audited D100 against `strikeThreshold(value)`. This is
 *      deliberately the *first* roll of the turn, which is what lets 推演命数
 *      make an honest promise about whether the sky falls next year.
 *   3. **落劫** — the tier decides the menu, an audited weighted pick chooses
 *      the dish. A strike either resolves as damage or spawns a fight; either
 *      way it *vents* the meter, so surviving a 劫 is the cheap way down.
 *
 * The expensive way down is 化解劫运: five mitigations, each with published
 * odds and a real price in 功德 / 玄晶 / 气运. 主动应劫 is the strange one — it
 * buys nothing and instead pulls the strike forward, on the theory that a
 * tribulation you scheduled is easier than one that picks its own moment.
 */

import {
  MITIGATIONS,
  strikesForTier,
  tierOf,
  TIER_OMEN,
  INJURY_BY_ID,
  mitigationById,
} from '@/data/calamities';
import { enemyById } from '@/data/enemies';
import { realmDef } from '@/data/realms';
import { derive } from './derived';
import { creditDeed } from './progression';
import { roll, weightedPick } from './rng';
import type {
  CalamityStrike,
  CalamityTier,
  GameState,
  Injury,
  LogEntry,
  MitigationId,
} from './types';
import { adjustCalamity, clamp, countItem, entry, removeItem, round1 } from './util';

// ============================================================================
// 积累
// ============================================================================

/** Passive 劫运 gained at the end of a turn, before the meter is clamped. */
export function calamityAccrual(state: GameState): number {
  const c = state.character!;
  const order = realmDef(c.realm.realm).order;
  const d = derive(c);
  const base = 0.5 + order * 0.4 + c.fortune * 0.022 + c.extinguishCount * 0.06;
  return round1(base * d.calamityRate);
}

/** The D100 target a 劫运判定 must roll under for the sky to open. */
export function strikeThreshold(value: number): number {
  if (value < 25) return 0;
  const linear = (value - 24) * 0.72;
  const surcharge = value >= 80 ? (value - 80) * 1.6 : 0;
  return clamp(Math.round(linear + surcharge), 0, 98);
}

export function calamityTier(state: GameState): CalamityTier {
  return tierOf(state.character!.calamity.value);
}

export function calamityOmen(state: GameState): string {
  return TIER_OMEN[calamityTier(state)];
}

// ============================================================================
// 落劫
// ============================================================================

function makeInjury(id: string): Injury | null {
  const def = INJURY_BY_ID[id];
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    severity: def.severity,
    turnsLeft: def.turns,
    effect: { ...def.effect },
  };
}

/** Pick which shape the bill takes. Audited, so a replay lands on the same 劫. */
export function drawStrike(state: GameState, tier: CalamityTier): CalamityStrike | null {
  const pool = strikesForTier(tier).filter((s) => {
    if (s.kind === '心魔' && state.character!.flags.hunWard) return false;
    return true;
  });
  if (pool.length === 0) return null;
  return weightedPick(state, pool, (s) => 6 - s.severity + 1, `劫数·抽取〔${tier}〕`);
}

/**
 * Apply a strike. Damage-only strikes settle here; strikes with an `enemyId`
 * hand off to combat and vent when that fight resolves.
 */
export function resolveStrike(
  state: GameState,
  strike: CalamityStrike,
  ventMultiplier = 1,
): LogEntry[] {
  const c = state.character!;
  const out: LogEntry[] = [];
  out.push(entry(state.turn, '劫', `【${strike.name}】${strike.narrative}`, 'danger'));

  if (c.flags.jieWard) {
    delete c.flags.jieWard;
    const vented = Math.round(strike.vent * 0.6);
    adjustCalamity(state, -vented);
    c.calamity.dissolved += 1;
    state.stats.calamitiesDissolved += 1;
    out.push(
      entry(state.turn, '系统', `定劫符碎裂,替你受了这一记。劫运 −${vented}。`, 'violet'),
    );
    return out;
  }

  if (strike.enemyId) {
    const enemy = enemyById(strike.enemyId);
    if (enemy) {
      state.combat = {
        enemyId: enemy.id,
        enemyHp: enemy.hp,
        enemyMaxHp: enemy.hp,
        round: 1,
        log: [enemy.taunt],
        over: false,
        awaitingSpoils: false,
        source: 'calamity',
        vent: Math.round(strike.vent * ventMultiplier),
      };
      state.phase = 'combat';
      c.flags.pendingStrike = strike.id;
      out.push(entry(state.turn, '斗法', `${enemy.name}挡在前面。躲不过,只能打。`, 'danger'));
      return out;
    }
  }

  const d = derive(c);
  const soften = clamp(1 - d.mitigationBonus / 220 - c.merit / 2400, 0.4, 1);

  if (strike.hpLossPct) {
    const loss = Math.round(c.maxHp * strike.hpLossPct * soften);
    c.hp = Math.max(0, c.hp - loss);
    out.push(entry(state.turn, '系统', `气血 −${loss}。`, 'danger'));
  }
  if (strike.expLossPct) {
    const loss = Math.round(c.realm.exp * strike.expLossPct * soften);
    c.realm.exp = Math.max(0, c.realm.exp - loss);
    out.push(entry(state.turn, '系统', `修为 −${loss}。`, 'danger'));
  }
  if (strike.stoneLossPct) {
    const loss = Math.round(c.spiritStones * strike.stoneLossPct * soften);
    c.spiritStones = Math.max(0, c.spiritStones - loss);
    out.push(entry(state.turn, '系统', `玄晶 −${loss}。`, 'danger'));
  }
  if (strike.fortuneLoss) {
    const loss = Math.round(strike.fortuneLoss * soften);
    c.fortune = clamp(c.fortune - loss, 0, 100);
    out.push(entry(state.turn, '系统', `气运 −${loss}。`, 'danger'));
  }
  if (strike.reputationLoss) {
    c.reputation = Math.max(0, c.reputation - strike.reputationLoss);
  }
  if (strike.injuryId) {
    const injury = makeInjury(strike.injuryId);
    if (injury && !c.injuries.some((i) => i.id === injury.id)) {
      c.injuries.push(injury);
      out.push(entry(state.turn, '系统', `伤势:${injury.name}(${injury.turnsLeft} 载)。`, 'danger'));
    }
  }

  const vent = Math.round(strike.vent * ventMultiplier);
  adjustCalamity(state, -vent);
  c.calamity.survived += 1;
  state.stats.calamitiesSurvived += 1;
  out.push(entry(state.turn, '劫', `此劫已过。劫运 −${vent}。`, 'violet'));

  if (state.character!.fateId === 'yinghuo') {
    const bonus = Math.round(state.character!.realm.expNeeded * 0.06);
    state.character!.realm.exp = Math.min(
      state.character!.realm.expNeeded,
      state.character!.realm.exp + bonus,
    );
    out.push(entry(state.turn, '图录', `荧惑守心:劫中悟道,修为 +${bonus}。`, 'violet'));
  }
  return out;
}

/** Head-of-turn accrual plus the strike check. Returns narration. */
export function calamityPhase(state: GameState): LogEntry[] {
  const c = state.character!;
  const out: LogEntry[] = [];

  const gained = calamityAccrual(state);
  c.calamity.value = clamp(round1(c.calamity.value + gained), 0, 100);
  c.calamity.peak = Math.max(c.calamity.peak, c.calamity.value);
  state.stats.peakCalamity = Math.max(state.stats.peakCalamity, c.calamity.value);

  const tier = tierOf(c.calamity.value);
  c.calamity.streak = tier === '雷动' || tier === '天诛' ? c.calamity.streak + 1 : 0;

  const threshold = strikeThreshold(c.calamity.value);
  if (threshold <= 0) return out;

  const d100 = roll(state, 'D100', '劫运判定');
  if (d100 > threshold) return out;

  out.push(
    entry(state.turn, '劫', `劫运判定:D100=${d100} ≤ ${threshold}。天开了一线。`, 'danger'),
  );
  const strike = drawStrike(state, tier);
  if (!strike) return out;
  out.push(...resolveStrike(state, strike));
  return out;
}

// ============================================================================
// 化解劫运
// ============================================================================

export interface MitigationOption {
  id: MitigationId;
  name: string;
  desc: string;
  costLabel: string;
  relief: number;
  /** Published D100 target, 5–95. `null` for 主动应劫, which never fails. */
  chance: number | null;
  affordable: boolean;
  reason: string | null;
}

export function mitigationChance(state: GameState, id: MitigationId): number {
  const c = state.character!;
  const def = mitigationById(id);
  if (!def) return 0;
  if (id === 'yingJie') return 100;
  const d = derive(c);
  return clamp(Math.round(def.baseChance + d.mitigationBonus - c.calamity.value * 0.25), 5, 95);
}

function costLabelOf(id: MitigationId): string {
  const def = mitigationById(id)!;
  const parts: string[] = [];
  if (def.cost.merit) parts.push(`功德 ${def.cost.merit}`);
  if (def.cost.stones) parts.push(`玄晶 ${def.cost.stones}`);
  if (def.cost.fortune) parts.push(`气运 ${def.cost.fortune}`);
  if (def.cost.itemId) parts.push(`蔽运符 ×1`);
  return parts.length > 0 ? parts.join(' · ') : '无耗';
}

export function mitigationOptions(state: GameState): MitigationOption[] {
  const c = state.character!;
  return MITIGATIONS.map((def) => {
    let affordable = true;
    let reason: string | null = null;
    if (def.cost.merit && c.merit < def.cost.merit) {
      affordable = false;
      reason = '功德不足';
    }
    if (def.cost.stones && c.spiritStones < def.cost.stones) {
      affordable = false;
      reason = '玄晶不足';
    }
    if (def.cost.fortune && c.fortune < def.cost.fortune) {
      affordable = false;
      reason = '气运不足';
    }
    if (def.cost.itemId && countItem(c.inventory, def.cost.itemId) < 1) {
      affordable = false;
      reason = '缺蔽运符';
    }
    if (def.id === 'yingJie' && c.calamity.value < 20) {
      affordable = false;
      reason = '劫运未足,无劫可应';
    }
    return {
      id: def.id,
      name: def.name,
      desc: def.desc,
      costLabel: costLabelOf(def.id),
      relief: def.relief,
      chance: def.id === 'yingJie' ? null : mitigationChance(state, def.id),
      affordable,
      reason,
    };
  });
}

export function dissolveCalamity(state: GameState, id: MitigationId): LogEntry[] {
  const c = state.character!;
  const def = mitigationById(id);
  const out: LogEntry[] = [];
  if (!def) {
    out.push(entry(state.turn, '系统', '无此化解之法。', 'danger'));
    return out;
  }

  if (def.cost.merit) c.merit -= def.cost.merit;
  if (def.cost.stones) c.spiritStones -= def.cost.stones;
  if (def.cost.fortune) c.fortune = clamp(c.fortune - def.cost.fortune, 0, 100);
  if (def.cost.itemId) removeItem(c.inventory, def.cost.itemId, 1);

  if (id === 'yingJie') {
    out.push(entry(state.turn, '天机', '你自己走到了云下面,抬头等着。', 'calm'));
    const tier = tierOf(c.calamity.value);
    const strike = drawStrike(state, tier);
    if (strike) {
      out.push(...resolveStrike(state, strike, 1.6));
      c.flags.yingJieCount = (Number(c.flags.yingJieCount) || 0) + 1;
    }
    return out;
  }

  const target = mitigationChance(state, id);
  const d100 = roll(state, 'D100', `化解·${def.name}`);
  out.push(
    entry(state.turn, '系统', `${def.name}:需 D100 ≤ ${target},掷得 ${d100}。`, 'normal'),
  );
  if (d100 <= target) {
    adjustCalamity(state, -def.relief);
    c.calamity.dissolved += 1;
    state.stats.calamitiesDissolved += 1;
    out.push(entry(state.turn, '劫', `化解成:劫运 −${def.relief}。`, 'violet'));
    out.push(...creditDeed(state, 'calamity'));
  } else {
    adjustCalamity(state, 2);
    out.push(entry(state.turn, '劫', '化解不成。做过的事,不是散点财就能抹掉的。劫运 +2。', 'danger'));
  }
  return out;
}
