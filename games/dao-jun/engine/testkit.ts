/**
 * testkit.ts — shared fixtures and the headless bot driver used by the
 * reachability suite. Not imported by `index.ts`, so none of it ships.
 */

import { availableTactics } from './combat';
import { EVENTS } from './content';
import { engravePattern } from './daoPattern';
import { chooseEvent, createGame, fightRound, performAction, resolveMilestone, useItem } from './game';
import type {
  CombatTactic,
  CoreAction,
  CreationOptions,
  Effect,
  EndingKey,
  GameState,
} from './types';

export const BASE_OPTIONS: CreationOptions = {
  name: '宁玄',
  origin: 'mountain',
  path: '剑',
  vow: 'guard',
};

export function newGame(overrides: Partial<CreationOptions> = {}, seed = 1): GameState {
  return createGame({ ...BASE_OPTIONS, ...overrides }, seed);
}

/**
 * Engrave `count` patterns straight onto a state, keeping `namedPatterns` in
 * step with `engraved` so the audit invariants stay satisfied.
 */
export function grantPatterns(state: GameState, count: number): void {
  for (let i = 0; i < count; i += 1) {
    state.daoPattern = engravePattern(
      { ...state.daoPattern, insight: 9999, harmony: 100 },
      state.character.path,
    );
  }
  state.daoPattern.insight = 0;
  state.daoPattern.harmony = 50;
}

/** Consume an item when it is actually in the bag; otherwise pass the state through. */
export function useItemIfHeld(state: GameState, itemId: string): GameState {
  const used = useItem(state, itemId);
  return used.ok ? used.state : state;
}

// ============================================================================
// Bot driver
// ============================================================================

export type EffectWeights = Partial<Record<keyof Effect, number>>;

/** Score both branches of the pending event and take the better one. */
export function chooseByWeights(state: GameState, weights: EffectWeights): 0 | 1 {
  const event = EVENTS.find((item) => item.id === state.pendingEvent);
  if (!event) return 0;
  // Staying alive outranks any long-term plan.
  const survival: EffectWeights =
    state.soul.stability <= 24
      ? { stability: 8, soul: 1 }
      : state.character.health <= state.character.maxHealth * 0.3
        ? { health: 8 }
        : {};
  const merged = { ...weights, ...survival };
  const score = (effect: Effect): number => {
    let total = 0;
    for (const [key, weight] of Object.entries(merged)) {
      const value = effect[key as keyof Effect];
      if (typeof value === 'number') total += value * (weight ?? 0);
    }
    return total;
  };
  return score(event.choices[1].effect) > score(event.choices[0].effect) ? 1 : 0;
}

export interface Bot {
  name: string;
  options: Partial<CreationOptions>;
  /** Which core action to take in the free phase. */
  act(state: GameState): CoreAction;
  /** Which combat tactic to use; defaults to 力破. */
  tactic?(state: GameState): CombatTactic;
  /** Which event branch to take; defaults to a balanced weighting. */
  event?(state: GameState): 0 | 1;
  /** Accept the offered milestone ending? Defaults to declining everything. */
  milestone?(state: GameState, offered: EndingKey): boolean;
  /** Free-phase shopping; returns the state to continue from. */
  trade?(state: GameState): GameState;
}

const DEFAULT_WEIGHTS: EffectWeights = {
  insight: 1,
  soul: 0.6,
  stability: 1.2,
  harmony: 1,
  health: 0.4,
};

export interface BotRun {
  state: GameState;
  ending: EndingKey | null;
  turns: number;
}

/**
 * Play one life to its end (or until the turn budget runs out), dispatching on
 * the current phase: milestone offer → duel round → pending event → action.
 */
export function playBot(bot: Bot, seed: number, maxTurns = 900): BotRun {
  let state = newGame(bot.options, seed);
  let guard = maxTurns * 30;

  while (!state.ending && state.turn < maxTurns && guard > 0) {
    guard -= 1;

    if (state.pendingMilestone) {
      const accept = bot.milestone?.(state, state.pendingMilestone) ?? false;
      state = resolveMilestone(state, accept).state;
      continue;
    }
    if (state.combat) {
      const wanted = bot.tactic?.(state) ?? '力破';
      const attempt = fightRound(state, wanted);
      state = attempt.ok
        ? attempt.state
        : fightRound(state, availableTactics(state)[0] ?? '周旋').state;
      continue;
    }
    if (state.pendingEvent) {
      state = chooseEvent(state, bot.event?.(state) ?? chooseByWeights(state, DEFAULT_WEIGHTS)).state;
      continue;
    }
    if (bot.trade) {
      state = bot.trade(state);
      if (state.pendingMilestone || state.pendingEvent || state.combat || state.ending) continue;
    }
    const attempt = performAction(state, bot.act(state));
    state = attempt.ok ? attempt.state : performAction(state, '调息').state;
  }

  return { state, ending: state.ending, turns: state.turn };
}
