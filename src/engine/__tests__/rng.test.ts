import { describe, expect, it } from 'vitest';

import {
  createRng,
  deserializeRngState,
  generateSeed,
  roll,
  rollD100,
  rollD20,
  rollD6,
  serializeRngState,
  type Die,
  type RngState,
} from '../rng';

function rollMany(seed: string, die: Die, n: number): number[] {
  let state = createRng(seed);
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = roll(state, die, `test #${i}`, 1);
    values.push(r.value);
    state = r.nextState;
  }
  return values;
}

describe('rng — seeded determinism (anti-cheat layer 4)', () => {
  it('produces identical roll sequences for the same seed', () => {
    const a = rollMany('天命-42', 'D100', 200);
    const b = rollMany('天命-42', 'D100', 200);
    expect(a).toEqual(b);
  });

  it('produces identical serialized states along the way', () => {
    let s1 = createRng('seed-α');
    let s2 = createRng('seed-α');
    for (let i = 0; i < 50; i++) {
      const r1 = rollD20(s1, 'x', i);
      const r2 = rollD20(s2, 'x', i);
      expect(serializeRngState(r1.nextState)).toBe(serializeRngState(r2.nextState));
      expect(r1.roll).toEqual(r2.roll);
      s1 = r1.nextState;
      s2 = r2.nextState;
    }
  });

  it('diverges for different seeds', () => {
    const a = rollMany('seed-one', 'D100', 20);
    const b = rollMany('seed-two', 'D100', 20);
    expect(a).not.toEqual(b);
  });
});

describe('rng — die ranges & distribution', () => {
  it('D100 stays in [1, 100] and covers the space', () => {
    const values = rollMany('range-check', 'D100', 10000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...values)).toBeLessThanOrEqual(100);
    expect(new Set(values).size).toBeGreaterThanOrEqual(90);
  });

  it('D20 hits every face in [1, 20]', () => {
    const values = rollMany('d20-check', 'D20', 2000);
    const faces = new Set(values);
    for (let f = 1; f <= 20; f++) expect(faces.has(f)).toBe(true);
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(20);
  });

  it('D6 hits every face in [1, 6]', () => {
    const values = rollMany('d6-check', 'D6', 500);
    const faces = new Set(values);
    for (let f = 1; f <= 6; f++) expect(faces.has(f)).toBe(true);
  });

  it('D100 mean is close to 50.5 (fair die)', () => {
    const values = rollMany('mean-check', 'D100', 10000);
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(53);
  });
});

describe('rng — purity & audit records', () => {
  it('never mutates the input state', () => {
    const frozen = Object.freeze(createRng('immutable')) as RngState;
    const r = rollD100(frozen, '突破·筑基', 7);
    expect(frozen.counter).toBe(0);
    expect(r.nextState).not.toBe(frozen);
    expect(r.nextState.counter).toBe(1);
  });

  it('assigns monotonic ids starting at 1 and records turn/reason/die', () => {
    let state = createRng('ids');
    for (let i = 1; i <= 10; i++) {
      const r = roll(state, 'D6', `掷 ${i}`, 3);
      expect(r.roll.id).toBe(i);
      expect(r.roll.turn).toBe(3);
      expect(r.roll.reason).toBe(`掷 ${i}`);
      expect(r.roll.die).toBe('D6');
      expect(r.roll.value).toBe(r.value);
      state = r.nextState;
    }
  });

  it('keeps the original seed across rolls', () => {
    let state = createRng('原初种子');
    for (let i = 0; i < 5; i++) state = rollD6(state, 'x', 0).nextState;
    expect(state.seed).toBe('原初种子');
  });
});

describe('rng — serialization & replay (audit)', () => {
  it('round-trips mid-stream: resumed state continues identically', () => {
    let live = createRng('round-trip');
    for (let i = 0; i < 5; i++) live = rollD100(live, 'warmup', 0).nextState;

    const resumed = deserializeRngState(serializeRngState(live));
    expect(resumed).toEqual(live);

    for (let i = 0; i < 20; i++) {
      const a = rollD20(live, 'cont', 1);
      const b = rollD20(resumed, 'cont', 1);
      expect(b.value).toBe(a.value);
      live = a.nextState;
    }
  });

  it('DiceRoll.seedState replays the exact roll', () => {
    let state = createRng('replay-me');
    for (let i = 0; i < 3; i++) state = rollD100(state, 'warmup', 0).nextState;

    const original = rollD100(state, '灵根抽取', 0);
    const replayed = rollD100(deserializeRngState(original.roll.seedState), '灵根抽取', 0);
    expect(replayed.value).toBe(original.value);
    expect(replayed.roll.id).toBe(original.roll.id);
  });

  it('survives seeds containing the delimiter and unicode', () => {
    const seed = '妖:兽/袭:击 — 100%:确定';
    const state = createRng(seed);
    const back = deserializeRngState(serializeRngState(state));
    expect(back.seed).toBe(seed);
    expect(rollD100(back, 'x', 0).value).toBe(rollD100(state, 'x', 0).value);
  });

  it('rejects malformed serialized states', () => {
    expect(() => deserializeRngState('garbage')).toThrow();
    expect(() => deserializeRngState('wrong:prefix:ff:0')).toThrow();
    expect(() => deserializeRngState('mcls-rng-v1:seed:zz:notanumber')).toThrow();
    expect(() => deserializeRngState('mcls-rng-v1:seed:ff:-1')).toThrow();
  });
});

describe('rng — seed generation', () => {
  it('generates non-empty, unique seeds', () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const s = generateSeed();
      expect(s.length).toBeGreaterThan(0);
      seeds.add(s);
    }
    expect(seeds.size).toBe(100);
  });
});
