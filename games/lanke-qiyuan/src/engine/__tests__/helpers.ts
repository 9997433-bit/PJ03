import { drawChessAffinity, newGame, setAttributes, setName, setOrigin } from '../creation';
import { runCommand } from '../turn';
import type { Command, GameState } from '../types';

/** A finished character on a fixed seed — the base fixture for most tests. */
export function playableState(seed = '测试-烂柯-1', originId = 'qiguan'): GameState {
  const state = newGame(seed);
  setName(state, '王质', '观棋子');
  setOrigin(state, originId);
  setAttributes(state, { xinJing: 7, wuXing: 7, caiXue: 7, qiYun: 7 });
  drawChessAffinity(state);
  return state;
}

/** Runs a sequence of commands, asserting nothing; returns the final state. */
export function runAll(state: GameState, cmds: readonly Command[]): GameState {
  let s = state;
  for (const cmd of cmds) {
    const result = runCommand(s, cmd);
    if (result.accepted) s = result.state;
  }
  return s;
}

/** Force-sets fields the normal loop would take hundreds of turns to reach. */
export function withCharacter(
  state: GameState,
  patch: Partial<NonNullable<GameState['character']>>,
): GameState {
  const next = structuredClone(state);
  if (next.character) Object.assign(next.character, patch);
  return next;
}
