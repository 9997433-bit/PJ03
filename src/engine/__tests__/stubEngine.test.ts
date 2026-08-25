import { describe, expect, it } from 'vitest';
import {
  attemptBreakthrough,
  beginCreation,
  creationAllocate,
  creationChooseOrigin,
  creationEnterWorld,
  creationHiddenRoll,
  creationRollSpiritRoot,
  runCommand,
} from '../stubEngine';
import type { GameState } from '../types';

const FARMER_ALLOC = { genGu: 10, wuXing: 7, xinXing: 8, qiYun: 8 };

function finishCreation(name: string): GameState {
  let s = beginCreation();
  s = creationChooseOrigin(s, 'farmer', name, '男');
  s = creationAllocate(s, FARMER_ALLOC);
  s = creationRollSpiritRoot(s);
  s = creationHiddenRoll(s);
  s = creationEnterWorld(s);
  return s;
}

describe('stubEngine — creation & play loop', () => {
  it('runs the full 4-step creation and enters the world', () => {
    let s = beginCreation();
    s = creationChooseOrigin(s, 'farmer', '韩立', '男');
    expect(s.creationStep).toBe(1);

    s = creationAllocate(s, FARMER_ALLOC);
    expect(s.creationStep).toBe(2);

    s = creationRollSpiritRoot(s);
    expect(s.creationStep).toBe(3);

    s = creationHiddenRoll(s);
    expect(s.creationStep).toBe(4);

    s = creationEnterWorld(s);
    expect(s.phase).toBe('playing');
    expect(s.turn).toBe(1);
  });

  it('修炼 increases exp', () => {
    const s = finishCreation('测试');
    expect(s.phase).toBe('playing');
    const expBefore = s.character!.realm.exp;
    const out = runCommand(s, '修炼');
    expect(out.state.character!.realm.exp).toBeGreaterThan(expBefore);
  });

  it('突破 does not throw when invoked', () => {
    let s = finishCreation('突破测试');
    expect(s.phase).toBe('playing');

    for (let i = 0; i < 500 && s.phase === 'playing'; i++) {
      s = runCommand(s, '修炼').state;
    }

    const { result } = attemptBreakthrough(s);
    if (result) {
      expect(result.roll).toBeGreaterThan(0);
      expect(result.chance).toBeGreaterThan(0);
    }
    expect(['playing', 'ended', 'combat']).toContain(s.phase);
  });
});
