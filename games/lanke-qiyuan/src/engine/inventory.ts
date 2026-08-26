/**
 * inventory.ts — the 行囊: stacking, using, giving away.
 *
 * Stacks never go to zero-count; an emptied stack is spliced out so the
 * invariant checker's `count > 0` rule holds for free.
 */

import { getItem } from '@/data/items';
import { applyItemEffect } from './effects';
import { adjustFavor } from './spirits';
import { note, say } from './prose';
import { spiritsHere } from './spirits';
import type { Character, GameState, ItemDef, ItemStack } from './types';

export function addToInventory(c: Character, itemId: string, count = 1): void {
  if (count <= 0) return;
  const found = c.inventory.find((s) => s.itemId === itemId);
  if (found) found.count += count;
  else c.inventory.push({ itemId, count });
}

/** Removes up to `count`; returns how many actually left the satchel. */
export function removeFromInventory(c: Character, itemId: string, count = 1): number {
  const idx = c.inventory.findIndex((s) => s.itemId === itemId);
  if (idx < 0) return 0;
  const stack = c.inventory[idx] as ItemStack;
  const taken = Math.min(stack.count, count);
  stack.count -= taken;
  if (stack.count <= 0) c.inventory.splice(idx, 1);
  return taken;
}

export function countOf(c: Character, itemId: string): number {
  return c.inventory.find((s) => s.itemId === itemId)?.count ?? 0;
}

export interface InventoryView {
  item: ItemDef;
  count: number;
}

export function satchelView(c: Character): InventoryView[] {
  const out: InventoryView[] = [];
  for (const stack of c.inventory) {
    const item = getItem(stack.itemId);
    if (item) out.push({ item, count: stack.count });
  }
  return out.sort((a, b) => b.item.grade - a.item.grade || a.item.name.localeCompare(b.item.name));
}

export interface UseResult {
  ok: boolean;
  message: string;
  lines: string[];
}

/**
 * Uses an item. Consumables vanish; curios stay and can be used again, which
 * is deliberate — a 寒玉棋 keeps being cold.
 *
 * Named `consumeItem` rather than `useItem` so the engine never trips React's
 * rules-of-hooks lint: anything called `use*` is assumed to be a hook.
 */
export function consumeItem(state: GameState, itemId: string): UseResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。', lines: [] };
  const item = getItem(itemId);
  if (!item) return { ok: false, message: `无此物:${itemId}`, lines: [] };
  if (countOf(c, itemId) <= 0) return { ok: false, message: `行囊里没有〔${item.name}〕。`, lines: [] };
  if (!item.effect) return { ok: false, message: `〔${item.name}〕只是件物事,用不出什么。`, lines: [] };

  say(state, `汝取出〔${item.name}〕。`, 'bamboo');
  const lines = applyItemEffect(state, item.effect);
  if (item.consumable) {
    removeFromInventory(c, itemId, 1);
    lines.push(`〔${item.name}〕已尽`);
  }
  if (lines.length > 0) note(state, lines.join(' · '));
  return { ok: true, message: `已用〔${item.name}〕`, lines };
}

/**
 * 赠礼 — hand an item to a being who is actually here. Favour granted is the
 * item's `giftFavor`, or a quarter of its price when it has none.
 */
export function giftItem(state: GameState, spiritId: string, itemId: string): UseResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。', lines: [] };
  const being = state.spirits[spiritId];
  if (!being) return { ok: false, message: `精怪录中无此名:${spiritId}`, lines: [] };
  const here = spiritsHere(state).some((s) => s.id === spiritId);
  if (!here) return { ok: false, message: `${being.name}不在此处。`, lines: [] };
  const item = getItem(itemId);
  if (!item) return { ok: false, message: `无此物:${itemId}`, lines: [] };
  if (countOf(c, itemId) <= 0) return { ok: false, message: `行囊里没有〔${item.name}〕。`, lines: [] };

  const base = item.effect?.giftFavor ?? Math.max(2, Math.round(item.price / 4));
  removeFromInventory(c, itemId, 1);
  say(state, `汝把〔${item.name}〕递过去。${being.name}接了。`, 'moon');
  const line = adjustFavor(state, spiritId, base);
  const lines = line ? [line] : [];
  if (lines.length > 0) note(state, lines.join(' · '), 'jade');
  return { ok: true, message: `已赠${being.name}〔${item.name}〕`, lines };
}
