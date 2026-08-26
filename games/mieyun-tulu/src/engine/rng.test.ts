import { describe, expect, it } from 'vitest';
import { initialState } from './creation';
import {
  DIE_SIDES,
  initRngState,
  nextFloat,
  peekDice,
  rangeFrom,
  roll,
  rollDie,
  rollRange,
  weightedPick,
} from './rng';
import type { Die } from './types';

const DICE: Die[] = ['D100', 'D20', 'D6'];

describe('rng · 星轨', () => {
  it('folds a seed into a stable 8-char hex state', () => {
    expect(initRngState('图-甲')).toMatch(/^[0-9a-f]{8}$/);
    expect(initRngState('图-甲')).toBe(initRngState('图-甲'));
  });

  it('gives different states for different seeds', () => {
    expect(initRngState('图-甲')).not.toBe(initRngState('图-乙'));
  });

  it('produces floats inside [0,1)', () => {
    let s = initRngState('float');
    for (let i = 0; i < 300; i++) {
      const r = nextFloat(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });

  it.each(DICE)('keeps %s inside its face range', (die) => {
    let s = initRngState(`die-${die}`);
    for (let i = 0; i < 400; i++) {
      const r = rollDie(s, die);
      expect(r.value).toBeGreaterThanOrEqual(1);
      expect(r.value).toBeLessThanOrEqual(DIE_SIDES[die]);
      expect(Number.isInteger(r.value)).toBe(true);
      s = r.state;
    }
  });

  it('covers the whole D100 face set over enough rolls', () => {
    const seen = new Set<number>();
    let s = initRngState('coverage');
    for (let i = 0; i < 20000; i++) {
      const r = rollDie(s, 'D100');
      seen.add(r.value);
      s = r.state;
    }
    expect(seen.size).toBe(100);
  });

  it('replays the identical sequence from the same seed', () => {
    const a = peekDice(initRngState('replay'), 'D100', 50);
    const b = peekDice(initRngState('replay'), 'D100', 50);
    expect(a).toEqual(b);
  });

  it('diverges for different seeds', () => {
    const a = peekDice(initRngState('replay-a'), 'D100', 50);
    const b = peekDice(initRngState('replay-b'), 'D100', 50);
    expect(a).not.toEqual(b);
  });

  it('rangeFrom stays inclusive of both bounds', () => {
    let s = initRngState('range');
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const r = rangeFrom(s, 3, 7);
      expect(r.value).toBeGreaterThanOrEqual(3);
      expect(r.value).toBeLessThanOrEqual(7);
      seen.add(r.value);
      s = r.state;
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6, 7]));
  });

  it('rejects a malformed serialized state', () => {
    expect(() => rollDie('zzzz', 'D6')).toThrow(/星轨错乱/);
  });

  it('peekDice does not advance the wheel', () => {
    const state = initRngState('peek');
    const first = peekDice(state, 'D100', 5);
    const second = peekDice(state, 'D100', 5);
    expect(first).toEqual(second);
  });

  it('peeked values are exactly what audited rolls then produce', () => {
    const s = initialState('honesty');
    const peeked = peekDice(s.rngState, 'D100', 6);
    const actual = Array.from({ length: 6 }, () => roll(s, 'D100', '测'));
    expect(actual).toEqual(peeked);
  });

  it('audits every roll with reason and pre-roll state', () => {
    const s = initialState('audit');
    const before = s.rngState;
    roll(s, 'D20', '突破·窥命');
    expect(s.rolls).toHaveLength(1);
    expect(s.rolls[0]!.reason).toBe('突破·窥命');
    expect(s.rolls[0]!.seedState).toBe(before);
    expect(s.rolls[0]!.die).toBe('D20');
  });

  it('numbers rolls monotonically and counts them in stats', () => {
    const s = initialState('seq');
    for (let i = 0; i < 12; i++) roll(s, 'D6', '序');
    expect(s.rolls.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(s.stats.totalRolls).toBe(12);
  });

  it('caps the roll ledger so a long run cannot grow the save forever', () => {
    const s = initialState('cap');
    for (let i = 0; i < 700; i++) roll(s, 'D6', '满');
    expect(s.rolls.length).toBe(500);
    expect(s.rolls[s.rolls.length - 1]!.id).toBe(700);
    expect(s.stats.totalRolls).toBe(700);
  });

  it('rollRange records the window in the audit reason', () => {
    const s = initialState('window');
    const v = rollRange(s, 10, 20, '战利·玄晶');
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThanOrEqual(20);
    expect(s.rolls[0]!.reason).toContain('10–20');
  });

  it('weightedPick returns null on an empty pool rather than throwing', () => {
    const s = initialState('empty');
    expect(weightedPick(s, [], () => 1, '空')).toBeNull();
  });

  it('weightedPick never returns a zero-weight member', () => {
    const s = initialState('weights');
    const pool = [
      { id: 'a', w: 0 },
      { id: 'b', w: 5 },
    ];
    for (let i = 0; i < 200; i++) {
      expect(weightedPick(s, pool, (p) => p.w, '权')!.id).toBe('b');
    }
  });

  it('weightedPick honours the weights in aggregate', () => {
    const s = initialState('distribution');
    const pool = [
      { id: 'rare', w: 1 },
      { id: 'common', w: 9 },
    ];
    let common = 0;
    for (let i = 0; i < 2000; i++) {
      if (weightedPick(s, pool, (p) => p.w, '权')!.id === 'common') common += 1;
    }
    expect(common / 2000).toBeGreaterThan(0.82);
    expect(common / 2000).toBeLessThan(0.97);
  });

  it('is reproducible across two identical audited sequences', () => {
    const a = initialState('parity');
    const b = initialState('parity');
    for (let i = 0; i < 40; i++) {
      roll(a, 'D100', '甲');
      roll(b, 'D100', '甲');
    }
    expect(a.rolls.map((r) => r.value)).toEqual(b.rolls.map((r) => r.value));
    expect(a.rngState).toBe(b.rngState);
  });
});
