/**
 * economy.ts — 灵石 & 坊市: buy at list price, sell at 50% (市侩 60%),
 * stock gated by realm tier; loyal customers earn a discount.
 */

import type { GameState, ItemDef } from './types';
import { realmTier } from './realms';
import { addItem, countItem, removeItem, resolveItem } from './inventory';
import { MARKET_ARRIVE_LINES, bumpStat, pick, say, sys } from './prose';
import { ITEMS, getOrigin } from '@/data';

export const SELL_RATE = 0.5;
export const MERCHANT_SELL_RATE = 0.6;
export const FAVOR_DISCOUNT = 0.9;

/** items currently on the shelves for this character */
export function marketStock(state: GameState): ItemDef[] {
  const c = state.character;
  if (!c) return [];
  const order = realmTier(c.realm.realm);
  return ITEMS.filter((i) => {
    if (i.price <= 0 || i.hidden) return false;
    if (i.minRealm && realmTier(i.minRealm) > order) return false;
    return true;
  });
}

export function buyPrice(state: GameState, item: ItemDef): number {
  const c = state.character;
  const discounted = c?.flags['discount_market'] ? FAVOR_DISCOUNT : 1;
  return Math.max(1, Math.round(item.price * discounted));
}

export function sellPrice(state: GameState, item: ItemDef): number {
  const c = state.character;
  const origin = c ? getOrigin(c.originId) : undefined;
  const rate = origin?.perk === 'merchant' ? MERCHANT_SELL_RATE : SELL_RATE;
  return Math.max(1, Math.floor(item.price * rate));
}

/** the 坊市 command — travel to market (costs a turn), list the stock */
export function visitMarket(state: GameState): void {
  say(state, pick(state, MARKET_ARRIVE_LINES));
  const stock = marketStock(state);
  const lines = stock
    .map((i) => `  【${i.name}】${buyPrice(state, i)}灵石 — ${i.desc}`)
    .join('\n');
  sys(state, `今日在售:\n${lines}\n(购买 物品名 [数量] / 出售 物品名 [数量])`);
}

export function buyItem(state: GameState, ref: string, count = 1): void {
  const c = state.character;
  if (!c) return;
  const def = resolveItem(ref);
  if (!def || !marketStock(state).some((i) => i.id === def.id)) {
    sys(state, `坊市之中并无「${ref}」。`);
    return;
  }
  const n = Math.max(1, Math.floor(count));
  const total = buyPrice(state, def) * n;
  if (c.spiritStones < total) {
    sys(state, `【${def.name}】×${n}须${total}灵石,汝囊中仅${c.spiritStones}。曹掌柜的笑意淡了三分。`);
    return;
  }
  c.spiritStones -= total;
  addItem(state, def.id, n, true);
  sys(state, `购入【${def.name}】×${n},耗灵石${total}(余${c.spiritStones})。`, 'jade');
}

export function sellItem(state: GameState, ref: string, count = 1): void {
  const c = state.character;
  if (!c) return;
  const def = resolveItem(ref);
  if (!def) {
    sys(state, `储物袋中并无「${ref}」。`);
    return;
  }
  const n = Math.max(1, Math.floor(count));
  if (countItem(state, def.id) < n) {
    sys(state, `【${def.name}】不足${n}件。`);
    return;
  }
  if (def.sellable === false || def.price <= 0) {
    sys(state, `曹掌柜摆手:「【${def.name}】,小店不收。」`);
    return;
  }
  const total = sellPrice(state, def) * n;
  removeItem(state, def.id, n);
  c.spiritStones += total;
  bumpStat(state, 'stonesEarned', total);
  sys(state, `售出【${def.name}】×${n},得灵石${total}(现有${c.spiritStones})。`, 'jade');
}
