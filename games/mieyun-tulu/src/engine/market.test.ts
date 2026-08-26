import { describe, expect, it } from 'vitest';
import { itemById, ITEMS } from '@/data/items';
import { derive } from './derived';
import {
  buyItem,
  buyPrice,
  equipItem,
  marketList,
  SELL_RATIO,
  sellItem,
  sellPrice,
  unequipSlot,
  consumeItem,
} from './market';
import { countItem } from './util';
import { forceRealm, give, newRun, setCalamity } from '@/test/helpers';

describe('market · 价差', () => {
  it('sells for less than it buys, so churn is a loss', () => {
    const s = newRun('spread');
    for (const item of ITEMS.filter((i) => !i.noTrade && i.price > 0)) {
      expect(sellPrice(s, item)).toBeLessThan(buyPrice(s, item));
    }
  });

  it('never prices anything at zero', () => {
    const s = newRun('floor');
    for (const item of ITEMS.filter((i) => i.price > 0)) {
      expect(buyPrice(s, item)).toBeGreaterThanOrEqual(1);
      expect(sellPrice(s, item)).toBeGreaterThanOrEqual(1);
    }
  });

  it('gives 商行少东 a narrower spread than a 书生', () => {
    const merchant = newRun('spread-cmp', { originId: 'shanghang' });
    const scholar = newRun('spread-cmp', { originId: 'shusheng' });
    const item = itemById('huiyuandan')!;
    expect(buyPrice(merchant, item)).toBeLessThan(buyPrice(scholar, item));
    expect(sellPrice(merchant, item)).toBeGreaterThan(sellPrice(scholar, item));
    expect(derive(merchant.character!).marketDiscount).toBeGreaterThan(0);
  });

  it('keeps the merchant spread open — no arbitrage loop exists', () => {
    const merchant = newRun('arb', { originId: 'shanghang' });
    for (const item of ITEMS.filter((i) => !i.noTrade && i.price > 0)) {
      expect(sellPrice(merchant, item)).toBeLessThan(buyPrice(merchant, item));
    }
    expect(SELL_RATIO).toBeLessThan(1);
  });

  it('grows the shelf as the realm rises', () => {
    const low = marketList(newRun('shelf')).length;
    const high = marketList(forceRealm(newRun('shelf'), 'yuanshen')).length;
    expect(high).toBeGreaterThan(low);
  });

  it('never shelves 图录残卷', () => {
    const s = forceRealm(newRun('shelf-relic'), 'dongzhen');
    const ids = marketList(s).map((e) => e.item.id);
    expect(ids).not.toContain('tulu1');
    expect(ids).not.toContain('mieyuntulu');
  });
});

describe('market · 买卖', () => {
  it('moves stones into goods on a purchase', () => {
    const s = newRun('buy');
    s.character!.spiritStones = 1000;
    const cost = buyPrice(s, itemById('huiyuandan')!);
    buyItem(s, 'huiyuandan', 2);
    expect(s.character!.spiritStones).toBe(1000 - cost * 2);
    expect(countItem(s.character!.inventory, 'huiyuandan')).toBe(2);
  });

  it('refuses a purchase it cannot fund and changes nothing', () => {
    const s = newRun('poor');
    s.character!.spiritStones = 1;
    const log = buyItem(s, 'huiyuandan');
    expect(s.character!.spiritStones).toBe(1);
    expect(countItem(s.character!.inventory, 'huiyuandan')).toBe(0);
    expect(log[0]!.text).toContain('玄晶不足');
  });

  it('refuses stock above the buyer’s realm', () => {
    const s = newRun('gated');
    s.character!.spiritStones = 100000;
    const log = buyItem(s, 'xuanguangdan');
    expect(countItem(s.character!.inventory, 'xuanguangdan')).toBe(0);
    expect(log[0]!.text).toContain('非你此境');
  });

  it('refuses to trade 图录残卷 in either direction', () => {
    const s = give(newRun('notrade'), 'tulu1');
    s.character!.spiritStones = 100000;
    expect(buyItem(s, 'tulu1')[0]!.text).toContain('不入万法坊');
    expect(sellItem(s, 'tulu1')[0]!.text).toContain('不可易手');
    expect(countItem(s.character!.inventory, 'tulu1')).toBe(1);
  });

  it('credits a sale to the run ledger', () => {
    const s = give(newRun('sell'), 'huiyuandan', 3);
    const before = s.character!.spiritStones;
    const earned = s.stats.stonesEarned;
    const unit = sellPrice(s, itemById('huiyuandan')!);
    sellItem(s, 'huiyuandan', 3);
    expect(s.character!.spiritStones).toBe(before + unit * 3);
    expect(s.stats.stonesEarned).toBe(earned + unit * 3);
    expect(countItem(s.character!.inventory, 'huiyuandan')).toBe(0);
  });

  it('refuses to sell more than is carried', () => {
    const s = give(newRun('oversell'), 'huiyuandan', 1);
    const before = s.character!.spiritStones;
    expect(sellItem(s, 'huiyuandan', 5)[0]!.text).toContain('囊中不足');
    expect(s.character!.spiritStones).toBe(before);
    expect(countItem(s.character!.inventory, 'huiyuandan')).toBe(1);
  });

  it('strips the equipment slot when the last copy is sold', () => {
    const s = give(newRun('sell-worn'), 'tiedao', 1);
    equipItem(s, 'tiedao');
    expect(s.character!.equipped.weapon).toBe('tiedao');
    sellItem(s, 'tiedao', 1);
    expect(s.character!.equipped.weapon).toBeUndefined();
  });
});

describe('market · 服食与佩用', () => {
  it('consumes a pill and heals', () => {
    const s = give(newRun('pill'), 'jinchuangyao', 1);
    s.character!.hp = 5;
    consumeItem(s, 'jinchuangyao');
    expect(s.character!.hp).toBeGreaterThan(5);
    expect(countItem(s.character!.inventory, 'jinchuangyao')).toBe(0);
  });

  it('never heals past the ceiling', () => {
    const s = give(newRun('overheal'), 'huiyuandan', 1);
    const c = s.character!;
    c.hp = c.maxHp;
    consumeItem(s, 'huiyuandan');
    expect(c.hp).toBe(c.maxHp);
  });

  it('gives 药童 more from the same pill', () => {
    const plain = give(newRun('pill-cmp', { originId: 'shusheng' }), 'jinchuangyao', 1);
    const herbalist = give(newRun('pill-cmp', { originId: 'yaotong' }), 'jinchuangyao', 1);
    plain.character!.hp = 1;
    herbalist.character!.hp = 1;
    consumeItem(plain, 'jinchuangyao');
    consumeItem(herbalist, 'jinchuangyao');
    expect(herbalist.character!.hp).toBeGreaterThan(plain.character!.hp);
    expect(derive(herbalist.character!).pillMult).toBeGreaterThan(1);
  });

  it('reads a relic without spending it', () => {
    const s = give(newRun('relic'), 'tulu1', 1);
    consumeItem(s, 'tulu1');
    expect(countItem(s.character!.inventory, 'tulu1')).toBe(1);
  });

  it('refuses to eat a sword', () => {
    const s = give(newRun('eat-sword'), 'tiedao', 1);
    expect(consumeItem(s, 'tiedao')[0]!.text).toContain('并非服食之物');
    expect(countItem(s.character!.inventory, 'tiedao')).toBe(1);
  });

  it('refuses to use what is not carried', () => {
    expect(consumeItem(newRun('empty'), 'huiyuandan')[0]!.text).toContain('囊中无此物');
  });

  it('shelves a 静心丹 injury cure and drops the 劫运 it promises', () => {
    const s = give(newRun('cure'), 'jingxindan', 1);
    setCalamity(s, 40);
    s.character!.injuries.push({
      id: 'xinmoZhong',
      name: '心魔种',
      severity: 2,
      turnsLeft: 6,
      effect: { cultivation: -0.2 },
    });
    consumeItem(s, 'jingxindan');
    expect(s.character!.injuries).toHaveLength(0);
    expect(s.character!.calamity.value).toBeLessThan(40);
  });

  it('equips gear, raises the pools, and restores them on removal', () => {
    const s = give(newRun('gear'), 'buyipao', 1);
    const bare = s.character!.maxHp;
    equipItem(s, 'buyipao');
    expect(s.character!.equipped.robe).toBe('buyipao');
    expect(derive(s.character!).defense).toBeGreaterThan(0);
    unequipSlot(s, 'robe');
    expect(s.character!.equipped.robe).toBeUndefined();
    expect(s.character!.maxHp).toBe(bare);
  });

  it('refuses to equip a pill', () => {
    const s = give(newRun('wear-pill'), 'huiyuandan', 1);
    expect(equipItem(s, 'huiyuandan')[0]!.text).toContain('不可佩用');
    expect(s.character!.equipped.weapon).toBeUndefined();
  });

  it('keeps hp and mana inside their pools after any equipment change', () => {
    const s = give(newRun('clamp-gear'), 'lingcanjia', 1);
    const c = s.character!;
    equipItem(s, 'lingcanjia');
    expect(c.hp).toBeLessThanOrEqual(c.maxHp);
    unequipSlot(s, 'robe');
    expect(c.hp).toBeLessThanOrEqual(c.maxHp);
    expect(c.mana).toBeLessThanOrEqual(c.maxMana);
  });
});
