/**
 * endings.test.ts — the opt-in milestone contract.
 *
 * Terminal outcomes (death / old age / the four 道君 ascensions) still fire on
 * their own. Everything else is offered: the run pauses, the player answers,
 * and a declined milestone is gone for good.
 */

import { describe, expect, it } from 'vitest';
import {
  MILESTONE_ENDINGS,
  TERMINAL_ENDINGS,
  actionAvailability,
  chooseEvent,
  evaluateEnding,
  evaluateMilestone,
  getEnding,
  performAction,
  resolveMilestone,
} from './game';
import { ENDINGS } from './content';
import { grantPatterns, newGame } from './testkit';
import { REALMS, type GameState } from './types';

/** Push a state to the doorstep of one milestone without tripping any other. */
function onTheBrinkOf(key: string): GameState {
  const state = newGame({ vow: 'freedom' }, 5);
  switch (key) {
    case 'conqueror':
      state.character.realm = 4;
      state.territory.nodes = 10;
      break;
    case 'patternSage':
      grantPatterns(state, 14);
      break;
    case 'soulAscendant':
      state.character.realm = 4;
      state.soul.maxPower = 180;
      state.soul.power = 40;
      break;
    case 'magnate':
      state.territory.spiritStones = 1500;
      break;
    case 'benevolent':
      state.character.karma = 120;
      state.character.reputation = 100;
      break;
    case 'wanderer':
      state.character.realm = 2;
      state.character.age = 96;
      break;
    default:
      throw new Error(`unknown milestone ${key}`);
  }
  return state;
}

describe('ending taxonomy', () => {
  it('splits the twelve endings into six terminal and six milestone outcomes', () => {
    expect(ENDINGS).toHaveLength(12);
    expect(TERMINAL_ENDINGS).toHaveLength(6);
    expect(MILESTONE_ENDINGS).toHaveLength(6);
    expect([...TERMINAL_ENDINGS, ...MILESTONE_ENDINGS].sort()).toEqual(
      ENDINGS.map((ending) => ending.id).sort(),
    );
  });

  it('wires every declared ending to a definition', () => {
    for (const key of [...TERMINAL_ENDINGS, ...MILESTONE_ENDINGS]) {
      expect(getEnding(key)).not.toBeNull();
    }
  });

  it('never returns a milestone from the terminal evaluator', () => {
    for (const key of MILESTONE_ENDINGS) {
      expect(evaluateEnding(onTheBrinkOf(key))).toBeNull();
    }
  });

  it('offers each milestone once its own threshold is met', () => {
    for (const key of MILESTONE_ENDINGS) {
      expect(evaluateMilestone(onTheBrinkOf(key))).toBe(key);
    }
  });

  it('offers nothing at the start of a life', () => {
    expect(evaluateMilestone(newGame())).toBeNull();
    expect(evaluateEnding(newGame())).toBeNull();
  });
});

describe('milestone offers', () => {
  it('pauses the run with a question rather than an ending', () => {
    const brink = onTheBrinkOf('magnate');
    const after = performAction(brink, '调息').state;
    expect(after.ending).toBeNull();
    expect(after.pendingMilestone).toBe('magnate');
    expect(after.pendingEvent).toBeNull();
  });

  it('blocks every action until the question is answered', () => {
    const after = performAction(onTheBrinkOf('magnate'), '调息').state;
    expect(actionAvailability(after, '悟道')).toMatchObject({
      available: false,
      reason: '先回应天道之问',
    });
  });

  it('closes the life when the offer is accepted', () => {
    const offered = performAction(onTheBrinkOf('magnate'), '调息').state;
    const accepted = resolveMilestone(offered, true);
    expect(accepted.ok).toBe(true);
    expect(accepted.state.ending).toBe('magnate');
    expect(accepted.state.pendingMilestone).toBeNull();
  });

  it('keeps the life running when the offer is declined', () => {
    const offered = performAction(onTheBrinkOf('magnate'), '调息').state;
    const declined = resolveMilestone(offered, false);
    expect(declined.ok).toBe(true);
    expect(declined.state.ending).toBeNull();
    expect(declined.state.pendingMilestone).toBeNull();
    expect(declined.state.declinedEndings).toContain('magnate');
    expect(actionAvailability(declined.state, '悟道').available).toBe(true);
  });

  it('never re-offers a declined milestone', () => {
    const offered = performAction(onTheBrinkOf('magnate'), '调息').state;
    const declined = resolveMilestone(offered, false).state;
    expect(evaluateMilestone(declined)).toBeNull();
    let state = declined;
    for (let i = 0; i < 6; i += 1) {
      state = performAction(state, '调息').state;
      expect(state.pendingMilestone).toBeNull();
      if (state.pendingEvent) state = chooseEvent(state, 0).state;
    }
  });

  it('still offers a different milestone after one is declined', () => {
    const state = onTheBrinkOf('magnate');
    state.declinedEndings = ['magnate'];
    state.daoPattern.insight = 0;
    grantPatterns(state, 14);
    expect(evaluateMilestone(state)).toBe('patternSage');
  });

  it('refuses an answer when nothing was asked', () => {
    expect(resolveMilestone(newGame(), true)).toMatchObject({ ok: false, message: '天道并未垂问' });
  });

  it('seals the answer into the audit chain', () => {
    const offered = performAction(onTheBrinkOf('magnate'), '调息').state;
    const declined = resolveMilestone(offered, false).state;
    expect(declined.auditChain.at(-1)!.command).toBe('续道:magnate');
    expect(declined.auditHash).not.toBe(offered.auditHash);
  });
});

describe('terminal outcomes still fire on their own', () => {
  it('death outranks everything', () => {
    const state = onTheBrinkOf('magnate');
    state.character.health = 0;
    expect(evaluateEnding(state)).toBe('death');
  });

  it('a shattered soul is also death', () => {
    const state = newGame();
    state.soul.stability = 0;
    expect(evaluateEnding(state)).toBe('death');
  });

  it('old age closes a life that outlives its span', () => {
    const state = newGame();
    state.character.age = state.character.lifespan;
    expect(evaluateEnding(state)).toBe('oldAge');
  });

  it('each dao path ascends to its own 道君 ending', () => {
    const paths = { 剑: 'swordSupreme', 法: 'spellSupreme', 体: 'bodySupreme', 神: 'soulSupreme' } as const;
    for (const [path, ending] of Object.entries(paths)) {
      const state = newGame({ path: path as keyof typeof paths });
      state.character.realm = REALMS.length - 1;
      expect(evaluateEnding(state)).toBe(ending);
    }
  });

  it('a milestone offer is dropped the moment a terminal outcome lands', () => {
    const state = onTheBrinkOf('magnate');
    state.character.health = 6;
    state.soul.power = 0;
    const after = performAction(state, '斗法').state;
    expect(after.pendingMilestone === null || after.ending === null).toBe(true);
  });
});
