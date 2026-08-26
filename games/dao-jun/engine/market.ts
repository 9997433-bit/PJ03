/**
 * market.ts — 法会: 玄玉 finally buys something.
 *
 * List price follows rarity; the shelves are gated by realm, so 天品 stock only
 * appears once you could plausibly survive using it. Selling returns 45% of
 * list (55% for 江湖散修, who know the fences), and 威势 ≥ 40 earns a standing
 * 一成 discount on purchases.
 */

import { ITEMS } from './content';
import type { GameItem, GameState } from './types';

export const INVENTORY_LIMIT = 24;
export const SELL_RATE = 0.45;
export const WANDERER_SELL_RATE = 0.55;
export const INFLUENCE_DISCOUNT_AT = 40;
export const INFLUENCE_DISCOUNT = 0.9;

export const RARITY_PRICE: Record<GameItem['rarity'], number> = {
  凡: 32,
  玄: 96,
  地: 240,
  天: 640,
};

/** Lowest realm index at which each rarity tier reaches the shelves. */
export const RARITY_MIN_REALM: Record<GameItem['rarity'], number> = {
  凡: 0,
  玄: 1,
  地: 3,
  天: 5,
};

export function listPrice(item: GameItem): number {
  return RARITY_PRICE[item.rarity];
}

export function buyPrice(state: GameState, item: GameItem): number {
  const discount = state.territory.influence >= INFLUENCE_DISCOUNT_AT ? INFLUENCE_DISCOUNT : 1;
  return Math.max(1, Math.round(listPrice(item) * discount));
}

export function sellPrice(state: GameState, item: GameItem): number {
  const rate = state.character.origin === 'wanderer' ? WANDERER_SELL_RATE : SELL_RATE;
  return Math.max(1, Math.floor(listPrice(item) * rate));
}

/** Everything on the shelves at the current realm. */
export function marketStock(state: GameState): GameItem[] {
  return ITEMS.filter((item) => RARITY_MIN_REALM[item.rarity] <= state.character.realm);
}

export function isStocked(state: GameState, itemId: string): boolean {
  return marketStock(state).some((item) => item.id === itemId);
}

export function canBuy(state: GameState, itemId: string): { available: boolean; reason: string } {
  if (state.ending) return { available: false, reason: '命数已定' };
  if (state.combat) return { available: false, reason: '战中不可交易' };
  const item = ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) return { available: false, reason: '法会并无此物' };
  if (!isStocked(state, itemId)) return { available: false, reason: `${item.rarity}品需更高境界` };
  if (state.inventory.length >= INVENTORY_LIMIT) return { available: false, reason: '乾坤囊已满' };
  if (state.territory.spiritStones < buyPrice(state, item)) {
    return { available: false, reason: `需 ${buyPrice(state, item)} 玄玉` };
  }
  return { available: true, reason: '' };
}

export function canSell(state: GameState, itemId: string): { available: boolean; reason: string } {
  if (state.ending) return { available: false, reason: '命数已定' };
  if (state.combat) return { available: false, reason: '战中不可交易' };
  const item = ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) return { available: false, reason: '并无此物' };
  if (!state.inventory.includes(itemId)) return { available: false, reason: '行囊中没有此物' };
  return { available: true, reason: '' };
}
