import { describe, expect, it } from 'vitest';
import {
  INFLUENCE_DISCOUNT_AT,
  INVENTORY_LIMIT,
  RARITY_MIN_REALM,
  RARITY_PRICE,
  SELL_RATE,
  WANDERER_SELL_RATE,
  buyPrice,
  canBuy,
  canSell,
  isStocked,
  listPrice,
  marketStock,
  sellPrice,
} from './market';
import { ITEMS } from './content';
import { buyItem, performAction, sellItem } from './game';
import { newGame } from './testkit';
import type { GameItem, GameState } from './types';

const item = (id: string): GameItem => ITEMS.find((candidate) => candidate.id === id)!;

const rich = (stones = 2000, mutate: (state: GameState) => void = () => {}): GameState => {
  const state = newGame({}, 4);
  state.territory.spiritStones = stones;
  mutate(state);
  return state;
};

describe('price table', () => {
  it('prices each rarity above the one below it', () => {
    expect(RARITY_PRICE['凡']).toBeLessThan(RARITY_PRICE['玄']);
    expect(RARITY_PRICE['玄']).toBeLessThan(RARITY_PRICE['地']);
    expect(RARITY_PRICE['地']).toBeLessThan(RARITY_PRICE['天']);
  });

  it('gives every shipped item a positive list price', () => {
    expect(ITEMS.every((candidate) => listPrice(candidate) > 0)).toBe(true);
  });

  it('sells back below the buy price', () => {
    const state = rich();
    for (const candidate of ITEMS) {
      expect(sellPrice(state, candidate)).toBeLessThan(buyPrice(state, candidate));
    }
  });

  it('applies the documented sell rate', () => {
    expect(sellPrice(rich(), item('soul-pill'))).toBe(Math.floor(RARITY_PRICE['凡'] * SELL_RATE));
  });

  it('gives 江湖散修 a better fence rate', () => {
    const wanderer = newGame({ origin: 'wanderer' }, 4);
    expect(sellPrice(wanderer, item('soul-pill'))).toBe(
      Math.floor(RARITY_PRICE['凡'] * WANDERER_SELL_RATE),
    );
    expect(sellPrice(wanderer, item('soul-pill'))).toBeGreaterThan(sellPrice(rich(), item('soul-pill')));
  });

  it('discounts purchases once 威势 is high enough', () => {
    const famous = rich(2000, (state) => {
      state.territory.influence = INFLUENCE_DISCOUNT_AT;
    });
    expect(buyPrice(famous, item('soul-pill'))).toBeLessThan(buyPrice(rich(), item('soul-pill')));
  });
});

describe('realm-gated stock', () => {
  it('shows only 凡品 at 观纹', () => {
    expect(marketStock(newGame()).every((candidate) => candidate.rarity === '凡')).toBe(true);
  });

  it('widens the shelves at each gate', () => {
    let previous = -1;
    for (let realm = 0; realm <= 6; realm += 1) {
      const state = newGame();
      state.character.realm = realm;
      const size = marketStock(state).length;
      expect(size).toBeGreaterThanOrEqual(previous);
      previous = size;
    }
  });

  it('stocks every item once 道君 is reached', () => {
    const state = newGame();
    state.character.realm = 6;
    expect(marketStock(state)).toHaveLength(ITEMS.length);
  });

  it('keeps 天品 off the shelves before 合道', () => {
    const state = newGame();
    state.character.realm = RARITY_MIN_REALM['天'] - 1;
    expect(isStocked(state, 'heaven-key')).toBe(false);
    state.character.realm = RARITY_MIN_REALM['天'];
    expect(isStocked(state, 'heaven-key')).toBe(true);
  });
});

describe('buying', () => {
  it('takes the stones and hands over the goods', () => {
    const state = rich(500);
    const result = buyItem(state, 'soul-pill');
    expect(result.ok).toBe(true);
    expect(result.state.territory.spiritStones).toBe(500 - buyPrice(state, item('soul-pill')));
    expect(result.state.inventory.filter((id) => id === 'soul-pill')).toHaveLength(2);
  });

  it('refuses a purchase the treasury cannot cover', () => {
    const state = rich(1);
    expect(canBuy(state, 'soul-pill').available).toBe(false);
    expect(buyItem(state, 'soul-pill')).toMatchObject({ ok: false, state });
  });

  it('refuses goods the realm has not unlocked', () => {
    expect(canBuy(rich(9000), 'heaven-key')).toMatchObject({
      available: false,
      reason: '天品需更高境界',
    });
  });

  it('refuses an unknown item id', () => {
    expect(canBuy(rich(), 'no-such-thing')).toMatchObject({ available: false, reason: '法会并无此物' });
  });

  it('refuses to trade mid-duel', () => {
    const state = performAction(rich(900), '斗法').state;
    expect(canBuy(state, 'soul-pill')).toMatchObject({ available: false, reason: '战中不可交易' });
    expect(canSell(state, 'soul-pill')).toMatchObject({ available: false, reason: '战中不可交易' });
  });

  it('refuses to trade after the ending is written', () => {
    const state = rich(900);
    state.ending = 'oldAge';
    expect(canBuy(state, 'soul-pill').available).toBe(false);
    expect(canSell(state, 'soul-pill').available).toBe(false);
  });

  it('refuses to overfill the 乾坤囊', () => {
    const state = rich(9000, (draft) => {
      draft.inventory = Array.from({ length: INVENTORY_LIMIT }, () => 'soul-pill');
    });
    expect(canBuy(state, 'soul-pill')).toMatchObject({ available: false, reason: '乾坤囊已满' });
  });

  it('seals the purchase into the audit chain', () => {
    const state = rich(500);
    const after = buyItem(state, 'soul-pill').state;
    expect(after.auditHash).not.toBe(state.auditHash);
    expect(after.auditChain.at(-1)!.command).toBe('购入:soul-pill');
  });

  it('does not consume a turn', () => {
    const state = rich(500);
    expect(buyItem(state, 'soul-pill').state.turn).toBe(state.turn);
  });
});

describe('selling', () => {
  it('hands over the goods for stones', () => {
    const state = rich(0);
    const result = sellItem(state, 'healing-pill');
    expect(result.ok).toBe(true);
    expect(result.state.territory.spiritStones).toBe(sellPrice(state, item('healing-pill')));
    expect(result.state.inventory).not.toContain('healing-pill');
  });

  it('refuses to sell what is not held', () => {
    expect(canSell(rich(), 'heaven-key')).toMatchObject({ available: false, reason: '行囊中没有此物' });
    expect(sellItem(rich(), 'heaven-key').ok).toBe(false);
  });

  it('sells one copy at a time', () => {
    const state = rich(0, (draft) => {
      draft.inventory = ['soul-pill', 'soul-pill', 'soul-pill'];
    });
    expect(sellItem(state, 'soul-pill').state.inventory.filter((id) => id === 'soul-pill')).toHaveLength(2);
  });

  it('never pushes the treasury past its cap', () => {
    const state = rich(9999, (draft) => {
      draft.inventory = ['dao-jade'];
    });
    expect(sellItem(state, 'dao-jade').state.territory.spiritStones).toBe(9999);
  });

  it('a buy-then-sell round trip loses money on the spread', () => {
    const bought = buyItem(rich(1000), 'soul-pill').state;
    expect(sellItem(bought, 'soul-pill').state.territory.spiritStones).toBeLessThan(1000);
  });
});
