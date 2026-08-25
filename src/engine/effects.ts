/**
 * effects.ts — single applier for EventEffect payloads (events, quests,
 * exploration all funnel through here). Keeps the effect grammar in one place.
 */

import type { EventEffect, GameState } from './types';
import { gainExp } from './cultivation';
import { addItem } from './inventory';
import { changeFavor } from './npc';
import { startCombat } from './combat';
import { checkHpDeath, endGame } from './lifecycle';
import { say, sys } from './narrative';
import { getCombatArt, getTechnique, makeInjury } from '@/data';

export function applyEventEffect(state: GameState, fx: EventEffect): void {
  const c = state.character;
  if (!c || state.phase === 'ended') return;

  if (fx.narrative) say(state, fx.narrative);

  if (fx.spiritStones) {
    if (fx.spiritStones > 0) {
      c.spiritStones += fx.spiritStones;
      state.stats.stonesEarned += fx.spiritStones;
      sys(state, `灵石 +${fx.spiritStones}(现有${c.spiritStones})。`, 'jade');
    } else {
      const loss = Math.min(c.spiritStones, -fx.spiritStones);
      c.spiritStones -= loss;
      if (loss > 0) sys(state, `灵石 -${loss}(现有${c.spiritStones})。`, 'danger');
    }
  }

  if (fx.exp) {
    gainExp(state, fx.exp);
    sys(state, `修为 ${fx.exp > 0 ? '+' : ''}${fx.exp}。`, fx.exp > 0 ? 'jade' : 'danger');
  }

  if (fx.hp) {
    const before = c.hp;
    c.hp = Math.max(0, Math.min(c.maxHp, c.hp + fx.hp));
    const delta = c.hp - before;
    if (delta !== 0) {
      sys(state, `气血 ${delta > 0 ? '+' : ''}${delta}(${c.hp}/${c.maxHp})。`, delta > 0 ? 'jade' : 'danger');
    }
  }

  if (fx.items) {
    for (const s of fx.items) addItem(state, s.itemId, s.count);
  }

  if (fx.favor) {
    changeFavor(state, fx.favor[0], fx.favor[1]);
  }

  if (fx.injury) {
    const injury = makeInjury(fx.injury);
    if (injury) {
      c.injuries.push(injury);
      sys(state, `汝身负【${injury.name}】,${injury.turnsLeft}季方愈。`, 'danger');
    }
  }

  if (fx.status) {
    const existing = c.statusEffects.find((s) => s.id === fx.status!.id);
    if (existing) existing.turnsLeft = Math.max(existing.turnsLeft, fx.status.turnsLeft);
    else c.statusEffects.push(structuredClone(fx.status));
    sys(state, `获得状态【${fx.status.name}】:${fx.status.desc}`, fx.status.kind === 'buff' ? 'jade' : 'danger');
  }

  if (fx.flag) {
    c.flags[fx.flag[0]] = fx.flag[1];
  }

  if (fx.teachTechnique) {
    const t = getTechnique(fx.teachTechnique);
    if (t) {
      c.techniqueId = t.id;
      sys(state, `汝习得${t.grade}功法《${t.name}》,已转修此法。`, 'gold');
    }
  }

  if (fx.teachArt) {
    const a = getCombatArt(fx.teachArt);
    if (a && !c.combatArts.includes(a.id)) {
      c.combatArts.push(a.id);
      sys(state, `汝习得术法【${a.name}】。`, 'gold');
    }
  }

  if (fx.death) {
    endGame(state, 'death_qi_deviation');
    return;
  }

  if (checkHpDeath(state)) return;

  if (fx.combat) {
    startCombat(state, fx.combat);
  }
}
