import { describe, expect, it } from 'vitest';
import { fareFor, isRoadWise, reachablePlaces, travel, WANDER_SPIRIT_COST } from '../travel';
import { buy, buyPrice, marketStock, sell, sellPrice, SELL_RATE } from '../economy';
import {
  addToInventory,
  consumeItem,
  countOf,
  giftItem,
  removeFromInventory,
  satchelView,
} from '../inventory';
import { adjustFavor, BEFRIENDED_AT, countBefriended, FAVOR_MAX, FAVOR_MIN, maxFavor, spiritsHere, visibleSpirits } from '../spirits';
import { getItem, ITEMS } from '@/data/items';
import { getPlace, PLACES } from '@/data/places';
import { playableState, withCharacter } from './helpers';

describe('游历 — the road', () => {
  it('only lists places the current 境界 can find', () => {
    const s = playableState();
    const reachable = reachablePlaces(s);
    expect(reachable.length).toBeGreaterThan(0);
    expect(reachable.length).toBeLessThan(PLACES.length);
    expect(reachable.every((r) => r.place.minRealm === 'chen')).toBe(true);
  });

  it('refuses a place the 境界 cannot yet reach, leaving you where you stood', () => {
    const s = withCharacter(playableState(), { coin: 9999 });
    const out = travel(s, 'taixu');
    expect(out.ok).toBe(false);
    expect(s.placeId).toBe('ningan');
  });

  it('refuses a place that is not on the map', () => {
    const s = withCharacter(playableState(), { coin: 9999 });
    expect(travel(s, '桃花源').ok).toBe(false);
  });

  it('refuses the fare when the purse is short', () => {
    const s = withCharacter(playableState(), { coin: 0 });
    const out = travel(s, 'zhulin');
    expect(out.ok).toBe(false);
    expect(out.message).toContain('盘缠');
    expect(s.placeId).toBe('ningan');
  });

  it('moves, charges the fare and records a first visit', () => {
    const s = withCharacter(playableState(), { coin: 400 });
    const fare = getPlace('zhulin')!.fare;
    const before = s.character!.coin;
    const out = travel(s, 'zhulin');
    expect(out.ok).toBe(true);
    expect(out.moved).toBe(true);
    expect(s.placeId).toBe('zhulin');
    expect(s.character!.coin).toBe(before - fare);
    expect(s.character!.visited).toContain('zhulin');
    expect(s.stats.placesSeen).toBe(s.character!.visited.length);
  });

  it('does not count the same place twice', () => {
    const s = withCharacter(playableState(), { coin: 400 });
    travel(s, 'zhulin');
    travel(s, 'ningan');
    travel(s, 'zhulin');
    expect(s.character!.visited.filter((p) => p === 'zhulin')).toHaveLength(1);
  });

  it('wanders for free when no destination is named, but still rolls the table', () => {
    const s = withCharacter(playableState(), { coin: 40 });
    const before = s.character!.coin;
    const rolls = s.rolls.length;
    const out = travel(s);
    expect(out.ok).toBe(true);
    expect(out.moved).toBe(false);
    expect(s.character!.coin).toBe(before);
    expect(s.rolls.length).toBeGreaterThan(rolls);
  });

  it('spends 心神 and gathers 心尘 on any journey', () => {
    const s = withCharacter(playableState(), { coin: 400, spirit: 80, dust: 10 });
    travel(s);
    expect(s.character!.spirit).toBeLessThanOrEqual(80 - WANDER_SPIRIT_COST);
    expect(s.character!.dust).toBeGreaterThan(10);
  });

  it('行脚 halves every fare', () => {
    const plain = withCharacter(playableState(), { coin: 400 });
    const walker = withCharacter(plain, { flags: { ...plain.character!.flags, 识药: true } });
    expect(isRoadWise(walker)).toBe(true);
    const place = getPlace('zhulin')!;
    expect(fareFor(walker, place)).toBe(Math.ceil(place.fare / 2));
    expect(fareFor(plain, place)).toBe(place.fare);
  });
});

describe('坊市 — the market', () => {
  it('sorts the shelf cheapest-first and never shows hidden goods', () => {
    const stock = marketStock(playableState());
    expect(stock.length).toBeGreaterThan(0);
    for (const item of stock) expect(item.hidden).not.toBe(true);
    for (let i = 1; i < stock.length; i += 1) {
      expect(stock[i]!.price).toBeGreaterThanOrEqual(stock[i - 1]!.price);
    }
  });

  it('gates high-realm goods off a beginner shelf', () => {
    const s = playableState();
    const gated = ITEMS.find((i) => i.minRealm !== undefined && i.minRealm !== 'chen');
    expect(gated).toBeDefined();
    expect(marketStock(s).some((i) => i.id === gated!.id)).toBe(false);
  });

  it('always sells back for less than it costs — the shop is not an exploit', () => {
    const s = playableState();
    for (const item of marketStock(s).slice(0, 12)) {
      expect(sellPrice(item)).toBeLessThan(buyPrice(s, item));
      expect(sellPrice(item)).toBe(Math.max(1, Math.floor(item.price * SELL_RATE)));
    }
  });

  it('buying moves coin into the satchel', () => {
    const s = withCharacter(playableState(), { coin: 1000 });
    const item = marketStock(s)[0]!;
    const cost = buyPrice(s, item);
    const out = buy(s, item.id, 2);
    expect(out.ok).toBe(true);
    expect(s.character!.coin).toBe(1000 - cost * 2);
    expect(countOf(s.character!, item.id)).toBe(2);
  });

  it('refuses a purchase the purse cannot cover', () => {
    const s = withCharacter(playableState(), { coin: 0 });
    const item = marketStock(s)[0]!;
    expect(buy(s, item.id).ok).toBe(false);
    expect(countOf(s.character!, item.id)).toBe(0);
  });

  it('refuses nonsensical quantities', () => {
    const s = withCharacter(playableState(), { coin: 1000 });
    const item = marketStock(s)[0]!;
    expect(buy(s, item.id, 0).ok).toBe(false);
    expect(buy(s, item.id, -3).ok).toBe(false);
    expect(buy(s, item.id, 1.5).ok).toBe(false);
  });

  it('refuses to sell what is not in the satchel', () => {
    const s = withCharacter(playableState(), { coin: 100, inventory: [] });
    expect(sell(s, 'tea_cuya').ok).toBe(false);
  });

  it('sells no more than you actually hold', () => {
    const s = withCharacter(playableState(), { coin: 0, inventory: [] });
    addToInventory(s.character!, 'tea_cuya', 2);
    const out = sell(s, 'tea_cuya', 10);
    expect(out.ok).toBe(true);
    expect(countOf(s.character!, 'tea_cuya')).toBe(0);
    expect(s.character!.coin).toBe(sellPrice(getItem('tea_cuya')!) * 2);
  });
});

describe('行囊 — the satchel', () => {
  it('stacks rather than duplicating', () => {
    const s = playableState();
    const c = s.character!;
    c.inventory = [];
    addToInventory(c, 'tea_cuya', 1);
    addToInventory(c, 'tea_cuya', 3);
    expect(c.inventory).toHaveLength(1);
    expect(countOf(c, 'tea_cuya')).toBe(4);
  });

  it('splices an emptied stack out rather than leaving a zero', () => {
    const s = playableState();
    const c = s.character!;
    c.inventory = [];
    addToInventory(c, 'tea_cuya', 2);
    expect(removeFromInventory(c, 'tea_cuya', 5)).toBe(2);
    expect(c.inventory.every((st) => st.count > 0)).toBe(true);
    expect(countOf(c, 'tea_cuya')).toBe(0);
  });

  it('sorts the view by grade, best first', () => {
    const s = playableState();
    const c = s.character!;
    c.inventory = [];
    for (const item of ITEMS.slice(0, 8)) addToInventory(c, item.id, 1);
    const view = satchelView(c);
    for (let i = 1; i < view.length; i += 1) {
      expect(view[i]!.item.grade).toBeLessThanOrEqual(view[i - 1]!.item.grade);
    }
  });

  it('consumes a consumable and keeps a curio', () => {
    const consumable = ITEMS.find((i) => i.consumable === true && i.effect);
    const curio = ITEMS.find((i) => i.consumable !== true && i.effect);
    expect(consumable && curio).toBeTruthy();
    const s = playableState();
    const c = s.character!;
    c.inventory = [];
    addToInventory(c, consumable!.id, 1);
    addToInventory(c, curio!.id, 1);
    expect(consumeItem(s, consumable!.id).ok).toBe(true);
    expect(countOf(c, consumable!.id)).toBe(0);
    expect(consumeItem(s, curio!.id).ok).toBe(true);
    expect(countOf(c, curio!.id)).toBe(1);
  });

  it('refuses to use what is not held, or what does nothing', () => {
    const s = playableState();
    s.character!.inventory = [];
    expect(consumeItem(s, 'tea_cuya').ok).toBe(false);
    expect(consumeItem(s, 'no_such_item').ok).toBe(false);
  });
});

describe('精怪录 — favour', () => {
  it('clamps favour to its published band', () => {
    const s = playableState();
    adjustFavor(s, 'jinggui', 9999);
    expect(s.spirits.jinggui!.favor).toBe(FAVOR_MAX);
    adjustFavor(s, 'jinggui', -9999);
    expect(s.spirits.jinggui!.favor).toBe(FAVOR_MIN);
  });

  it('ignores an unknown being instead of throwing', () => {
    const s = playableState();
    expect(adjustFavor(s, '灶王爷', 10)).toBeNull();
  });

  it('marks a being as met the first time favour turns positive', () => {
    const s = playableState();
    expect(s.spirits.jinggui!.met).not.toBe(true);
    adjustFavor(s, 'jinggui', 5);
    expect(s.spirits.jinggui!.met).toBe(true);
  });

  it('fires each threshold exactly once, however often favour is nudged', () => {
    const s = playableState();
    adjustFavor(s, 'jinggui', 100);
    const crossedOnce = [...(s.spirits.jinggui!.crossed ?? [])];
    adjustFavor(s, 'jinggui', 5);
    expect(s.spirits.jinggui!.crossed).toEqual(crossedOnce);
  });

  it('counts a being as 相识 only at the published threshold', () => {
    const s = playableState();
    adjustFavor(s, 'jinggui', BEFRIENDED_AT - 1);
    expect(countBefriended(s)).toBe(0);
    adjustFavor(s, 'jinggui', 1);
    expect(countBefriended(s)).toBe(1);
    expect(s.stats.spiritsBefriended).toBe(1);
    expect(maxFavor(s)).toBe(BEFRIENDED_AT);
  });

  it('shows only beings whose home is here and whose realm gate is open', () => {
    const s = playableState();
    for (const being of spiritsHere(s)) expect(being.home).toBe(s.placeId);
    expect(visibleSpirits(s).length).toBeGreaterThanOrEqual(spiritsHere(s).length);
  });

  it('gifts an item to a being who is present, and refuses one who is not', () => {
    const s = playableState();
    const c = s.character!;
    c.inventory = [];
    addToInventory(c, 'tea_cuya', 2);
    const before = s.spirits.jinggui!.favor;
    expect(giftItem(s, 'jinggui', 'tea_cuya').ok).toBe(true);
    expect(s.spirits.jinggui!.favor).toBeGreaterThan(before);
    expect(countOf(c, 'tea_cuya')).toBe(1);
    expect(giftItem(s, 'zhuxian', 'tea_cuya').ok).toBe(false);
  });
});
