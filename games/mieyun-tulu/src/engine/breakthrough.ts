/**
 * breakthrough.ts — 突破
 *
 * One D100 against a target the player can read before committing:
 *
 *   target = 下境基数 + 定力/丹药/功法加成 + 气运×0.25 − 劫运×0.4
 *
 * 气运 helps and 劫运 hurts, which is the whole tension of the game compressed
 * into a single line: the deeds that raise your odds of crossing also raise the
 * meter that lowers them, and the crossing itself is the single largest 劫运
 * deposit in the game.
 *
 * Failure is graded by the realm being entered — 玄光 upward can kill outright.
 */

import { INJURIES } from '@/data/calamities';
import { nextRealm, realmDef } from '@/data/realms';
import { expNeededFor, isReadyForBreakthrough, realmLabel } from './cultivation';
import { derive, lifespanFor } from './derived';
import { roll } from './rng';
import type { GameState, Injury, LogEntry } from './types';
import { clamp, entry } from './util';

export interface BreakthroughOdds {
  ready: boolean;
  targetRealm: string | null;
  /** D100 target, 3–97. */
  chance: number;
  base: number;
  bonus: number;
  fortunePart: number;
  calamityPart: number;
  failure: { expLoss: number; injuryChance: number; deathChance: number };
  calamityOnEntry: number;
}

export function breakthroughOdds(state: GameState): BreakthroughOdds {
  const c = state.character!;
  const target = nextRealm(c.realm.realm);
  const d = derive(c);
  const base = target?.breakthroughBase ?? 0;
  const bonus = Math.round(d.breakthroughBonus);
  const fortunePart = Math.round(c.fortune * 0.25);
  const calamityPart = -Math.round(c.calamity.value * 0.4);
  const chance = clamp(base + bonus + fortunePart + calamityPart, 3, 97);
  return {
    ready: isReadyForBreakthrough(c.realm) && target !== null,
    targetRealm: target?.name ?? null,
    chance,
    base,
    bonus,
    fortunePart,
    calamityPart,
    failure: target?.failure ?? { expLoss: 0, injuryChance: 0, deathChance: 0 },
    calamityOnEntry: target?.calamityOnEntry ?? 0,
  };
}

function pickInjury(state: GameState, severityCap: number): Injury {
  const pool = INJURIES.filter((i) => i.severity <= severityCap);
  const idx = roll(state, 'D6', '破关·伤势') % pool.length;
  const def = pool[idx] ?? INJURIES[0]!;
  return {
    id: def.id,
    name: def.name,
    severity: def.severity,
    turnsLeft: def.turns,
    effect: { ...def.effect },
  };
}

export function attemptBreakthrough(state: GameState): LogEntry[] {
  const c = state.character!;
  const out: LogEntry[] = [];
  const odds = breakthroughOdds(state);
  const target = nextRealm(c.realm.realm);
  if (!target || !odds.ready) {
    out.push(entry(state.turn, '天机', '此关未满,破亦无门。', 'calm'));
    return out;
  }

  const d100 = roll(state, 'D100', `突破·${target.name}`);
  c.breakthroughBuff = 0;
  out.push(
    entry(
      state.turn,
      '系统',
      `破关 ${target.name}:需 D100 ≤ ${odds.chance}(基 ${odds.base} + 加 ${odds.bonus} + 气运 ${odds.fortunePart} − 劫运 ${-odds.calamityPart}),掷得 ${d100}。`,
      'normal',
    ),
  );

  if (d100 <= odds.chance) {
    c.realm.realm = target.id;
    c.realm.layer = target.layers ? 1 : 0;
    c.realm.stage = '初期';
    c.realm.exp = 0;
    c.realm.expNeeded = expNeededFor(c.realm);
    c.lifespan = lifespanFor(c);

    const d = derive(c);
    c.maxHp = d.maxHp;
    c.maxMana = d.maxMana;
    c.hp = d.maxHp;
    c.mana = d.maxMana;

    const gain = Math.round(target.calamityOnEntry * d.calamityRate);
    c.calamity.value = clamp(c.calamity.value + gain, 0, 100);
    c.fortune = clamp(c.fortune + Math.round(4 * d.fortuneGainMult), 0, 100);

    if (realmDef(c.realm.realm).order > realmDef(state.stats.peakRealm).order) {
      state.stats.peakRealm = c.realm.realm;
      state.stats.peakRealmLabel = realmLabel(c.realm);
    }

    out.push(entry(state.turn, '图录', `破关成:${realmLabel(c.realm)}。${target.desc}`, 'gold'));
    out.push(
      entry(
        state.turn,
        '劫',
        `天目为之一转。劫运 +${gain},此为登高之资,亦为登高之债。`,
        'danger',
      ),
    );
    return out;
  }

  // ---- 失手 ---------------------------------------------------------------
  const f = target.failure;
  const lost = Math.round(c.realm.exp * f.expLoss);
  c.realm.exp = Math.max(0, c.realm.exp - lost);
  c.calamity.value = clamp(c.calamity.value + 3, 0, 100);
  out.push(entry(state.turn, '系统', `破关失手:折修为 ${lost},劫运 +3。`, 'danger'));

  if (f.deathChance > 0) {
    const death = roll(state, 'D100', '破关·生死');
    if (death <= f.deathChance) {
      c.hp = 0;
      c.flags.breakFatal = true;
      out.push(entry(state.turn, '劫', `气机崩于关中(D100=${death} ≤ ${f.deathChance})。`, 'danger'));
      return out;
    }
  }
  if (f.injuryChance > 0) {
    const injRoll = roll(state, 'D100', '破关·受创');
    if (injRoll <= f.injuryChance) {
      const injury = pickInjury(state, target.order >= 3 ? 3 : 2);
      c.injuries.push(injury);
      c.hp = Math.max(1, c.hp - Math.round(c.maxHp * 0.25));
      out.push(entry(state.turn, '系统', `反噬入体:${injury.name}(${injury.turnsLeft} 载)。`, 'danger'));
    }
  }
  return out;
}
