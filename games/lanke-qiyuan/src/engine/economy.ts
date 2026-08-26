/**
 * economy.ts — 坊市.
 *
 * The shelf is filtered by realm, so the market grows with you rather than
 * dumping every object on the first screen. Selling always loses money
 * (`SELL_RATE` < 1) — the shop is a convenience, not an exploit — and hidden
 * items never appear for sale at any realm.
 */

import { ITEMS, getItem } from '@/data/items';
import { getPlace } from '@/data/places';
import { realmAtLeast } from './audit';
import { addToInventory, countOf, removeFromInventory } from './inventory';
import { addCoin, note, say } from './prose';
import type { GameState, ItemDef } from './types';

/** Sale price is this fraction of the list price, rounded down. */
export const SELL_RATE = 0.45;
/** A place with no market of its own still lets you barter at this markup. */
export const REMOTE_MARKUP = 1.25;

export function sellPrice(item: ItemDef): number {
  return Math.max(1, Math.floor(item.price * SELL_RATE));
}

export function buyPrice(state: GameState, item: ItemDef): number {
  const place = getPlace(state.placeId);
  const remote = place ? place.eventTags.includes('市井') === false : true;
  return Math.max(1, Math.round(item.price * (remote ? REMOTE_MARKUP : 1)));
}

/** Everything on the shelf right now, cheapest first. */
export function marketStock(state: GameState): ItemDef[] {
  const c = state.character;
  if (!c) return [];
  return ITEMS.filter(
    (i) => i.hidden !== true && i.price > 0 && (!i.minRealm || realmAtLeast(c.realm.realm, i.minRealm)),
  ).sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

export interface TradeResult {
  ok: boolean;
  message: string;
}

export function buy(state: GameState, itemId: string, count = 1): TradeResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。' };
  if (!Number.isInteger(count) || count <= 0) return { ok: false, message: '数目不对。' };
  const item = getItem(itemId);
  if (!item) return { ok: false, message: `坊市无此物:${itemId}` };
  if (!marketStock(state).some((i) => i.id === itemId)) {
    return { ok: false, message: `〔${item.name}〕此境不售。` };
  }
  const unit = buyPrice(state, item);
  const total = unit * count;
  if (c.coin < total) return { ok: false, message: `银钱不足:需 ${total},今有 ${c.coin}。` };

  addCoin(c, -total);
  addToInventory(c, itemId, count);
  say(state, `汝买下〔${item.name}〕×${count}。`, 'bamboo');
  note(state, `银钱 −${total}(每件 ${unit})`);
  return { ok: true, message: `已购〔${item.name}〕×${count}` };
}

export function sell(state: GameState, itemId: string, count = 1): TradeResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。' };
  if (!Number.isInteger(count) || count <= 0) return { ok: false, message: '数目不对。' };
  const item = getItem(itemId);
  if (!item) return { ok: false, message: `无此物:${itemId}` };
  const have = countOf(c, itemId);
  if (have <= 0) return { ok: false, message: `行囊里没有〔${item.name}〕。` };
  const n = Math.min(have, count);
  const unit = sellPrice(item);
  const total = unit * n;

  removeFromInventory(c, itemId, n);
  const gained = addCoin(c, total);
  state.stats.coinEarned += gained;
  say(state, `汝把〔${item.name}〕×${n} 换了钱。`, 'muted');
  note(state, `银钱 +${gained}(每件 ${unit},折价而已)`);
  return { ok: true, message: `已售〔${item.name}〕×${n}` };
}
