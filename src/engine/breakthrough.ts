import type { GameState, Notice, RealmId } from './types';
import { expNeededFor, getRealmDef, nextRealm, realmLabel } from '@/data/realmData';
import { roll, rollRange } from './rng';
import { atBreakthroughGate } from './cultivation';
import { maxHpFor } from './attributes';
import { inflictInjury } from './inventory';
import { log, LINES } from './narrative';
import { finishGame } from './lifecycle';

export interface BreakthroughOutcome {
  attempted: boolean;
  success?: boolean;
  died?: boolean;
  targetRealm?: RealmId;
  chance?: number;
  rollValue?: number;
}

/** Compute the current breakthrough chance (for UI display too). */
export function breakthroughChance(state: GameState): { target: RealmId; chance: number } | null {
  const c = state.character!;
  if (!atBreakthroughGate(c)) return null;
  const target = nextRealm(c.realm.realm);
  if (!target) return null;
  const def = getRealmDef(target);
  let chance = def.breakthroughBaseChance + c.attributes.genGu * 2 + c.attributes.xinXing;
  chance += Number(c.flags.pillBreakthroughBonus) || 0;
  if (c.flags.pure_will) chance += 5;
  for (const inj of c.injuries) chance -= inj.effect.breakthrough ?? 0;
  if (c.flags.bottleneck) chance = Math.floor(chance / 2);
  return { target, chance: Math.max(1, Math.min(95, Math.round(chance))) };
}

/** The 突破 command. */
export function attemptBreakthrough(state: GameState): { notices: Notice[]; outcome: BreakthroughOutcome } {
  const c = state.character!;
  const notices: Notice[] = [];
  const gate = breakthroughChance(state);
  if (!gate) {
    log(state, '天道', '修为未至圆满，何谈突破。厚积，方可薄发。', 'muted');
    return { notices, outcome: { attempted: false } };
  }
  const { target, chance } = gate;
  const targetDef = getRealmDef(target);
  const value = roll(state, 'D100', `突破·${targetDef.name}`);
  // pill bonus is consumed either way
  c.flags.pillBreakthroughBonus = 0;

  if (value <= chance) {
    // ===== SUCCESS =====
    c.realm.realm = target;
    if (target === 'qi') {
      c.realm.qiLayer = 1;
      c.realm.stage = '初期';
      c.realm.expNeeded = expNeededFor('qi', 0);
    } else {
      c.realm.qiLayer = 0;
      c.realm.stage = '初期';
      c.realm.expNeeded = expNeededFor(target, 0);
    }
    c.realm.exp = 0;
    c.lifespan = Math.max(c.lifespan, targetDef.lifespan);
    c.maxHp = maxHpFor(c);
    c.hp = c.maxHp;
    c.flags.bottleneck = false;
    c.flags.breakthroughFails = 0;
    const label = realmLabel(c.realm);
    log(state, '天道', LINES.breakthroughSuccess(label), 'gold');
    log(state, '系统', `寿元上限增至${c.lifespan}载。气血尽复。`, 'jade');
    notices.push({ kind: 'success', title: `突破成功 · ${targetDef.name}`, desc: `寿元上限增至${c.lifespan}载` });
    return {
      notices,
      outcome: { attempted: true, success: true, targetRealm: target, chance, rollValue: value },
    };
  }

  // ===== FAILURE =====
  const pen = targetDef.failurePenalty;
  const lossPct = rollRange(state, pen.expLossPct[0], pen.expLossPct[1], '突破失败·修为折损');
  const expLoss = Math.round((c.realm.exp * lossPct) / 100);
  c.realm.exp = Math.max(0, c.realm.exp - expLoss);
  log(state, '天道', LINES.breakthroughFail, 'danger');
  if (expLoss > 0) log(state, '系统', `修为折损${expLoss}点。`, 'danger');

  // death check (金丹 onward)
  if (pen.deathChance > 0) {
    const deathRoll = roll(state, 'D100', '突破失败·生死劫');
    if (deathRoll <= pen.deathChance) {
      log(state, '天道', LINES.breakthroughDeath, 'danger');
      finishGame(state, 'breakthrough_death');
      return {
        notices: [{ kind: 'danger', title: '兵解殒身', desc: '强越天堑者，十死无生。' }],
        outcome: { attempted: true, success: false, died: true, targetRealm: target, chance, rollValue: value },
      };
    }
  }

  // injury check
  if (pen.injuryChance > 0) {
    const injuryRoll = roll(state, 'D100', '突破失败·伤劫');
    if (injuryRoll <= pen.injuryChance) {
      inflictInjury(state, injuryRoll % 2 === 0 ? 'xinmo' : 'jingmai');
    }
  }

  const fails = (Number(c.flags.breakthroughFails) || 0) + 1;
  c.flags.breakthroughFails = fails;
  if (fails >= 2 && !c.flags.bottleneck) {
    c.flags.bottleneck = true;
    log(state, '天道', LINES.bottleneck, 'danger');
    notices.push({ kind: 'warning', title: '陷入瓶颈', desc: '连续失败，突破成功率减半。丹药或机缘可解。' });
  }
  notices.push({ kind: 'warning', title: '突破失败', desc: `修为折损${expLoss}点` });
  return {
    notices,
    outcome: { attempted: true, success: false, targetRealm: target, chance, rollValue: value },
  };
}
