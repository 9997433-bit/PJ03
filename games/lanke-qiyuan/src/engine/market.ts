/**
 * market.ts — 坊市, 使用, 赠礼, 参谱, 悟谱.
 *
 * All the small deliberate actions. Only 坊市 costs a season; using an item,
 * making a gift, switching which manual you study and spending 悟 to learn a
 * new one are all free actions the player can take at any time.
 */

import type { GameState, ItemDef } from './types';
import { roll } from './rng';
import { addChessDao, addCoin, addInsight, note, say } from './prose';
import { addFavor, addItem, applyEffect, checkFavorThresholds, countItem, removeItem } from './effects';
import { findItem, getItem, ITEMS } from '@/data/items';
import { findManual, getManual, MANUALS } from '@/data/manuals';
import { getPlace } from '@/data/places';
import { getOrigin } from '@/data/origins';
import { realmTier } from '@/data/realms';

/** Sellers keep a margin; you get 45% back (60% with 通商). */
export function sellPrice(item: ItemDef, merchant: boolean): number {
  return Math.max(1, Math.round(item.price * (merchant ? 0.6 : 0.45)));
}

/** What is on the shelves here, given your realm. */
export function marketStock(state: GameState): ItemDef[] {
  const c = state.character;
  if (!c) return [];
  const tier = realmTier(c.realm.realm);
  return ITEMS.filter((i) => !i.hidden && i.price > 0 && realmTier(i.minRealm ?? 'chen') <= tier);
}

/** 坊市 — a season spent among stalls. */
export function visitMarket(state: GameState): void {
  const c = state.character;
  if (!c) return;
  const place = getPlace(state.placeId);
  say(state, `${place?.name ?? '此处'}的市集上人来人往。汝挨着摊子看过去。`);

  const stock = marketStock(state);
  if (stock.length === 0) {
    note(state, '此处无甚可买。', 'dusk');
    return;
  }
  note(
    state,
    `——【坊市】——(囊中 ${c.coin} 钱)\n` +
      stock.map((i) => `  【${i.name}】${i.price}钱 — ${i.desc}`).join('\n'),
  );

  // A market day occasionally turns up something the stalls do not display.
  const d100 = roll(state, 'D100', '坊市·淘换');
  if (d100 + c.attributes.qiYun * 2 >= 100) {
    const bargain = stock[(d100 - 1) % stock.length]!;
    const price = Math.max(1, Math.round(bargain.price * 0.4));
    if (c.coin >= price) {
      addCoin(c, -price);
      addItem(c, bargain.id);
      say(state, `一个收摊的老头把【${bargain.name}】塞给汝:「贱卖了,不想扛回去。」`, 'jade');
      note(state, `银钱 -${price} · 得【${bargain.name}】`, 'jade');
    }
  }
}

export function buyItem(state: GameState, itemId: string, count = 1): void {
  const c = state.character;
  if (!c) return;
  const item = findItem(itemId);
  if (!item) {
    note(state, '市上无此物。', 'dusk');
    return;
  }
  if (!marketStock(state).some((i) => i.id === item.id)) {
    note(state, `【${item.name}】此处不售。`, 'dusk');
    return;
  }
  const n = Math.max(1, Math.floor(count));
  const total = item.price * n;
  if (c.coin < total) {
    note(state, `银钱不足(需${total},有${c.coin})。`, 'dusk');
    return;
  }
  addCoin(c, -total);
  addItem(c, item.id, n);
  note(state, `购【${item.name}】×${n},耗${total}钱(余${c.coin})。`, 'bamboo');
}

export function sellItem(state: GameState, itemId: string, count = 1): void {
  const c = state.character;
  if (!c) return;
  const item = findItem(itemId);
  if (!item) {
    note(state, '囊中无此物。', 'dusk');
    return;
  }
  const have = countItem(c, item.id);
  if (have <= 0) {
    note(state, `囊中并无【${item.name}】。`, 'dusk');
    return;
  }
  const n = Math.min(have, Math.max(1, Math.floor(count)));
  const merchant = getOrigin(c.originId)?.perk === 'openHand' || c.flags.通商 === true;
  const unit = sellPrice(item, merchant);
  removeItem(c, item.id, n);
  addCoin(c, unit * n);
  state.stats.coinEarned += unit * n;
  note(state, `售【${item.name}】×${n},得${unit * n}钱(余${c.coin})。`, 'bamboo');
}

/** 使用 — consumables vanish; curios apply once and stay. */
export function useItem(state: GameState, itemId: string): void {
  const c = state.character;
  if (!c) return;
  const item = findItem(itemId);
  if (!item || countItem(c, item.id) <= 0) {
    note(state, '囊中无此物。', 'dusk');
    return;
  }
  if (!item.effect) {
    note(state, `【${item.name}】只是件玩意儿,用不出什么名堂。`, 'dusk');
    return;
  }
  say(state, `汝取出【${item.name}】。`);
  const report = applyEffect(state, item.effect);
  if (report.lines.length > 0) note(state, report.lines.join(' · '), 'jade');
  if (item.consumable) removeItem(c, item.id, 1);
  else note(state, `【${item.name}】留在身边。其效不可重复。`, 'muted');
  // A curio's one-shot boon should not be farmable.
  if (!item.consumable) c.flags[`用过_${item.id}`] = true;
  checkFavorThresholds(state);
}

/** 赠礼 — the main lever on 好感. */
export function giftItem(state: GameState, spiritId: string, itemId: string): void {
  const c = state.character;
  if (!c) return;
  const being = state.spirits[spiritId];
  if (!being) {
    note(state, '无此精怪。', 'dusk');
    return;
  }
  if (being.home !== state.placeId) {
    note(state, `${being.name}不在此处。`, 'dusk');
    return;
  }
  if (realmTier(being.minRealm) > realmTier(c.realm.realm)) {
    say(state, '汝把东西放下,等了一夜。什么也没来。', 'dusk');
    return;
  }
  const item = findItem(itemId);
  if (!item || countItem(c, item.id) <= 0) {
    note(state, '囊中无此物。', 'dusk');
    return;
  }

  const base = item.effect?.giftFavor ?? Math.max(2, Math.round(item.price / 8));
  // Taste matters more than price: a good match doubles the gesture.
  const liked = item.kind === 'curio' || item.kind === 'gift' || item.kind === 'tea';
  const d20 = roll(state, 'D20', `赠礼·${being.name}`);
  const bonus = Math.floor((d20 + c.attributes.qiYun) / 6);
  const delta = Math.round((base + bonus) * (liked ? 1.5 : 0.8));

  removeItem(c, item.id, 1);
  const applied = addFavor(state, spiritId, delta);
  say(state, `汝把【${item.name}】放在${being.name}面前。`, 'bamboo');
  note(state, `${being.name}好感 +${applied}(现${being.favor})。`, 'jade');
  checkFavorThresholds(state);
}

// ============================================================================
// 棋谱
// ============================================================================

/** 参谱 — switch which manual you are currently studying. */
export function studyManual(state: GameState, manualId: string): void {
  const c = state.character;
  if (!c) return;
  const manual = findManual(manualId);
  if (!manual) {
    note(state, '无此谱。', 'dusk');
    return;
  }
  if (!c.manuals.includes(manual.id)) {
    note(state, `汝尚未悟得${manual.name}。`, 'dusk');
    return;
  }
  c.studyingId = manual.id;
  say(state, `汝把${manual.name}摊在案上。往后的日子,都从这几页里过。`, 'bamboo');
  note(state, `参悟 ×${manual.speedBonus} · 枰上 +${manual.boardBonus}`, 'muted');
}

/** Manuals you could learn right now (or the reason you cannot). */
export function learnableManuals(state: GameState): {
  id: string;
  name: string;
  cost: number;
  reason: string | null;
}[] {
  const c = state.character;
  if (!c) return [];
  return MANUALS.filter((m) => !c.manuals.includes(m.id)).map((m) => {
    const cost = manualCost(state, m.id);
    let reason: string | null = null;
    if (c.chessDao < m.minChessDao) reason = `棋道未足(需${m.minChessDao})`;
    else if (c.insight < cost) reason = `悟不足(需${cost})`;
    return { id: m.id, name: m.name, cost, reason };
  });
}

export function manualCost(state: GameState, manualId: string): number {
  const manual = getManual(manualId);
  if (!manual) return 0;
  const wideRead = state.character && getOrigin(state.character.originId)?.perk === 'wideRead';
  return wideRead ? Math.max(1, Math.round(manual.insightCost * 0.7)) : manual.insightCost;
}

/** 悟谱 — spend 悟 to comprehend a new manual. */
export function learnManual(state: GameState, manualId: string): void {
  const c = state.character;
  if (!c) return;
  const manual = findManual(manualId);
  if (!manual) {
    note(state, '无此谱。', 'dusk');
    return;
  }
  if (c.manuals.includes(manual.id)) {
    note(state, `${manual.name}汝已了然于胸。`, 'dusk');
    return;
  }
  if (c.chessDao < manual.minChessDao) {
    say(state, '汝翻了三遍,每个字都认得,连起来却什么也不是。', 'dusk');
    note(state, `棋道未足(${c.chessDao}/${manual.minChessDao})。`, 'dusk');
    return;
  }
  const cost = manualCost(state, manual.id);
  if (c.insight < cost) {
    note(state, `悟不足(${c.insight}/${cost})。多观几局棋罢。`, 'dusk');
    return;
  }
  addInsight(c, -cost);
  c.manuals.push(manual.id);
  c.studyingId = manual.id;
  state.stats.manualsLearned = c.manuals.length;
  const gained = addChessDao(c, 2);
  say(state, `汝合上${manual.name},静坐良久。有些东西,从此在心里长住了。`, 'moon');
  note(
    state,
    `悟 -${cost} · 习得${manual.name}${gained > 0 ? ` · 棋道 +${gained}` : ''} · 已改参此谱`,
    'jade',
  );
}

/** Text rendering of the satchel for the log. */
export function viewSatchel(state: GameState): void {
  const c = state.character;
  if (!c) return;
  if (c.inventory.length === 0) {
    note(state, `行囊空空,唯余${c.coin}钱。`);
    return;
  }
  const lines = c.inventory
    .map((s) => {
      const def = getItem(s.itemId);
      return `  【${def?.name ?? s.itemId}】×${s.count} — ${def?.desc ?? ''}`;
    })
    .join('\n');
  note(state, `——【行囊】——(银钱 ${c.coin})\n${lines}`);
}
