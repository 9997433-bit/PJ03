/**
 * reachability.test.ts — the anti-occlusion proof.
 *
 * Round 2's audit found that 320 headless runs only ever touched 4 of the 12
 * endings: milestone outcomes fired the instant a threshold was crossed, so
 * every long game got hijacked on its way to 道君. Milestones are now offers
 * (`pendingMilestone` → accept or decline), and this suite plays one targeted
 * bot per ending to show that all twelve are actually attainable from
 * character creation using nothing but legal commands.
 */

import { describe, expect, it } from 'vitest';
import { CHARGE_SOUL_COST } from './combat';
import { ENDINGS, ITEMS } from './content';
import { insightNeeded, patternsForBreakthrough } from './daoPattern';
import { actionAvailability, buyItem, sellItem } from './game';
import { RARITY_MIN_REALM } from './market';
import { chooseByWeights, playBot, useItemIfHeld, type Bot } from './testkit';
import type { CombatTactic, CoreAction, DaoPath, EndingKey, GameState } from './types';

const SEEDS = [1, 7, 19, 33, 101, 404, 777, 2024];

function firstAvailable(state: GameState, ...preferences: CoreAction[]): CoreAction {
  return preferences.find((action) => actionAvailability(state, action).available) ?? '调息';
}

/** The duel policy every bot shares: bank a charge, hunt an opening, run when hurt. */
function smartTactic(state: GameState): CombatTactic {
  const combat = state.combat!;
  const c = state.character;
  if (c.health < c.maxHealth * 0.3) return '遁土';
  if (combat.charged || combat.opening) return '力破';
  if (combat.round === 1 && state.soul.power >= CHARGE_SOUL_COST) return '布纹';
  return combat.round % 2 === 0 ? '周旋' : '力破';
}

/** Climb toward the next breakthrough: patterns first, then soul, then land. */
function climb(state: GameState): CoreAction {
  if (actionAvailability(state, '突破').available) return '突破';
  const c = state.character;
  if (state.daoPattern.engraved < patternsForBreakthrough(c.realm)) {
    if (actionAvailability(state, '凝纹').available) return '凝纹';
    if (state.daoPattern.insight < insightNeeded(state.daoPattern.engraved) && state.soul.power >= 6) {
      return '悟道';
    }
    return '调息';
  }
  if (state.territory.nodes < Math.floor(c.realm / 2)) return firstAvailable(state, '占地', '调息');
  return '调息';
}

function supremeBot(path: DaoPath, target: EndingKey): Bot {
  return {
    name: `道君·${path}`,
    options: { path, vow: 'supreme' },
    act: climb,
    tactic: smartTactic,
    event: (state) => chooseByWeights(state, { insight: 1, harmony: 1.6, stability: 1.4, soul: 0.8, maxSoul: 2 }),
    milestone: (_state, offered) => offered === target,
  };
}

const BOTS: Record<EndingKey, Bot> = {
  swordSupreme: supremeBot('剑', 'swordSupreme'),
  spellSupreme: supremeBot('法', 'spellSupreme'),
  bodySupreme: supremeBot('体', 'bodySupreme'),
  soulSupreme: supremeBot('神', 'soulSupreme'),

  death: {
    name: '寻死者',
    options: { path: '法', vow: 'supreme' },
    act: (state) => firstAvailable(state, '斗法', '调息'),
    // Never strike back: every failed 遁 emboldens the foe by another 12%.
    tactic: () => '遁土',
    event: (state) => chooseByWeights(state, { stability: -1, health: -1, soul: -1 }),
    milestone: () => false,
  },

  oldAge: {
    name: '守拙者',
    options: { path: '体', vow: 'mercy' },
    // Never engrave, never break through: lifespan stays at its mortal 112.
    act: (state) => (state.soul.power >= 6 ? '悟道' : '调息'),
    event: (state) => chooseByWeights(state, { stability: 2, health: 1.5, soul: 1 }),
    milestone: () => false,
  },

  patternSage: {
    name: '刻纹狂徒',
    options: { path: '神', vow: 'supreme' },
    act: (state) => {
      if (actionAvailability(state, '凝纹').available) return '凝纹';
      if (state.daoPattern.harmony < 24) return '调息';
      return state.soul.power >= 6 ? '悟道' : '调息';
    },
    event: (state) => chooseByWeights(state, { insight: 1.4, harmony: 2, stability: 1.2, soul: 0.8 }),
    milestone: (_state, offered) => offered === 'patternSage',
  },

  conqueror: {
    name: '开疆者',
    options: { path: '体', vow: 'guard' },
    act: (state) => (state.character.realm < 4 ? climb(state) : firstAvailable(state, '占地', '调息')),
    tactic: smartTactic,
    event: (state) => chooseByWeights(state, { control: 2, food: 1.2, nodes: 3, influence: 1, stability: 1 }),
    milestone: (_state, offered) => offered === 'conqueror',
  },

  soulAscendant: {
    name: '炼魂客',
    options: { path: '神', vow: 'freedom' },
    act: (state) => {
      if (state.character.realm < 4) return climb(state);
      if (state.character.health < state.character.maxHealth * 0.6) return '调息';
      return firstAvailable(state, '斗法', '占地', '调息');
    },
    tactic: smartTactic,
    event: (state) => chooseByWeights(state, { maxSoul: 4, soul: 1, stability: 1.4, spiritStones: 0.4 }),
    // 雷髓液 is the only repeatable 神魂上限 source — buy it, drink it, repeat.
    trade: (state) => {
      if (state.character.realm < RARITY_MIN_REALM['地'] || state.soul.maxPower >= 180) return state;
      const bought = buyItem(state, 'thunder-marrow');
      return bought.ok ? useItemIfHeld(bought.state, 'thunder-marrow') : state;
    },
    milestone: (_state, offered) => offered === 'soulAscendant',
  },

  magnate: {
    name: '积石者',
    options: { path: '剑', vow: 'supreme' },
    act: (state) => {
      if (state.character.realm < 3) return climb(state);
      if (state.character.health < state.character.maxHealth * 0.6) return '调息';
      return firstAvailable(state, '斗法', '占地', '调息');
    },
    tactic: smartTactic,
    event: (state) => chooseByWeights(state, { spiritStones: 2, influence: 1, control: 0.6, stability: 1 }),
    // Loot is dead weight; the 法会 turns it into 玄玉.
    trade: (state) => {
      const spare = state.inventory.find(
        (id) => ITEMS.find((item) => item.id === id)?.rarity !== '凡',
      );
      if (!spare) return state;
      const sold = sellItem(state, spare);
      return sold.ok ? sold.state : state;
    },
    milestone: (_state, offered) => offered === 'magnate',
  },

  benevolent: {
    name: '济世者',
    options: { path: '法', vow: 'mercy' },
    act: (state) => {
      if (state.character.realm < 2) return climb(state);
      return state.soul.power >= 6 ? '悟道' : '调息';
    },
    event: (state) => chooseByWeights(state, { karma: 3, reputation: 3, stability: 1.2 }),
    milestone: (_state, offered) => offered === 'benevolent',
  },

  wanderer: {
    name: '云外客',
    options: { path: '剑', vow: 'freedom' },
    act: (state) => {
      if (state.character.realm < 2) return climb(state);
      return state.soul.power >= 6 ? '悟道' : '调息';
    },
    event: (state) => chooseByWeights(state, { stability: 2, health: 1.5, soul: 1, harmony: 1 }),
    milestone: (_state, offered) => offered === 'wanderer',
  },
};

/** Play a bot across seeds, stopping at the first run that lands its ending. */
function reach(bot: Bot, target: EndingKey): { hit: boolean; seen: EndingKey[] } {
  const seen: EndingKey[] = [];
  for (const seed of SEEDS) {
    const run = playBot(bot, seed, 1200);
    if (run.ending) seen.push(run.ending);
    if (run.ending === target) return { hit: true, seen };
  }
  return { hit: false, seen };
}

describe('ending reachability (headless bots)', () => {
  const reached = new Set<EndingKey>();

  for (const ending of ENDINGS) {
    it(`a bot can reach 「${ending.title}」(${ending.id})`, () => {
      const bot = BOTS[ending.id];
      const result = reach(bot, ending.id);
      expect(
        result.hit,
        `${bot.name} never reached ${ending.id}; saw: ${result.seen.join(', ') || '(no ending)'}`,
      ).toBe(true);
      reached.add(ending.id);
    });
  }

  it('covers all twelve endings', () => {
    expect(ENDINGS).toHaveLength(12);
    expect(reached.size).toBe(ENDINGS.length);
  });
});
