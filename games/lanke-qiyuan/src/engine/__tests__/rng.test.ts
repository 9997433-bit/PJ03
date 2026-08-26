import { describe, expect, it } from 'vitest';
import {
  DIE_SIDES,
  generateSeed,
  initRngState,
  nextFloat,
  roll,
  rollD100,
  rollD20,
  rollD6,
  rollDie,
  rollPick,
  rollRange,
  rollWeighted,
  SEALED_REASON_MARKER,
} from '../rng';
import { playableState } from './helpers';
import type { Die } from '../types';

describe('rng — pure primitives', () => {
  it('derives the same initial state from the same seed', () => {
    expect(initRngState('烂柯')).toBe(initRngState('烂柯'));
  });

  it('derives different states from different seeds', () => {
    expect(initRngState('烂柯')).not.toBe(initRngState('烂柯 '));
  });

  it('encodes state as 8 hex characters', () => {
    expect(initRngState('x')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('rejects a corrupt state string', () => {
    expect(() => nextFloat('zzzz')).toThrow(/corrupt/);
  });

  it('produces floats inside [0,1)', () => {
    let s = initRngState('浮点');
    for (let i = 0; i < 500; i++) {
      const step = nextFloat(s);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThan(1);
      s = step.state;
    }
  });

  it('replays an identical sequence from the same seed', () => {
    const run = (): number[] => {
      let s = initRngState('复盘');
      const out: number[] = [];
      for (let i = 0; i < 60; i++) {
        const step = rollDie(s, 'D100');
        out.push(step.value);
        s = step.state;
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('keeps every die inside its face range', () => {
    const dice: Die[] = ['D100', 'D20', 'D6'];
    for (const die of dice) {
      let s = initRngState(`范围-${die}`);
      for (let i = 0; i < 400; i++) {
        const step = rollDie(s, die);
        expect(step.value).toBeGreaterThanOrEqual(1);
        expect(step.value).toBeLessThanOrEqual(DIE_SIDES[die]);
        s = step.state;
      }
    }
  });

  it('covers the whole D6 face set over many rolls', () => {
    let s = initRngState('六面');
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const step = rollD6(s);
      seen.add(step.value);
      s = step.state;
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('advances the state on every roll', () => {
    const a = initRngState('推进');
    const b = rollD20(a).state;
    const c = rollD100(b).state;
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('rng — audited gateway', () => {
  it('appends a numbered record with the pre-roll state', () => {
    const state = playableState();
    const before = state.rngState;
    const count = state.rolls.length;
    roll(state, 'D20', '试掷');
    expect(state.rolls).toHaveLength(count + 1);
    const record = state.rolls[state.rolls.length - 1]!;
    expect(record.seedState).toBe(before);
    expect(record.reason).toBe('试掷');
    expect(record.die).toBe('D20');
  });

  it('gives every roll a strictly increasing id', () => {
    const state = playableState();
    for (let i = 0; i < 20; i++) roll(state, 'D6', `序-${i}`);
    for (let i = 1; i < state.rolls.length; i++) {
      expect(state.rolls[i]!.id).toBeGreaterThan(state.rolls[i - 1]!.id);
    }
  });

  it('seals any roll whose reason carries 暗掷', () => {
    const state = playableState();
    roll(state, 'D100', `缘法·${SEALED_REASON_MARKER}`);
    expect(state.rolls[state.rolls.length - 1]!.sealed).toBe(true);
  });

  it('leaves ordinary rolls unsealed', () => {
    const state = playableState();
    roll(state, 'D100', '明掷');
    expect(state.rolls[state.rolls.length - 1]!.sealed).toBeUndefined();
  });

  it('counts every roll in the life statistics', () => {
    const state = playableState();
    const before = state.stats.totalRolls;
    roll(state, 'D6', 'a');
    roll(state, 'D6', 'b');
    expect(state.stats.totalRolls).toBe(before + 2);
  });

  it('keeps rollRange inside the requested bounds', () => {
    const state = playableState();
    for (let i = 0; i < 200; i++) {
      const v = rollRange(state, 3, 9, '区间');
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('picks only from the supplied options', () => {
    const state = playableState();
    const options = ['松', '竹', '云'] as const;
    for (let i = 0; i < 100; i++) {
      expect(options).toContain(rollPick(state, options, '抽'));
    }
  });

  it('refuses an empty pick', () => {
    const state = playableState();
    expect(() => rollPick(state, [], '空')).toThrow();
  });

  it('honours weights, favouring the heavy entry', () => {
    const state = playableState();
    let heavy = 0;
    for (let i = 0; i < 400; i++) {
      const picked = rollWeighted(
        state,
        [{ item: 'heavy', weight: 9 }, { item: 'light', weight: 1 }],
        '权重',
      );
      if (picked === 'heavy') heavy += 1;
    }
    expect(heavy).toBeGreaterThan(300);
  });

  it('refuses a weighted pick with no positive weights', () => {
    const state = playableState();
    expect(() => rollWeighted(state, [{ item: 'x', weight: 0 }], '零')).toThrow();
  });

  it('generates a seed carrying the 棋 prefix', () => {
    expect(generateSeed().startsWith('棋-')).toBe(true);
  });

  it('generates distinct seeds on consecutive calls', () => {
    expect(generateSeed()).not.toBe(generateSeed());
  });
});
