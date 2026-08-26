import type { AllocationInput, GameState } from '@/engine';
import {
  allocateAttributes,
  chooseOrigin,
  newGame,
  rollChessAffinity,
  setIdentity,
} from '@/engine';

export const TEST_SEED = '棋-test-0001';

export const EVEN_ALLOC: AllocationInput = { xinJing: 7, wuXing: 7, caiXue: 7, qiYun: 7 };

/** Walk the whole creation gate and return a state in the playing phase. */
export function playingState(
  seed = TEST_SEED,
  originId = 'shusheng',
  alloc: AllocationInput = EVEN_ALLOC,
): GameState {
  let s = newGame(seed);
  s = setIdentity(s, '计缘', '青竹');
  s = chooseOrigin(s, originId);
  s = allocateAttributes(s, alloc);
  s = rollChessAffinity(s);
  return s;
}
