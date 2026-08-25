import { describe, expect, it } from 'vitest';

import {
  DIE_SIDES,
  SEALED_REASON_MARKER,
  createRngState,
  generateSeed,
  initRngState,
  nextFloat,
  rawRoll,
  roll,
  rollD100,
  rollD20,
  rollD6,
  rollDie,
  rollRange,
} from '../rng';
import { ROLL_CAP, SAVE_VERSION, type Die, type GameState } from '../types';

function rollMany(seed: string, die: Die, n: number): number[] {
  let state = initRngState(seed);
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = rollDie(state, die);
    values.push(r.value);
    state = r.state;
  }
  return values;
}

function makeState(seed = 'rng-test-seed', overrides: Partial<GameState> = {}): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rngState: initRngState(seed),
    phase: 'playing',
    creationStep: 4,
    turn: 1,
    character: null,
    npcs: {},
    quests: [],
    combat: null,
    narrativeLog: [],
    rolls: [],
    auditHash: 'genesis',
    rollSeq: 0,
    killCount: 0,
    stats: {
      totalRolls: 0,
      stonesEarned: 0,
      enemiesSlain: 0,
      breakthroughsFailed: 0,
      pillsConsumed: 0,
      peakRealmLabel: '凡人',
    },
    ending: null,
    ...overrides,
  };
}

describe('rng — seeded determinism (anti-cheat layer 4)', () => {
  it('produces identical roll sequences for the same seed', () => {
    const a = rollMany('天命-42', 'D100', 200);
    const b = rollMany('天命-42', 'D100', 200);
    expect(a).toEqual(b);
  });

  it('produces identical intermediate states for the same seed', () => {
    let s1 = initRngState('seed-α');
    let s2 = initRngState('seed-α');
    for (let i = 0; i < 50; i++) {
      const r1 = rollD20(s1);
      const r2 = rollD20(s2);
      expect(r1.state).toBe(r2.state);
      expect(r1.value).toBe(r2.value);
      s1 = r1.state;
      s2 = r2.state;
    }
  });

  it('diverges for different seeds', () => {
    expect(rollMany('seed-one', 'D100', 20)).not.toEqual(rollMany('seed-two', 'D100', 20));
  });

  it('initRngState is deterministic, hex-serialized, and aliased', () => {
    expect(initRngState('同种')).toBe(initRngState('同种'));
    expect(initRngState('同种')).toMatch(/^[0-9a-f]{8}$/);
    expect(initRngState('甲')).not.toBe(initRngState('乙'));
    expect(createRngState).toBe(initRngState);
  });
});

describe('rng — die ranges & distribution', () => {
  it('exposes the three sanctioned dice', () => {
    expect(DIE_SIDES).toEqual({ D100: 100, D20: 20, D6: 6 });
  });

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
    const faces = new Set(rollMany('d6-check', 'D6', 500));
    for (let f = 1; f <= 6; f++) expect(faces.has(f)).toBe(true);
  });

  it('D100 mean is close to 50.5 (fair die)', () => {
    const values = rollMany('mean-check', 'D100', 10000);
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(53);
  });

  it('rollD100 / rollD20 / rollD6 helpers match rollDie', () => {
    const state = initRngState('helpers');
    expect(rollD100(state)).toEqual(rollDie(state, 'D100'));
    expect(rollD20(state)).toEqual(rollDie(state, 'D20'));
    expect(rollD6(state)).toEqual(rollDie(state, 'D6'));
  });

  it('nextFloat stays in [0, 1)', () => {
    let state = initRngState('floats');
    for (let i = 0; i < 1000; i++) {
      const r = nextFloat(state);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      state = r.state;
    }
  });
});

describe('rng — string-state purity & replay', () => {
  it('is pure: same input state always yields the same output', () => {
    const state = initRngState('pure');
    const first = rollD100(state);
    const second = rollD100(state);
    expect(second).toEqual(first);
    expect(first.state).not.toBe(state);
  });

  it('rawRoll matches rollDie but exposes nextRngState (sealed-roll path)', () => {
    const state = initRngState('raw');
    const viaDie = rollDie(state, 'D100');
    const viaRaw = rawRoll(state, 'D100');
    expect(viaRaw.value).toBe(viaDie.value);
    expect(viaRaw.nextRngState).toBe(viaDie.state);
  });

  it('a saved state snapshot replays the exact roll (DiceRoll.seedState)', () => {
    let state = initRngState('replay-me');
    for (let i = 0; i < 5; i++) state = rollD100(state).state;

    const snapshot = state; // what the gateway stores as seedState
    const original = rollD100(state);
    const replayed = rollD100(snapshot);
    expect(replayed.value).toBe(original.value);
    expect(replayed.state).toBe(original.state);
  });

  it('rejects corrupt serialized states', () => {
    expect(() => rollD100('not-hex!')).toThrow();
    expect(() => rollD100('')).toThrow();
    expect(() => nextFloat('zzzzzzzz')).toThrow();
  });
});

describe('rng — audited gateway (layer 1)', () => {
  it('roll() behaves as the number and carries the envelope', () => {
    const state = makeState();
    const before = state.rngState;
    const r = roll(state, 'D100', '突破·筑基');

    // number-style usage
    expect(r + 0).toBeGreaterThanOrEqual(1);
    expect(r + 0).toBeLessThanOrEqual(100);
    expect(r <= 100).toBe(true);
    expect(`${r}`).toBe(String(r.value));
    expect(Number(r)).toBe(r.value);

    // envelope-style usage
    expect(r.state).toBe(state);
    expect(r.roll).toMatchObject({
      id: 1,
      turn: 1,
      die: 'D100',
      value: r.value,
      reason: '突破·筑基',
      seedState: before, // pre-roll snapshot — replayable
    });

    // bookkeeping
    expect(state.rngState).not.toBe(before);
    expect(state.rolls).toHaveLength(1);
    expect(state.rollSeq).toBe(1);
    expect(state.stats!.totalRolls).toBe(1);
  });

  it('is deterministic across full audited runs (layer 4)', () => {
    const s1 = makeState('同种');
    const s2 = makeState('同种');
    const a = Array.from({ length: 50 }, () => Number(roll(s1, 'D20', 'x')));
    const b = Array.from({ length: 50 }, () => Number(roll(s2, 'D20', 'x')));
    expect(a).toEqual(b);
    expect(s1.rngState).toBe(s2.rngState);
  });

  it('auto-seals rolls whose reason carries the 暗掷 marker', () => {
    const state = makeState();
    roll(state, 'D100', `${SEALED_REASON_MARKER}·机缘`);
    roll(state, 'D100', '灵根抽取');
    roll(state, 'D100', '天命', true); // explicit override
    expect(state.rolls[0]!.sealed).toBe(true);
    expect(state.rolls[1]!.sealed).toBeUndefined();
    expect(state.rolls[2]!.sealed).toBe(true);
  });

  it('caps the trail at ROLL_CAP while ids stay monotonic', () => {
    const state = makeState();
    for (let i = 0; i < ROLL_CAP + 10; i++) roll(state, 'D6', `掷 ${i}`);
    expect(state.rolls).toHaveLength(ROLL_CAP);
    expect(state.rolls[0]!.id).toBe(11); // 10 oldest were trimmed
    expect(state.rolls[state.rolls.length - 1]!.id).toBe(ROLL_CAP + 10);
    expect(state.rollSeq).toBe(ROLL_CAP + 10);
    expect(state.stats!.totalRolls).toBe(ROLL_CAP + 10);
  });

  it('rollRange stays within [min, max], covers all values, and is audited', () => {
    const state = makeState('range');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const r = rollRange(state, 3, 7, '战利·灵石');
      expect(r >= 3 && r <= 7).toBe(true);
      seen.add(Number(r));
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6, 7]));
    expect(state.rolls).toHaveLength(500);
    expect(state.rolls[0]!.reason).toContain('战利·灵石');
    expect(state.rolls[0]!.reason).toContain('3–7');
  });

  it('works without the optional stats block', () => {
    const state = makeState('no-stats');
    delete state.stats;
    const r = roll(state, 'D20', 'x');
    expect(Number(r)).toBeGreaterThanOrEqual(1);
    expect(state.rolls).toHaveLength(1);
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

  it('generated seeds produce valid, distinct RNG streams', () => {
    const a = generateSeed();
    const b = generateSeed();
    expect(rollMany(a, 'D100', 10)).not.toEqual(rollMany(b, 'D100', 10));
  });
});
