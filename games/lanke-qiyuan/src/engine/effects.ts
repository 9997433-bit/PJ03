/**
 * effects.ts — the one place an `EventEffect` or `ItemEffect` is applied.
 *
 * Events, items, spirit gifts and match rewards all funnel through
 * `applyEffect` so that every meter change is clamped, narrated and audited
 * identically. Nothing else in the engine writes to 心神 / 心尘 / 棋道 / 悟 /
 * 银钱 directly.
 */

import type { Character, EventEffect, GameState, ItemEffect, Mood } from './types';
import { addChessDao, addCoin, addDust, addExp, addInsight, addSpirit, note } from './prose';
import { getItem } from '@/data/items';
import { getManual } from '@/data/manuals';
import { getOrigin } from '@/data/origins';

/** A single applied effect, described for the log. */
export interface EffectReport {
  lines: string[];
  /** an opponent id, when the effect opens a match */
  match?: string;
  /** an ending id, when the effect closes the life */
  ending?: string;
}

export function addItem(c: Character, itemId: string, count = 1): void {
  if (count <= 0) return;
  // A satchel only ever holds things the world actually defines.
  if (!getItem(itemId)) return;
  const stack = c.inventory.find((s) => s.itemId === itemId);
  if (stack) stack.count += count;
  else c.inventory.push({ itemId, count });
}

/** Removes up to `count`; returns how many were actually taken. */
export function removeItem(c: Character, itemId: string, count = 1): number {
  const at = c.inventory.findIndex((s) => s.itemId === itemId);
  if (at < 0) return 0;
  const stack = c.inventory[at]!;
  const taken = Math.min(stack.count, count);
  stack.count -= taken;
  if (stack.count <= 0) c.inventory.splice(at, 1);
  return taken;
}

export function countItem(c: Character, itemId: string): number {
  return c.inventory.find((s) => s.itemId === itemId)?.count ?? 0;
}

export function applyMood(c: Character, mood: Mood): void {
  const existing = c.moods.findIndex((m) => m.id === mood.id);
  if (existing >= 0) c.moods.splice(existing, 1);
  c.moods.push({ ...mood });
}

/** Grants favour to a named being, clamped to −50…100. */
export function addFavor(state: GameState, spiritId: string, delta: number): number {
  const being = state.spirits[spiritId];
  if (!being) return 0;
  const origin = state.character ? getOrigin(state.character.originId) : undefined;
  // 疏财 only amplifies goodwill; slights land at full weight.
  const scaled = delta > 0 && origin?.perk === 'openHand' ? Math.round(delta * 1.6) : delta;
  const before = being.favor;
  being.favor = Math.max(-50, Math.min(100, being.favor + scaled));
  if (!being.met && being.favor !== before) {
    being.met = true;
    state.stats.spiritsBefriended = Object.values(state.spirits).filter((s) => s.met).length;
  }
  return being.favor - before;
}

/** Announces any favour thresholds newly crossed, handing out their gifts. */
export function checkFavorThresholds(state: GameState): void {
  const c = state.character;
  if (!c) return;
  for (const being of Object.values(state.spirits)) {
    being.crossed ??= [];
    for (const t of being.thresholds) {
      if (being.favor < t.at || being.crossed.includes(t.at)) continue;
      being.crossed.push(t.at);
      note(state, `【${being.name}·好感${being.favor}】${t.unlock}`, 'bamboo');
      const gift = t.gift;
      if (!gift) continue;
      if (gift.itemId) {
        addItem(c, gift.itemId);
        note(state, `得【${getItem(gift.itemId)?.name ?? gift.itemId}】。`, 'jade');
      }
      if (gift.insight) {
        addInsight(c, gift.insight);
        note(state, `悟 +${gift.insight}。`, 'jade');
      }
      if (gift.chessDao) {
        const d = addChessDao(c, gift.chessDao);
        if (d !== 0) note(state, `棋道 +${d}。`, 'jade');
      }
      if (gift.coin) {
        addCoin(c, gift.coin);
        note(state, `银钱 +${gift.coin}。`, 'jade');
      }
    }
  }
}

type AnyEffect = EventEffect | ItemEffect;

function hasNarrative(e: AnyEffect): e is EventEffect {
  return typeof (e as EventEffect).narrative === 'string';
}

/**
 * Apply an effect to the (already-cloned, turn-local) state.
 * Returns the bookkeeping lines rather than logging them, so callers can
 * order narration and mechanics as they like.
 */
export function applyEffect(state: GameState, effect: AnyEffect): EffectReport {
  const c = state.character;
  const report: EffectReport = { lines: [] };
  if (!c) return report;

  const origin = getOrigin(c.originId);
  const quietMind = origin?.perk === 'quietMind';

  if (effect.exp) {
    const d = addExp(c, effect.exp);
    if (d !== 0) report.lines.push(`修为 ${d > 0 ? '+' : ''}${d}`);
  }
  if (effect.spirit) {
    const d = addSpirit(c, effect.spirit);
    if (d !== 0) report.lines.push(`心神 ${d > 0 ? '+' : ''}${d}`);
  }
  if (effect.dust) {
    const d = addDust(c, effect.dust, quietMind);
    if (d !== 0) report.lines.push(`心尘 ${d > 0 ? '+' : ''}${d}`);
  }
  if (effect.chessDao) {
    const d = addChessDao(c, effect.chessDao);
    if (d !== 0) report.lines.push(`棋道 ${d > 0 ? '+' : ''}${d}`);
  }
  if (effect.insight) {
    const d = addInsight(c, effect.insight);
    if (d !== 0) report.lines.push(`悟 ${d > 0 ? '+' : ''}${d}`);
  }
  if (effect.coin) {
    const d = addCoin(c, effect.coin);
    if (d > 0) state.stats.coinEarned += d;
    if (d !== 0) report.lines.push(`银钱 ${d > 0 ? '+' : ''}${d}`);
  }
  if (effect.breakthroughBonus) {
    const prev = typeof c.flags.破境加成 === 'number' ? c.flags.破境加成 : 0;
    c.flags.破境加成 = prev + effect.breakthroughBonus;
    report.lines.push(`下次破境 +${effect.breakthroughBonus}%`);
  }
  if (effect.attribute) {
    const [key, delta] = effect.attribute;
    c.attributes[key] = Math.max(1, Math.min(30, c.attributes[key] + delta));
    // 缘法 is hidden: its movement is never reported.
    if (key !== 'yuanFa') report.lines.push(`${key} ${delta > 0 ? '+' : ''}${delta}`);
  }
  if (effect.mood) {
    applyMood(c, effect.mood);
    report.lines.push(`得【${effect.mood.name}】`);
  }
  if (effect.lifespan) {
    c.lifespan += effect.lifespan;
    report.lines.push(`寿元 +${effect.lifespan}`);
  }
  if (effect.flag) {
    const [key, value] = effect.flag;
    c.flags[key] = value;
  }

  // -------- EventEffect-only fields --------
  if (hasNarrative(effect)) {
    for (const stack of effect.items ?? []) {
      addItem(c, stack.itemId, stack.count);
      report.lines.push(`得【${getItem(stack.itemId)?.name ?? stack.itemId}】×${stack.count}`);
    }
    if (effect.favor) {
      const [spiritId, delta] = effect.favor;
      const applied = addFavor(state, spiritId, delta);
      const being = state.spirits[spiritId];
      if (being && applied !== 0) {
        report.lines.push(`${being.name}好感 ${applied > 0 ? '+' : ''}${applied}`);
      }
    }
    if (effect.teachManual && !c.manuals.includes(effect.teachManual)) {
      c.manuals.push(effect.teachManual);
      state.stats.manualsLearned = c.manuals.length;
      report.lines.push(`习得${getManual(effect.teachManual)?.name ?? effect.teachManual}`);
    }
    if (effect.match) report.match = effect.match;
    if (effect.ending) report.ending = effect.ending;
  }

  // -------- ItemEffect-only fields --------
  const itemEffect = effect as ItemEffect;
  if (itemEffect.clearBurdens) {
    const before = c.moods.length;
    c.moods = c.moods.filter((m) => m.kind !== 'burden');
    if (before !== c.moods.length) report.lines.push('心中重负,尽数放下');
  }
  if (itemEffect.teachManual && !c.manuals.includes(itemEffect.teachManual)) {
    c.manuals.push(itemEffect.teachManual);
    state.stats.manualsLearned = c.manuals.length;
    report.lines.push(`习得${getManual(itemEffect.teachManual)?.name ?? itemEffect.teachManual}`);
  }

  return report;
}

/** Convenience: apply, log the bookkeeping, and settle any favour thresholds. */
export function applyAndReport(state: GameState, effect: AnyEffect): EffectReport {
  const report = applyEffect(state, effect);
  if (report.lines.length > 0) note(state, report.lines.join(' · '));
  checkFavorThresholds(state);
  return report;
}
