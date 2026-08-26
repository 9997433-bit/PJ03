/**
 * effects.ts — the single applier for every declarative outcome.
 *
 * Events, item uses and spirit gifts all describe what they do as data
 * (`EventEffect` / `ItemEffect`); this module is the only place that turns
 * that data into state changes. Keeping it in one function means new content
 * can never invent a new way to mutate the character.
 */

import { getItem } from '@/data/items';
import { getManual } from '@/data/manuals';
import { applyMood, hasQuietMind, settleStageUps } from './cultivation';
import { clearBurdens } from './cultivation';
import { addToInventory } from './inventory';
import { adjustFavor } from './spirits';
import {
  addChessDao,
  addCoin,
  addDust,
  addExp,
  addInsight,
  addSpirit,
  note,
  say,
} from './prose';
import type { EventEffect, GameState, ItemEffect } from './types';

export interface EffectSummary {
  lines: string[];
  ending: string | null;
  match: string | null;
}

/**
 * Applies an effect and returns the bookkeeping lines it produced, plus any
 * ending id or opponent id the effect wants the turn pipeline to honour.
 */
export function applyEffect(state: GameState, effect: EventEffect): EffectSummary {
  const summary: EffectSummary = { lines: [], ending: null, match: null };
  const c = state.character;
  if (!c) return summary;

  if (effect.narrative) say(state, effect.narrative, 'normal');

  const quiet = hasQuietMind(c);
  const push = (label: string, delta: number, unit = '') => {
    if (delta !== 0) summary.lines.push(`${label} ${delta >= 0 ? '+' : ''}${delta}${unit}`);
  };

  if (effect.exp) push('修为', addExp(c, effect.exp));
  if (effect.spirit) push('心神', addSpirit(c, effect.spirit));
  if (effect.dust) push('心尘', addDust(c, effect.dust, quiet));
  if (effect.chessDao) push('棋道', addChessDao(c, effect.chessDao));
  if (effect.insight) push('悟', addInsight(c, effect.insight));
  if (effect.coin) {
    const delta = addCoin(c, effect.coin);
    if (delta > 0) state.stats.coinEarned += delta;
    push('银钱', delta);
  }

  if (effect.items) {
    for (const stack of effect.items) {
      const item = getItem(stack.itemId);
      if (!item) continue;
      addToInventory(c, stack.itemId, stack.count);
      summary.lines.push(`得〔${item.name}〕×${stack.count}`);
    }
  }

  if (effect.attribute) {
    const [key, delta] = effect.attribute;
    const before = c.attributes[key];
    c.attributes[key] = Math.max(1, Math.min(30, before + delta));
    const applied = c.attributes[key] - before;
    // 缘法 is hidden: its movement is never narrated.
    if (applied !== 0 && key !== 'yuanFa') push(key, applied);
  }

  if (effect.favor) {
    const [spiritId, delta] = effect.favor;
    const line = adjustFavor(state, spiritId, delta);
    if (line) summary.lines.push(line);
  }

  if (effect.mood) applyMood(state, effect.mood);

  if (effect.flag) {
    const [key, value] = effect.flag;
    c.flags[key] = value;
  }

  if (effect.teachManual) {
    const manual = getManual(effect.teachManual);
    if (manual && !c.manuals.includes(effect.teachManual)) {
      c.manuals.push(effect.teachManual);
      state.stats.manualsLearned += 1;
      summary.lines.push(`悟得${manual.name}`);
      if (!c.studyingId) c.studyingId = effect.teachManual;
    }
  }

  if (effect.match) summary.match = effect.match;
  if (effect.ending) summary.ending = effect.ending;

  settleStageUps(state);
  if (c.chessDao > state.stats.peakChessDao) state.stats.peakChessDao = c.chessDao;
  if (summary.lines.length > 0) note(state, summary.lines.join(' · '));
  return summary;
}

/** Item effects are a strict subset of event effects, plus lifespan. */
export function applyItemEffect(state: GameState, effect: ItemEffect): string[] {
  const c = state.character;
  if (!c) return [];
  const lines: string[] = [];

  const base: EventEffect = { narrative: '' };
  if (effect.spirit !== undefined) base.spirit = effect.spirit;
  if (effect.dust !== undefined) base.dust = effect.dust;
  if (effect.exp !== undefined) base.exp = effect.exp;
  if (effect.chessDao !== undefined) base.chessDao = effect.chessDao;
  if (effect.insight !== undefined) base.insight = effect.insight;
  if (effect.coin !== undefined) base.coin = effect.coin;
  if (effect.attribute !== undefined) base.attribute = effect.attribute;
  if (effect.mood !== undefined) base.mood = effect.mood;
  if (effect.flag !== undefined) base.flag = effect.flag;
  if (effect.teachManual !== undefined) base.teachManual = effect.teachManual;

  lines.push(...applyEffect(state, base).lines);

  if (effect.clearBurdens) {
    const cleared = clearBurdens(state);
    if (cleared > 0) lines.push(`散去心结 ×${cleared}`);
  }
  if (effect.breakthroughBonus) {
    c.flags['破境加持'] = Number(c.flags['破境加持'] ?? 0) + effect.breakthroughBonus;
    lines.push(`下次破境 +${effect.breakthroughBonus}%`);
  }
  if (effect.lifespan) {
    c.lifespan += effect.lifespan;
    lines.push(`寿元 +${effect.lifespan}`);
  }
  return lines;
}
