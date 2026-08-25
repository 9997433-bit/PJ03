import { describe, expect, it } from 'vitest';

import type { Attributes, RealmState } from '../types';
import {
  BOTTLENECK_FLAG,
  breakthroughChanceParts,
  canAttemptBreakthrough,
  CHANCE_MAX,
  CHANCE_MIN,
  FAIL_STREAK_FLAG,
  HEART_DEMON_FAIL_PENALTY,
  HEART_DEMON_PASS_BONUS,
  resolveBreakthrough,
  type BreakthroughContext,
  type RollFn,
} from '../breakthrough';
import { enterRealm, expNeededAt, normalizedRealmDef } from '../realms';
import { cultivateOnce, cultivationSpeed } from '../cultivation';

// ===== helpers =====

function mkRoll(values: number[]): RollFn & { used: () => number } {
  let i = 0;
  const fn: RollFn = () => {
    if (i >= values.length) throw new Error(`roll queue exhausted after ${values.length}`);
    return values[i++]!;
  };
  return Object.assign(fn, { used: () => i });
}

function attrs(over: Partial<Attributes> = {}): Attributes {
  return { genGu: 7, wuXing: 6, xinXing: 6, jiYuan: 5, qiYun: 5, ...over };
}

function qi13Gate(): RealmState {
  const need = expNeededAt('qi', 12);
  return { realm: 'qi', qiLayer: 13, stage: '初期', exp: need, expNeeded: need };
}

function foundationConsummate(): RealmState {
  const need = expNeededAt('foundation', 3);
  return { realm: 'foundation', qiLayer: 0, stage: '大圆满', exp: need, expNeeded: need };
}

function mortalGate(): RealmState {
  const need = expNeededAt('mortal', 0);
  return { realm: 'mortal', qiLayer: 0, stage: '初期', exp: need, expNeeded: need };
}

function ctx(realm: RealmState, over: Partial<BreakthroughContext> = {}): BreakthroughContext {
  return { realm, attributes: attrs(), injuries: [], flags: {}, hp: 200, maxHp: 200, ...over };
}

// data-driven expectations (stay valid if the data tables are retuned)
const FOUNDATION_BASE = normalizedRealmDef('foundation').breakthroughBaseChance;
const ATTR_BONUS = 7 * 2 + 6; // 根骨×2 + 心性
const QI13_CHANCE = Math.min(CHANCE_MAX, FOUNDATION_BASE + ATTR_BONUS);
const CORE_DC = normalizedRealmDef('core').heartDemonDC;
const CORE_CHANCE = Math.min(CHANCE_MAX, normalizedRealmDef('core').breakthroughBaseChance + ATTR_BONUS);

// ===== gate detection =====

describe('canAttemptBreakthrough', () => {
  it('rejects mid-realm states', () => {
    const mid: RealmState = { realm: 'qi', qiLayer: 7, stage: '初期', exp: 10, expNeeded: 100 };
    expect(canAttemptBreakthrough(mid).ok).toBe(false);
  });

  it('accepts 炼气十三层圆满 → 筑基', () => {
    expect(canAttemptBreakthrough(qi13Gate())).toMatchObject({ ok: true, target: 'foundation' });
  });

  it('化神大圆满 has no further breakthrough (ascension instead)', () => {
    const need = expNeededAt('deity', 3);
    const top: RealmState = { realm: 'deity', qiLayer: 0, stage: '大圆满', exp: need, expNeeded: need };
    expect(canAttemptBreakthrough(top)).toMatchObject({ ok: false, target: null });
  });
});

// ===== chance formula =====

describe('breakthrough chance formula', () => {
  it('base(target) + 根骨×2 + 心性 + pill − injuries', () => {
    expect(breakthroughChanceParts(ctx(qi13Gate())).chance).toBe(QI13_CHANCE);
    expect(breakthroughChanceParts(ctx(qi13Gate(), { pillBonus: 20 })).chance).toBe(
      Math.min(CHANCE_MAX, QI13_CHANCE + 20)
    );
    const injured = ctx(qi13Gate(), {
      injuries: [{ id: 'x', name: '经脉受损', severity: 2, turnsLeft: 3, effect: { breakthrough: -0.1 } }],
    });
    expect(breakthroughChanceParts(injured).chance).toBe(QI13_CHANCE - 10);
  });

  it('bottleneck halves the chance', () => {
    const parts = breakthroughChanceParts(ctx(qi13Gate(), { flags: { [BOTTLENECK_FLAG]: true } }));
    expect(parts.bottlenecked).toBe(true);
    expect(parts.chance).toBe(Math.round(QI13_CHANCE / 2));
  });

  it('clamps to 1–95: 凡人引气 caps at 95, hopeless attempts never hit 0', () => {
    expect(breakthroughChanceParts(ctx(mortalGate())).chance).toBe(CHANCE_MAX);

    const need = expNeededAt('nascent', 3);
    const doomed: RealmState = { realm: 'nascent', qiLayer: 0, stage: '大圆满', exp: need, expNeeded: need };
    const parts = breakthroughChanceParts(
      ctx(doomed, {
        attributes: attrs({ genGu: 1, xinXing: 1 }),
        injuries: [{ id: 'x', name: '重伤', severity: 3, turnsLeft: 5, effect: { breakthrough: -0.4 } }],
      })
    );
    expect(parts.chance).toBe(CHANCE_MIN); // 化神 base 8 + 3 − 40 → clamp 1
  });
});

// ===== success =====

describe('successful breakthrough', () => {
  it('炼气13 → 筑基初期: realm, lifespan, exp reset, full heal, flags cleared', () => {
    // the same low roll FAILS while bottlenecked (chance halved) …
    const blockedChance = Math.round(QI13_CHANCE / 2);
    const blocked = resolveBreakthrough(
      ctx(qi13Gate(), { hp: 40, flags: { [FAIL_STREAK_FLAG]: 1, [BOTTLENECK_FLAG]: true } }),
      mkRoll([blockedChance + 5, 50, 99])
    );
    expect(blocked.attempted).toBe(true);
    expect(blocked.success).toBe(false);
    expect(blocked.chance).toBe(blockedChance);

    // … and succeeds cleanly without the bottleneck
    const clean = resolveBreakthrough(ctx(qi13Gate(), { hp: 40 }), mkRoll([QI13_CHANCE - 5]));
    expect(clean.success).toBe(true);
    expect(clean.died).toBe(false);
    expect(clean.realm).toEqual(enterRealm('foundation'));
    expect(clean.realm.exp).toBe(0);
    expect(clean.lifespan).toBe(normalizedRealmDef('foundation').lifespan);
    expect(clean.hpAfter).toBe(200); // 洗筋伐髓 full restore
    expect(clean.flags[FAIL_STREAK_FLAG]).toBeUndefined();
    expect(clean.flags[BOTTLENECK_FLAG]).toBeUndefined();
    expect(clean.heartDemon).toBeNull();
    expect(clean.logs.join('')).toContain('筑基');
  });

  it('凡人 → 炼气一层 (引气入体)', () => {
    const res = resolveBreakthrough(ctx(mortalGate()), mkRoll([CHANCE_MAX])); // exactly at the clamp
    expect(res.success).toBe(true);
    expect(res.realm).toMatchObject({ realm: 'qi', qiLayer: 1 });
    expect(res.lifespan).toBe(normalizedRealmDef('qi').lifespan);
  });
});

// ===== failure fallout =====

describe('failed breakthrough', () => {
  it('burns exp within the realm band, may injure, halves hp, tracks the streak', () => {
    const gate = qi13Gate();
    const [lo, hi] = normalizedRealmDef('foundation').expLossPct;
    // main 100 (fail), loss roll 50, injury roll 1 (≤ injuryChance → injured)
    const res = resolveBreakthrough(ctx(gate), mkRoll([100, 50, 1]));
    expect(res.success).toBe(false);
    expect(res.died).toBe(false);
    expect(res.expLost).toBeGreaterThanOrEqual(Math.floor((gate.exp * lo) / 100));
    expect(res.expLost).toBeLessThanOrEqual(Math.ceil((gate.exp * hi) / 100));
    expect(res.realm.exp).toBe(gate.exp - res.expLost);
    expect(res.realm.realm).toBe('qi'); // still 炼气十三层
    expect(res.injury?.name).toBe('经脉受损');
    expect(res.hpAfter).toBe(100); // half of 200
    expect(res.flags[FAIL_STREAK_FLAG]).toBe(1);
    expect(res.flags[BOTTLENECK_FLAG]).toBeUndefined();
  });

  it('a near miss is flagged for dramatic narration', () => {
    const res = resolveBreakthrough(ctx(qi13Gate()), mkRoll([QI13_CHANCE + 3, 50, 99]));
    expect(res.success).toBe(false);
    expect(res.nearMiss).toBe(true);
    expect(res.logs.join('')).toContain('一线之差');
  });

  it('two consecutive failures create a bottleneck that halves later chances', () => {
    const first = resolveBreakthrough(ctx(qi13Gate()), mkRoll([100, 50, 99]));
    expect(first.flags[BOTTLENECK_FLAG]).toBeUndefined();

    const second = resolveBreakthrough(ctx(qi13Gate(), { flags: first.flags }), mkRoll([100, 50, 99]));
    expect(second.flags[FAIL_STREAK_FLAG]).toBe(2);
    expect(second.flags[BOTTLENECK_FLAG]).toBe(true);

    const after = breakthroughChanceParts(ctx(qi13Gate(), { flags: second.flags }));
    expect(after.chance).toBe(Math.round(QI13_CHANCE / 2));
  });

  it('耐苦 (hardy) shortens the inflicted injury', () => {
    const normal = resolveBreakthrough(ctx(qi13Gate()), mkRoll([100, 50, 1]));
    const hardy = resolveBreakthrough(ctx(qi13Gate(), { flags: { hardy: true } }), mkRoll([100, 50, 1]));
    expect(normal.injury).not.toBeNull();
    expect(hardy.injury).not.toBeNull();
    expect(hardy.injury!.turnsLeft).toBe(normal.injury!.turnsLeft - 1);
  });

  it('金丹 failure can kill: 破关陨落 ending', () => {
    // D20=20 heart demon pass (+5), main 100 fail, loss 50, death roll 1
    const res = resolveBreakthrough(ctx(foundationConsummate()), mkRoll([20, 100, 50, 1]));
    expect(res.died).toBe(true);
    expect(res.endingId).toBe('breakthroughDeath');
    expect(res.hpAfter).toBe(0);
    expect(res.injury).toBeNull();
  });

  it('does not attempt (and rolls nothing) when not at a gate', () => {
    const mid: RealmState = { realm: 'qi', qiLayer: 5, stage: '初期', exp: 1, expNeeded: 100 };
    const roll = mkRoll([]);
    const res = resolveBreakthrough(ctx(mid), roll);
    expect(res.attempted).toBe(false);
    expect(res.success).toBe(false);
    expect(roll.used()).toBe(0);
  });
});

// ===== 心魔劫 at major realms =====

describe('心魔劫 (heart-demon trial at 金丹/元婴/化神)', () => {
  it('a steady heart passes: D20 + 心性 ≥ DC grants +5 chance', () => {
    // D20 high enough that 10 + 心性6 ≥ DC; then main lands exactly on the boosted chance
    const boosted = Math.min(CHANCE_MAX, CORE_CHANCE + HEART_DEMON_PASS_BONUS);
    const res = resolveBreakthrough(ctx(foundationConsummate()), mkRoll([CORE_DC, boosted]));
    expect(res.heartDemon).toMatchObject({ dc: CORE_DC, passed: true, adjustment: HEART_DEMON_PASS_BONUS });
    expect(res.chance).toBe(boosted);
    expect(res.success).toBe(true);
  });

  it('a wavering heart suffers −15 and a guaranteed 心魔缠身 on failure', () => {
    // D20=1 + 心性6 = 7 < DC → −15; main just above → near miss;
    // loss 50; death roll 90 survives; injury is FORCED (no injury roll consumed)
    const reduced = Math.max(CHANCE_MIN, CORE_CHANCE + HEART_DEMON_FAIL_PENALTY);
    const roll = mkRoll([1, reduced + 1, 50, 90]);
    const res = resolveBreakthrough(ctx(foundationConsummate()), roll);
    expect(res.heartDemon).toMatchObject({ passed: false, adjustment: HEART_DEMON_FAIL_PENALTY });
    expect(res.chance).toBe(reduced);
    expect(res.success).toBe(false);
    expect(res.nearMiss).toBe(true);
    expect(res.injury?.name).toBe('心魔缠身');
    expect(res.injury!.effect.speed).toBeLessThan(0);
    expect(res.injury!.effect.breakthrough).toBeLessThanOrEqual(-0.1);
    expect(roll.used()).toBe(4);
  });

  it('筑基 and below face no heart-demon trial', () => {
    const res = resolveBreakthrough(ctx(qi13Gate()), mkRoll([QI13_CHANCE - 5]));
    expect(res.heartDemon).toBeNull();
    expect(res.success).toBe(true);
  });
});

// ===== cultivation → gate → breakthrough integration =====

describe('cultivation feeds the gate', () => {
  it('exp caps at 炼气十三层圆满 and the gate opens', () => {
    const nearGate: RealmState = {
      realm: 'qi',
      qiLayer: 13,
      stage: '初期',
      exp: expNeededAt('qi', 12) - 1,
      expNeeded: expNeededAt('qi', 12),
    };
    const result = cultivateOnce({
      realm: nearGate,
      attributes: attrs(),
      spiritRoot: { grade: '双灵根', elements: ['金', '水'], speedMultiplier: 1.2, rollValue: 88 },
    });
    expect(result.atGate).toBe(true);
    expect(result.gateTarget).toBe('foundation');
    expect(result.realm.exp).toBe(result.realm.expNeeded); // capped, never overflows the gate

    const bt = resolveBreakthrough(ctx(result.realm), mkRoll([1]));
    expect(bt.success).toBe(true);
    expect(bt.realm.realm).toBe('foundation');
  });

  it('minor levels advance automatically with overflow carry', () => {
    const start: RealmState = { realm: 'qi', qiLayer: 1, stage: '初期', exp: 0, expNeeded: expNeededAt('qi', 0) };
    const result = cultivateOnce({
      realm: start,
      attributes: attrs({ wuXing: 8 }),
      spiritRoot: { grade: '天灵根', elements: ['火'], speedMultiplier: 3.0, rollValue: 100 },
      pillBuffMult: 1.5,
    });
    expect(result.leveledTo.length).toBeGreaterThanOrEqual(1);
    expect(result.realm.qiLayer).toBeGreaterThan(1);
    expect(result.realm.exp).toBeGreaterThanOrEqual(0);
    expect(result.realm.exp).toBeLessThan(result.realm.expNeeded);
  });

  it('灵根修正 dominates the speed formula (×6 between 天灵根 and 五灵根)', () => {
    const base = {
      realm: { realm: 'qi', qiLayer: 5, stage: '初期', exp: 0, expNeeded: expNeededAt('qi', 4) } as RealmState,
      attributes: attrs(),
    };
    const heavenly = cultivationSpeed({
      ...base,
      spiritRoot: { grade: '天灵根', elements: ['火'], speedMultiplier: 3.0, rollValue: 100 },
    });
    const trash = cultivationSpeed({
      ...base,
      spiritRoot: { grade: '五灵根', elements: ['金', '木', '水', '火', '土'], speedMultiplier: 0.5, rollValue: 7 },
    });
    expect(heavenly / trash).toBeCloseTo(6, 0); // 3.0 / 0.5, modulo integer rounding
  });
});
