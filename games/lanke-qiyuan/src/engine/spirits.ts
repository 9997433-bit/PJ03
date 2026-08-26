/**
 * spirits.ts — 精怪录 bookkeeping.
 *
 * Favour is the only relationship number in the game and it runs −50…100.
 * Crossing a threshold is announced exactly once (`crossed`), and the gift
 * attached to it is granted exactly once too, so replaying the same favour
 * band cannot farm the same琥珀 twice.
 */

import { getItem } from '@/data/items';
import { addChessDao, addCoin, addInsight, note, say } from './prose';
import { addToInventory } from './inventory';
import { realmAtLeast } from './audit';
import type { GameState, SpiritBeing } from './types';

export const FAVOR_MIN = -50;
export const FAVOR_MAX = 100;
/** Favour at or above this counts as 相识 in the ending statistics. */
export const BEFRIENDED_AT = 50;

/** 疏财 — the 破产行商 perk widens every gift. */
function openHandMultiplier(state: GameState): number {
  return state.character?.flags['通商'] === true ? 1.6 : 1;
}

/**
 * Moves a being's favour and fires any thresholds newly crossed. Returns a
 * one-line summary for the caller's bookkeeping row, or null when nothing
 * happened (unknown id).
 */
export function adjustFavor(state: GameState, spiritId: string, delta: number): string | null {
  const being = state.spirits[spiritId];
  if (!being) return null;
  const scaled = delta > 0 ? Math.round(delta * openHandMultiplier(state)) : delta;
  const before = being.favor;
  being.favor = Math.max(FAVOR_MIN, Math.min(FAVOR_MAX, before + scaled));
  const applied = being.favor - before;
  if (!being.met && being.favor > 0) {
    being.met = true;
    say(state, `〔${being.title}·${being.name}〕记住了汝。`, 'moon');
  }
  fireThresholds(state, being);
  refreshBefriendedCount(state);
  if (applied === 0) return null;
  return `${being.name}好感 ${applied >= 0 ? '+' : ''}${applied}`;
}

function fireThresholds(state: GameState, being: SpiritBeing): void {
  const c = state.character;
  if (!c) return;
  being.crossed = being.crossed ?? [];
  for (const t of being.thresholds) {
    if (being.favor < t.at || being.crossed.includes(t.at)) continue;
    being.crossed.push(t.at);
    say(state, t.unlock, 'jade');
    if (!t.gift) continue;
    const gained: string[] = [];
    if (t.gift.insight) gained.push(`悟 +${addInsight(c, t.gift.insight)}`);
    if (t.gift.chessDao) gained.push(`棋道 +${addChessDao(c, t.gift.chessDao)}`);
    if (t.gift.coin) {
      const d = addCoin(c, t.gift.coin);
      state.stats.coinEarned += d;
      gained.push(`银钱 +${d}`);
    }
    if (t.gift.itemId) {
      const item = getItem(t.gift.itemId);
      if (item) {
        addToInventory(c, t.gift.itemId, 1);
        gained.push(`〔${item.name}〕`);
      }
    }
    if (gained.length > 0) note(state, gained.join(' · '), 'jade');
  }
}

function refreshBefriendedCount(state: GameState): void {
  state.stats.spiritsBefriended = Object.values(state.spirits).filter(
    (s) => s.favor >= BEFRIENDED_AT,
  ).length;
}

/** Beings that could be met here and now — the 精怪录 view filters on this. */
export function visibleSpirits(state: GameState): SpiritBeing[] {
  const c = state.character;
  if (!c) return [];
  return Object.values(state.spirits).filter(
    (s) => s.met === true || (s.home === state.placeId && realmAtLeast(c.realm.realm, s.minRealm)),
  );
}

/** Beings physically present at the current place, gate included. */
export function spiritsHere(state: GameState): SpiritBeing[] {
  const c = state.character;
  if (!c) return [];
  return Object.values(state.spirits).filter(
    (s) => s.home === state.placeId && realmAtLeast(c.realm.realm, s.minRealm),
  );
}

export function countBefriended(state: GameState): number {
  return Object.values(state.spirits).filter((s) => s.favor >= BEFRIENDED_AT).length;
}

/** Highest favour on the register — drives the 棋友遍天下 ending check. */
export function maxFavor(state: GameState): number {
  let best = FAVOR_MIN;
  for (const s of Object.values(state.spirits)) best = Math.max(best, s.favor);
  return best;
}
