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
} from '@/engine/rng';
import { playingState } from './helpers';

describe('rng — pure primitives', () => {
  it('derives a stable 8-char hex state from a seed', () => {
    const state = initRngState('烂柯');
    expect(state).toMatch(/^[0-9a-f]{8}$/);
    expect(initRngState('烂柯')).toBe(state);
  });

  it('gives different states for different seeds', () => {
    expect(initRngState('甲')).not.toBe(initRngState('乙'));
  });

  it('rejects a corrupt state string', () => {
    expect(() => nextFloat('not-hex')).toThrow(/corrupt state/);
  });

  it('produces floats inside [0,1)', () => {
    let s = initRngState('float');
    for (let i = 0; i < 200; i++) {
      const { value, state } = nextFloat(s);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      s = state;
    }
  });

  it('advances the state on every draw', () => {
    const s0 = initRngState('advance');
    const { state: s1 } = nextFloat(s0);
    const { state: s2 } = nextFloat(s1);
    expect(s1).not.toBe(s0);
    expect(s2).not.toBe(s1);
  });

  it('keeps every die inside its face range', () => {
    let s = initRngState('dice');
    for (const die of ['D100', 'D20', 'D6'] as const) {
      for (let i = 0; i < 300; i++) {
        const { value, state } = rollDie(s, die);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(DIE_SIDES[die]);
        s = state;
      }
    }
  });

  it('exposes matching helpers for each die', () => {
    const s = initRngState('helpers');
    expect(rollD100(s).value).toBe(rollDie(s, 'D100').value);
    expect(rollD20(s).value).toBe(rollDie(s, 'D20').value);
    expect(rollD6(s).value).toBe(rollDie(s, 'D6').value);
  });

  it('replays identically from the same seed', () => {
    const draw = (seed: string) => {
      let s = initRngState(seed);
      const out: number[] = [];
      for (let i = 0; i < 40; i++) {
        const r = rollDie(s, 'D100');
        out.push(r.value);
        s = r.state;
      }
      return out;
    };
    expect(draw('replay')).toEqual(draw('replay'));
    expect(draw('replay')).not.toEqual(draw('other'));
  });

  it('covers the whole D6 face range over many draws', () => {
    let s = initRngState('coverage');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const r = rollDie(s, 'D6');
      seen.add(r.value);
      s = r.state;
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('rng — the audited gateway', () => {
  it('records every roll with its reason and pre-roll state', () => {
    const s = playingState();
    const before = s.rngState;
    const value = roll(s, 'D20', '测试掷');
    const record = s.rolls[s.rolls.length - 1]!;
    expect(record.value).toBe(value);
    expect(record.reason).toBe('测试掷');
    expect(record.seedState).toBe(before);
    expect(s.rngState).not.toBe(before);
  });

  it('numbers rolls monotonically and counts them', () => {
    const s = playingState();
    const startCount = s.stats.totalRolls;
    roll(s, 'D6', 'a');
    roll(s, 'D6', 'b');
    roll(s, 'D6', 'c');
    const ids = s.rolls.map((r) => r.id);
    expect([...ids].sort((x, y) => x - y)).toEqual(ids);
    expect(s.stats.totalRolls).toBe(startCount + 3);
  });

  it('seals rolls whose reason carries 暗掷', () => {
    const s = playingState();
    roll(s, 'D100', '缘法暗掷');
    expect(s.rolls[s.rolls.length - 1]!.sealed).toBe(true);
  });

  it('leaves ordinary rolls unsealed', () => {
    const s = playingState();
    roll(s, 'D100', '寻常一掷');
    expect(s.rolls[s.rolls.length - 1]!.sealed).toBeUndefined();
  });

  it('keeps rollRange inside its bounds and annotates the reason', () => {
    const s = playingState();
    for (let i = 0; i < 60; i++) {
      const v = rollRange(s, 3, 9, '范围');
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
    expect(s.rolls[s.rolls.length - 1]!.reason).toContain('〔3–9〕');
  });

  it('handles an inverted rollRange by swapping the bounds', () => {
    const s = playingState();
    const v = rollRange(s, 9, 3, '倒置');
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(9);
  });

  it('picks only from the supplied options', () => {
    const s = playingState();
    const options = ['松', '竹', '云'];
    for (let i = 0; i < 40; i++) {
      expect(options).toContain(rollPick(s, options, '取一'));
    }
  });

  it('throws when asked to pick from nothing', () => {
    const s = playingState();
    expect(() => rollPick(s, [], '空')).toThrow();
    expect(() => rollWeighted(s, [], '空')).toThrow();
  });

  it('honours weights, never returning a zero-weight entry', () => {
    const s = playingState();
    const entries = [
      { item: 'never', weight: 0 },
      { item: 'always', weight: 5 },
    ];
    for (let i = 0; i < 50; i++) {
      expect(rollWeighted(s, entries, '加权')).toBe('always');
    }
  });

  it('spreads a weighted draw roughly in proportion', () => {
    const s = playingState();
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 600; i++) {
      const pick = rollWeighted(
        s,
        [
          { item: 'a' as const, weight: 9 },
          { item: 'b' as const, weight: 1 },
        ],
        '比例',
      );
      counts[pick] += 1;
    }
    expect(counts.a).toBeGreaterThan(counts.b * 3);
  });

  it('generates distinct, prefixed seeds', () => {
    const a = generateSeed();
    const b = generateSeed();
    expect(a.startsWith('棋-')).toBe(true);
    expect(a).not.toBe(b);
  });
});
