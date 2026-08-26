import { describe, expect, it } from 'vitest';

import {
  CULTIVATION_EXP_RATE,
  ELEMENT_MATCH_BONUS,
  atBreakthroughGate,
  cultivate,
  cultivateOnce,
  cultivationSpeed,
  settleLevelUps,
  techniqueSpeedMultiplier,
  type CultivateContext,
} from '../cultivation';
import {
  enterRealm,
  expNeededAt,
  initialRealmState,
  isAtMajorGate,
  normalizedRealmDef,
  realmLabelOf,
} from '../realms';
import { initRngState } from '../rng';
import {
  SAVE_VERSION,
  type Attributes,
  type Character,
  type GameState,
  type RealmState,
  type SpiritRoot,
} from '../types';

// ---------------------------------------------------------------------------
// factories
// ---------------------------------------------------------------------------

function makeRoot(overrides: Partial<SpiritRoot> = {}): SpiritRoot {
  return {
    grade: '五灵根',
    elements: ['金', '木', '水', '火', '土'],
    speedMultiplier: 0.5,
    rollValue: 10,
    ...overrides,
  };
}

function makeAttrs(overrides: Partial<Attributes> = {}): Attributes {
  return { genGu: 5, wuXing: 5, xinXing: 5, jiYuan: 5, qiYun: 5, ...overrides };
}

function qiRealm(layer: number, exp = 0): RealmState {
  return {
    realm: 'qi',
    qiLayer: layer,
    stage: '初期',
    exp,
    expNeeded: expNeededAt('qi', layer - 1),
  };
}

function makeCtx(overrides: Partial<CultivateContext> = {}): CultivateContext {
  return {
    realm: qiRealm(1),
    attributes: makeAttrs(),
    spiritRoot: makeRoot(),
    technique: null,
    injuries: [],
    ...overrides,
  };
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    name: '测试子',
    gender: '男',
    originId: 'village',
    attributes: makeAttrs(),
    spiritRoot: makeRoot(),
    realm: qiRealm(1),
    age: 16,
    lifespan: 120,
    hp: 100,
    maxHp: 100,
    injuries: [],
    statusEffects: [],
    techniqueId: null,
    combatArts: [],
    spiritStones: 10,
    inventory: [],
    equipped: {},
    sectId: null,
    flags: {},
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: SAVE_VERSION,
    seed: 'cultivation-test',
    rngState: initRngState('cultivation-test'),
    phase: 'playing',
    creationStep: 4,
    turn: 1,
    character: makeCharacter(),
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

// ---------------------------------------------------------------------------
// the speed formula
// ---------------------------------------------------------------------------

describe('cultivationSpeed — the 修炼 formula', () => {
  it('matches base × 灵根 × (1 + 悟性×0.05) exactly for a bare context', () => {
    const ctx = makeCtx();
    const def = normalizedRealmDef('qi');
    const base = def.cultivateExpBase + ctx.realm.expNeeded * CULTIVATION_EXP_RATE.qi;
    const expected = Math.max(1, Math.round(base * 0.5 * (1 + 5 * 0.05)));
    expect(cultivationSpeed(ctx)).toBe(expected);
  });

  it('scales linearly with the spirit-root multiplier (伪灵根 vs 天灵根)', () => {
    const slow = cultivationSpeed(makeCtx({ spiritRoot: makeRoot({ speedMultiplier: 0.5 }) }));
    const fast = cultivationSpeed(
      makeCtx({ spiritRoot: makeRoot({ grade: '天灵根', elements: ['火'], speedMultiplier: 3.0 }) })
    );
    // 3.0 / 0.5 = 6× (± rounding)
    expect(fast).toBeGreaterThanOrEqual(slow * 5);
    expect(fast).toBeLessThanOrEqual(slow * 7);
  });

  it('is monotonic in 悟性', () => {
    const dumb = cultivationSpeed(makeCtx({ attributes: makeAttrs({ wuXing: 1 }) }));
    const smart = cultivationSpeed(makeCtx({ attributes: makeAttrs({ wuXing: 10 }) }));
    expect(smart).toBeGreaterThan(dumb);
  });

  it('injuries slow cultivation down', () => {
    const healthy = cultivationSpeed(makeCtx());
    const hurt = cultivationSpeed(
      makeCtx({
        injuries: [
          { id: 'xinMo', name: '心魔滋生', severity: 2, turnsLeft: 5, effect: { speed: -0.3 } },
        ],
      })
    );
    expect(hurt).toBeLessThan(healthy);
  });

  it('pill buffs speed cultivation up', () => {
    const plain = cultivationSpeed(makeCtx());
    const buffed = cultivationSpeed(makeCtx({ pillBuffMult: 1.5 }));
    expect(buffed).toBeGreaterThan(plain);
  });

  it('never returns less than 1', () => {
    const ctx = makeCtx({
      spiritRoot: makeRoot({ speedMultiplier: 0.5 }),
      attributes: makeAttrs({ wuXing: 1 }),
      injuries: [
        { id: 'daoShang', name: '道基震荡', severity: 3, turnsLeft: 8, effect: { speed: -0.99 } },
      ],
    });
    expect(cultivationSpeed(ctx)).toBeGreaterThanOrEqual(1);
  });
});

describe('techniqueSpeedMultiplier — 功法与灵根契合', () => {
  const root = makeRoot({ grade: '双灵根', elements: ['金', '木'], speedMultiplier: 1.2 });

  it('is 1 without a technique', () => {
    expect(techniqueSpeedMultiplier(root, null)).toBe(1);
    expect(techniqueSpeedMultiplier(root, undefined)).toBe(1);
  });

  it('applies the technique speedBonus', () => {
    expect(techniqueSpeedMultiplier(root, { speedBonus: 1.25, elementAffinity: ['火'] })).toBe(1.25);
  });

  it('grants ×1.2 extra when an affinity element matches the root', () => {
    const m = techniqueSpeedMultiplier(root, { speedBonus: 1.25, elementAffinity: ['金'] });
    expect(m).toBeCloseTo(1.25 * ELEMENT_MATCH_BONUS, 10);
  });

  it('universal techniques (null affinity) get no match bonus', () => {
    expect(techniqueSpeedMultiplier(root, { speedBonus: 1.5, elementAffinity: null })).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// cultivateOnce — level-ups, overflow carry, major gates
// ---------------------------------------------------------------------------

describe('cultivateOnce — 炼气 layer progression', () => {
  it('advances a layer when exp fills, carrying the overflow', () => {
    const start = qiRealm(1, expNeededAt('qi', 0) - 1); // 1 exp short
    const result = cultivateOnce(makeCtx({ realm: start }));
    expect(result.realm.qiLayer).toBe(2);
    expect(result.realm.exp).toBe(result.expGained - 1); // overflow carried
    expect(result.realm.expNeeded).toBe(expNeededAt('qi', 1));
    expect(result.leveledTo).toContain('炼气二层');
    expect(result.atGate).toBe(false);
  });

  it('can jump multiple layers in one sitting with extreme speed', () => {
    const ctx = makeCtx({
      realm: qiRealm(1, expNeededAt('qi', 0) - 1),
      spiritRoot: makeRoot({ grade: '天灵根', elements: ['火'], speedMultiplier: 3.0 }),
      attributes: makeAttrs({ wuXing: 10 }),
      technique: { speedBonus: 2.0, elementAffinity: ['火'] },
      pillBuffMult: 2,
    });
    const result = cultivateOnce(ctx);
    expect(result.realm.qiLayer).toBeGreaterThanOrEqual(2);
    expect(result.leveledTo.length).toBe(result.realm.qiLayer - 1);
  });

  it('caps exp at the 炼气十三层 wall — 突破 required, target 筑基', () => {
    const wall = qiRealm(13, expNeededAt('qi', 12) - 1);
    const result = cultivateOnce(makeCtx({ realm: wall }));
    expect(result.atGate).toBe(true);
    expect(result.gateTarget).toBe('foundation');
    expect(result.realm.qiLayer).toBe(13); // never auto-advances past the gate
    expect(result.realm.exp).toBe(result.realm.expNeeded);
    expect(isAtMajorGate(result.realm)).toBe(true);
  });

  it('a mortal fills 引气入体 and stops at the mortal→qi gate', () => {
    let rs = initialRealmState();
    const ctx = makeCtx({
      realm: rs,
      spiritRoot: makeRoot({ grade: '真灵根', elements: ['水'], speedMultiplier: 1.6 }),
    });
    // cultivate until gate (bounded loop — must terminate well within 200 turns)
    let atGate = false;
    for (let i = 0; i < 200 && !atGate; i++) {
      const r = cultivateOnce({ ...ctx, realm: rs });
      rs = r.realm;
      atGate = r.atGate;
      expect(rs.realm).toBe('mortal'); // no silent realm hops
    }
    expect(atGate).toBe(true);
    expect(rs.exp).toBe(rs.expNeeded);
  });

  it('staged realms progress 初期→中期→后期→大圆满 and wall at 大圆满', () => {
    let rs = enterRealm('foundation');
    const seen: string[] = [];
    const ctx = makeCtx({
      spiritRoot: makeRoot({ grade: '天灵根', elements: ['土'], speedMultiplier: 3.0 }),
      attributes: makeAttrs({ wuXing: 10 }),
      technique: { speedBonus: 2.0, elementAffinity: ['土'] },
      pillBuffMult: 4,
    });
    for (let i = 0; i < 500; i++) {
      const r = cultivateOnce({ ...ctx, realm: rs });
      rs = r.realm;
      seen.push(...r.leveledTo);
      if (r.atGate) break;
    }
    expect(seen).toEqual(['筑基中期', '筑基后期', '筑基大圆满']);
    expect(rs.stage).toBe('大圆满');
    expect(isAtMajorGate(rs)).toBe(true);
    expect(realmLabelOf(rs)).toBe('筑基大圆满');
  });
});

// ---------------------------------------------------------------------------
// GameState wrappers
// ---------------------------------------------------------------------------

describe('cultivate(state) — the 修炼 command', () => {
  it('adds exp, narrates, and leaves the dice authority untouched (no randomness)', () => {
    const state = makeState();
    const before = state.character!.realm.exp;
    cultivate(state);
    expect(state.character!.realm.exp).toBeGreaterThan(before);
    expect(state.narrativeLog.length).toBeGreaterThan(0);
    expect(state.rolls).toHaveLength(0); // 修炼 itself is deterministic
  });

  it('emits a 境界提升 notice and tracks peak realm on layer-up', () => {
    const state = makeState({
      character: makeCharacter({ realm: qiRealm(1, expNeededAt('qi', 0) - 1) }),
    });
    const notices = cultivate(state);
    expect(state.character!.realm.qiLayer).toBe(2);
    expect(notices.some((n) => n.title === '境界提升')).toBe(true);
    expect(state.stats!.peakRealmLabel).toBe('炼气二层');
  });

  it('refuses to grind past a major gate — exp stays capped', () => {
    const gated = qiRealm(13, expNeededAt('qi', 12));
    const state = makeState({ character: makeCharacter({ realm: gated }) });
    expect(atBreakthroughGate(state.character!)).toBe(true);
    cultivate(state);
    expect(state.character!.realm.qiLayer).toBe(13);
    expect(state.character!.realm.exp).toBe(state.character!.realm.expNeeded);
    // 天道 still speaks (gate line), but no exp moved
    expect(state.narrativeLog.length).toBeGreaterThan(0);
  });

  it('does nothing outside the playing phase or without a character', () => {
    const combat = makeState({ phase: 'combat' });
    const exp0 = combat.character!.realm.exp;
    expect(cultivate(combat)).toEqual([]);
    expect(combat.character!.realm.exp).toBe(exp0);

    const empty = makeState({ character: null });
    expect(cultivate(empty)).toEqual([]);
  });

  it('status-effect buffs (聚气丹 etc.) speed up the same character', () => {
    const plain = makeState();
    const buffed = makeState({
      character: makeCharacter({
        statusEffects: [
          { id: 'xuLing', name: '蓄灵', kind: 'buff', turnsLeft: 4, speedMult: 1.5, desc: '' },
        ],
      }),
    });
    cultivate(plain);
    cultivate(buffed);
    expect(buffed.character!.realm.exp).toBeGreaterThan(plain.character!.realm.exp);
  });
});

describe('settleLevelUps — exp granted by events/pills', () => {
  it('advances minor levels with overflow carry after a big exp grant', () => {
    const state = makeState();
    const c = state.character!;
    c.realm = { ...c.realm, exp: expNeededAt('qi', 0) + expNeededAt('qi', 1) + 7 };
    const notices = settleLevelUps(state);
    expect(c.realm.qiLayer).toBe(3);
    expect(c.realm.exp).toBe(7);
    expect(notices.filter((n) => n.title === '境界提升')).toHaveLength(2);
  });

  it('caps overflow at a major gate instead of skipping the 突破', () => {
    const state = makeState({
      character: makeCharacter({ realm: qiRealm(13, 0) }),
    });
    const c = state.character!;
    c.realm = { ...c.realm, exp: c.realm.expNeeded + 99999 };
    settleLevelUps(state);
    expect(c.realm.realm).toBe('qi');
    expect(c.realm.qiLayer).toBe(13);
    expect(c.realm.exp).toBe(c.realm.expNeeded);
  });
});
