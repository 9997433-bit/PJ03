/**
 * cultivation.ts — 修炼 (progress, and what progress costs)
 *
 * Layers inside 引气 and stages inside 窥命 and above fill by themselves; only
 * crossing a realm boundary needs 突破. So a 修炼 turn is a single number —
 * `cultivationGain` — poured into `advanceProgress`, which spills over as many
 * layers as the pour is worth and then stops dead at the realm ceiling.
 *
 * The interesting rule is the one at the bottom: past 阴云, sitting still is
 * itself dangerous. 走火入魔 checks against the *calamity* meter, which means
 * the safe answer to a rising 劫运 is never "just cultivate through it".
 */

import { realmDef } from '@/data/realms';
import { STAGES } from '@/data/realms';
import { derive } from './derived';
import { roll } from './rng';
import type { GameState, LogEntry, RealmState, Stage } from './types';
import { adjustCalamity, clamp, entry } from './util';

/** Exp required to fill the character's *current* layer or stage. */
export function expNeededFor(realm: RealmState): number {
  const rd = realmDef(realm.realm);
  if (rd.layers) {
    return Math.round(rd.baseExp * Math.pow(rd.expGrowth, Math.max(0, realm.layer - 1)));
  }
  if (rd.stages) {
    const idx = STAGES.indexOf(realm.stage);
    return Math.round(rd.baseExp * Math.pow(rd.expGrowth, Math.max(0, idx)));
  }
  return rd.baseExp;
}

/** True when the character sits at the top of their realm with a full bar. */
export function atRealmCeiling(realm: RealmState): boolean {
  const rd = realmDef(realm.realm);
  if (rd.layers) return realm.layer >= rd.layers;
  if (rd.stages) return realm.stage === '圆满';
  return true;
}

export function isReadyForBreakthrough(realm: RealmState): boolean {
  return atRealmCeiling(realm) && realm.exp >= realm.expNeeded;
}

export function realmLabel(realm: RealmState): string {
  const rd = realmDef(realm.realm);
  if (rd.layers) return `${rd.name}${realm.layer}层`;
  if (rd.stages) return `${rd.name}·${realm.stage}`;
  return rd.name;
}

/** Base exp a plain 修炼 turn yields, before nothing — this is the final figure. */
export function cultivationGain(state: GameState): number {
  const c = state.character!;
  const rd = realmDef(c.realm.realm);
  const d = derive(c);
  return Math.max(1, Math.round(rd.cultivationBase * d.cultivationMult));
}

/**
 * Pour exp in, spilling through layers/stages. Returns the labels crossed so
 * the narrator can report each one.
 */
export function advanceProgress(state: GameState, amount: number): string[] {
  const c = state.character!;
  const crossed: string[] = [];
  c.realm.exp += Math.round(amount);
  if (c.realm.exp < 0) c.realm.exp = 0;

  let guard = 0;
  while (c.realm.exp >= c.realm.expNeeded && guard++ < 64) {
    if (atRealmCeiling(c.realm)) {
      c.realm.exp = c.realm.expNeeded;
      break;
    }
    c.realm.exp -= c.realm.expNeeded;
    const rd = realmDef(c.realm.realm);
    if (rd.layers) {
      c.realm.layer += 1;
    } else if (rd.stages) {
      const idx = STAGES.indexOf(c.realm.stage);
      c.realm.stage = (STAGES[Math.min(STAGES.length - 1, idx + 1)] ?? '圆满') as Stage;
    }
    c.realm.expNeeded = expNeededFor(c.realm);
    crossed.push(realmLabel(c.realm));
  }
  c.realm.exp = clamp(c.realm.exp, 0, c.realm.expNeeded);
  return crossed;
}

/**
 * The 修炼 command body. Mutates the turn-local draft and returns narration;
 * `turn.ts` owns the clone, the invariants and the commit.
 */
export function cultivate(state: GameState): LogEntry[] {
  const c = state.character!;
  const out: LogEntry[] = [];
  const gain = cultivationGain(state);

  // 走火入魔 — the risk of sitting still while the meter climbs.
  if (c.calamity.value >= 55) {
    const d100 = roll(state, 'D100', '修炼·气机逆转');
    const threshold = Math.round((c.calamity.value - 52) * 0.9);
    if (d100 <= threshold) {
      const loss = Math.round(c.realm.exp * 0.35 + gain);
      const hpLoss = Math.round(c.maxHp * 0.3);
      c.realm.exp = Math.max(0, c.realm.exp - loss);
      c.hp = Math.max(0, c.hp - hpLoss);
      adjustCalamity(state, 3);
      out.push(
        entry(
          state.turn,
          '劫',
          `气行至第三周天,忽然不听使唤了(D100=${d100} ≤ ${threshold})。走火:折修为 ${loss},损气血 ${hpLoss}。`,
          'danger',
        ),
      );
      if (c.hp <= 0) {
        c.flags.zouhuoFatal = true;
      }
      return out;
    }
  }

  const crossed = advanceProgress(state, gain);
  const d = derive(c);
  c.mana = clamp(c.mana + Math.round(d.maxMana * 0.25), 0, d.maxMana);
  out.push(entry(state.turn, '系统', `静坐一载,得修为 ${gain}。`, 'normal'));
  for (const label of crossed) {
    out.push(entry(state.turn, '图录', `境界进:${label}。`, 'violet'));
  }
  if (isReadyForBreakthrough(c.realm)) {
    out.push(entry(state.turn, '天机', '此关已满。再坐无益,当破。', 'calm'));
  }
  return out;
}

/** 闭关 — three years of exp in one command, at the price of a fatter 劫运 bill. */
export function seclude(state: GameState): LogEntry[] {
  const c = state.character!;
  const gain = cultivationGain(state) * 3;
  const crossed = advanceProgress(state, gain);
  adjustCalamity(state, 4);
  c.hp = Math.max(1, c.hp - Math.round(c.maxHp * 0.1));
  const out = [
    entry(state.turn, '系统', `闭死关三载,得修为 ${gain};出关时枯瘦如柴。劫运 +4。`, 'normal'),
  ];
  for (const label of crossed) out.push(entry(state.turn, '图录', `境界进:${label}。`, 'violet'));
  return out;
}
