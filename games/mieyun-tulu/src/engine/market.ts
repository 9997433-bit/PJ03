/**
 * market.ts — 坊市 (buy, sell, use, equip)
 *
 * The spread is the point: you buy at `price × (1 − 折扣)` and sell at
 * `price × 0.45`, so churning inventory bleeds 灵石 and the only way to get
 * rich is to take things off corpses or out of the ground. 出身·商行少东 and
 * the 稷下 route narrow the spread but never close it.
 *
 * Stock is tiered by realm order, so the shelf grows as the character does.
 */

import { itemById, marketStock } from '@/data/items';
import { realmDef } from '@/data/realms';
import { derive } from './derived';
import type { GameState, ItemDef, LogEntry } from './types';
import { addItem, adjustCalamity, clamp, countItem, entry, removeItem } from './util';

export const SELL_RATIO = 0.45;

export function buyPrice(state: GameState, item: ItemDef): number {
  const d = derive(state.character!);
  return Math.max(1, Math.round(item.price * (1 - d.marketDiscount)));
}

export function sellPrice(state: GameState, item: ItemDef): number {
  const d = derive(state.character!);
  return Math.max(1, Math.round(item.price * (SELL_RATIO + d.sellBonus)));
}

export interface StockEntry {
  item: ItemDef;
  buy: number;
  sell: number;
  owned: number;
}

export function marketList(state: GameState): StockEntry[] {
  const c = state.character!;
  const order = realmDef(c.realm.realm).order;
  return marketStock(order).map((item) => ({
    item,
    buy: buyPrice(state, item),
    sell: sellPrice(state, item),
    owned: countItem(c.inventory, item.id),
  }));
}

export function buyItem(state: GameState, itemId: string, count = 1): LogEntry[] {
  const c = state.character!;
  const item = itemById(itemId);
  if (!item || item.noTrade || item.price <= 0) {
    return [entry(state.turn, '系统', '此物不入坊市。', 'danger')];
  }
  const order = realmDef(c.realm.realm).order;
  if ((item.minRealmOrder ?? 0) > order) {
    return [entry(state.turn, '系统', `${item.name}非你此境所能购。`, 'danger')];
  }
  const n = Math.max(1, Math.floor(count));
  const total = buyPrice(state, item) * n;
  if (c.spiritStones < total) {
    return [entry(state.turn, '系统', `灵石不足(需 ${total})。`, 'danger')];
  }
  c.spiritStones -= total;
  addItem(c.inventory, item.id, n);
  return [entry(state.turn, '系统', `购入 ${item.name}×${n},付灵石 ${total}。`, 'normal')];
}

export function sellItem(state: GameState, itemId: string, count = 1): LogEntry[] {
  const c = state.character!;
  const item = itemById(itemId);
  if (!item) return [entry(state.turn, '系统', '无此物。', 'danger')];
  if (item.noTrade) return [entry(state.turn, '系统', '此物不可易手。', 'danger')];
  const n = Math.max(1, Math.floor(count));
  if (!removeItem(c.inventory, item.id, n)) {
    return [entry(state.turn, '系统', '囊中不足此数。', 'danger')];
  }
  for (const slot of ['weapon', 'robe', 'charm'] as const) {
    if (c.equipped[slot] === item.id && countItem(c.inventory, item.id) === 0) {
      delete c.equipped[slot];
    }
  }
  const total = sellPrice(state, item) * n;
  c.spiritStones += total;
  state.stats.stonesEarned += total;
  return [entry(state.turn, '系统', `售出 ${item.name}×${n},得灵石 ${total}。`, 'normal')];
}

export function consumeItem(state: GameState, itemId: string): LogEntry[] {
  const c = state.character!;
  const item = itemById(itemId);
  if (!item) return [entry(state.turn, '系统', '无此物。', 'danger')];
  if (!item.effect || Object.keys(item.effect).length === 0) {
    return [entry(state.turn, '系统', `${item.name}并非服食之物。`, 'danger')];
  }
  if (countItem(c.inventory, itemId) < 1) {
    return [entry(state.turn, '系统', '囊中无此物。', 'danger')];
  }
  // Relics are read, not consumed.
  const consumes = item.kind !== 'relic';
  if (consumes) removeItem(c.inventory, itemId, 1);

  const d = derive(c);
  const mult = item.kind === 'pill' ? d.pillMult : 1;
  const fx = item.effect;
  const notes: string[] = [];

  if (fx.hp) {
    const v = Math.round(fx.hp * mult);
    c.hp = clamp(c.hp + v, 0, c.maxHp);
    notes.push(`气血 +${v}`);
  }
  if (fx.mana) {
    const v = Math.round(fx.mana * mult);
    c.mana = clamp(c.mana + v, 0, c.maxMana);
    notes.push(`法力 +${v}`);
  }
  if (fx.exp) {
    const v = Math.round(fx.exp * mult);
    c.realm.exp = clamp(c.realm.exp + v, 0, c.realm.expNeeded);
    notes.push(`修为 +${v}`);
  }
  if (fx.fortune) {
    c.fortune = clamp(c.fortune + fx.fortune, 0, 100);
    notes.push(`气运 ${fx.fortune > 0 ? '+' : '−'}${Math.abs(fx.fortune)}`);
  }
  if (fx.calamity) {
    const v = Math.round(fx.calamity * (fx.calamity < 0 ? mult : 1));
    adjustCalamity(state, v);
    notes.push(`劫运 ${v > 0 ? '+' : '−'}${Math.abs(v)}`);
  }
  if (fx.merit) {
    c.merit = clamp(c.merit + fx.merit, -300, 600);
    notes.push(`功德 ${fx.merit > 0 ? '+' : '−'}${Math.abs(fx.merit)}`);
  }
  if (fx.stones) {
    c.spiritStones = Math.max(0, c.spiritStones + fx.stones);
    notes.push(`灵石 ${fx.stones > 0 ? '+' : '−'}${Math.abs(fx.stones)}`);
  }
  if (fx.breakthroughBonus) {
    c.breakthroughBuff += Math.round(fx.breakthroughBonus * mult);
    notes.push(`下次破关 +${Math.round(fx.breakthroughBonus * mult)}`);
  }
  if (fx.attribute) {
    const [key, delta] = fx.attribute;
    c.attributes[key] = clamp(c.attributes[key] + delta, 0, 40);
    notes.push(`资质提升`);
  }
  if (fx.cureInjury && c.injuries.length > 0) {
    const healed = c.injuries.shift()!;
    notes.push(`伤愈:${healed.name}`);
  }
  if (fx.flag) {
    const [key, value] = fx.flag;
    c.flags[key] = value;
    notes.push('身有所护');
  }

  const d2 = derive(c);
  c.maxHp = d2.maxHp;
  c.maxMana = d2.maxMana;
  c.hp = clamp(c.hp, 0, c.maxHp);
  c.mana = clamp(c.mana, 0, c.maxMana);

  return [
    entry(
      state.turn,
      '系统',
      `${consumes ? '服用' : '参悟'} ${item.name}${notes.length > 0 ? `:${notes.join(' · ')}` : ''}。`,
      'normal',
    ),
  ];
}

export function equipItem(state: GameState, itemId: string): LogEntry[] {
  const c = state.character!;
  const item = itemById(itemId);
  if (!item) return [entry(state.turn, '系统', '无此物。', 'danger')];
  if (item.kind !== 'weapon' && item.kind !== 'robe' && item.kind !== 'charm') {
    return [entry(state.turn, '系统', `${item.name}不可佩用。`, 'danger')];
  }
  if (countItem(c.inventory, itemId) < 1) {
    return [entry(state.turn, '系统', '囊中无此物。', 'danger')];
  }
  c.equipped[item.kind] = item.id;
  const d = derive(c);
  c.maxHp = d.maxHp;
  c.maxMana = d.maxMana;
  c.hp = clamp(c.hp, 0, c.maxHp);
  c.mana = clamp(c.mana, 0, c.maxMana);
  return [entry(state.turn, '系统', `佩上 ${item.name}。`, 'normal')];
}

export function unequipSlot(state: GameState, slot: 'weapon' | 'robe' | 'charm'): LogEntry[] {
  const c = state.character!;
  const id = c.equipped[slot];
  if (!id) return [entry(state.turn, '系统', '此位本空。', 'normal')];
  delete c.equipped[slot];
  const d = derive(c);
  c.maxHp = d.maxHp;
  c.maxMana = d.maxMana;
  c.hp = clamp(c.hp, 0, c.maxHp);
  c.mana = clamp(c.mana, 0, c.maxMana);
  return [entry(state.turn, '系统', `解下 ${itemById(id)?.name ?? id}。`, 'normal')];
}
