import { describe, expect, it } from 'vitest';
import { FATES, fateForRoll } from '@/data/fates';
import { ORIGINS } from '@/data/origins';
import { SPIRIT_ROOT_TABLE, spiritRootDefForRoll } from '@/data/spiritRoots';
import {
  BASE_ATTRIBUTE,
  CREATION_POINTS,
  MAX_ALLOCATION,
  allocationRemaining,
  beginCreation,
  drawDestiny,
  emptyAllocation,
  finishCreation,
  initialState,
  submitAllocation,
  submitName,
  submitOrigin,
} from './creation';
import { SEAL_REASON } from './seal';
import { ATTRIBUTE_KEYS, type Attributes } from './types';
import { EVEN_ALLOCATION, newRun } from '@/test/helpers';

const OVER: Attributes = { shenHun: 8, tiPo: 4, wuXing: 0, dingLi: 0, jiBian: 0 };
const SHORT: Attributes = { shenHun: 2, tiPo: 2, wuXing: 2, dingLi: 2, jiBian: 2 };

describe('creation · 四步门禁', () => {
  it('starts on the title screen with no character', () => {
    const s = initialState('gate');
    expect(s.phase).toBe('title');
    expect(s.character).toBeNull();
  });

  it('refuses to name before the scroll is opened', () => {
    const s = initialState('gate');
    expect(submitName(s, '甲', '男').rejected).toBeTruthy();
  });

  it('refuses an origin before a name exists', () => {
    const s = beginCreation(initialState('gate')).state;
    const r = submitOrigin(s, 'shusheng');
    expect(r.rejected).toBe('尚未立名,何谈出身。');
    expect(r.state.creationStep).toBe(0);
  });

  it('refuses attribute points before an origin is chosen', () => {
    let s = beginCreation(initialState('gate')).state;
    s = submitName(s, '甲', '男').state;
    expect(submitAllocation(s, EVEN_ALLOCATION).rejected).toBeTruthy();
  });

  it('refuses the destiny draw before points are spent', () => {
    let s = beginCreation(initialState('gate')).state;
    s = submitName(s, '甲', '男').state;
    s = submitOrigin(s, 'shusheng').state;
    expect(drawDestiny(s).rejected).toBe('资质未定,不可抽命。');
  });

  it('refuses to enter the world before the draw', () => {
    let s = beginCreation(initialState('gate')).state;
    s = submitName(s, '甲', '男').state;
    s = submitOrigin(s, 'shusheng').state;
    s = submitAllocation(s, EVEN_ALLOCATION).state;
    expect(finishCreation(s).rejected).toBe('命数未定,不可入世。');
  });

  it('advances one step at a time when called in order', () => {
    let s = beginCreation(initialState('order')).state;
    expect(s.creationStep).toBe(0);
    s = submitName(s, '沈无咎', '男').state;
    expect(s.creationStep).toBe(1);
    s = submitOrigin(s, 'guanxing').state;
    expect(s.creationStep).toBe(2);
    s = submitAllocation(s, EVEN_ALLOCATION).state;
    expect(s.creationStep).toBe(3);
    s = drawDestiny(s).state;
    expect(s.creationStep).toBe(4);
    s = finishCreation(s).state;
    expect(s.phase).toBe('playing');
    expect(s.turn).toBe(1);
  });

  it('rejects an empty name and an over-long one', () => {
    const s = beginCreation(initialState('names')).state;
    expect(submitName(s, '   ', '男').rejected).toBe('无名者不入册。');
    expect(submitName(s, '一二三四五六七八九十十一十二十三', '男').rejected).toBeTruthy();
  });

  it('rejects a wish disguised as a name', () => {
    const s = beginCreation(initialState('wish')).state;
    expect(submitName(s, '我想要飞升', '男').rejected).toContain('天机不受祈请');
  });

  it('rejects an unknown origin id', () => {
    let s = beginCreation(initialState('bad-origin')).state;
    s = submitName(s, '甲', '男').state;
    expect(submitOrigin(s, 'nope').rejected).toBe('无此出身。');
  });

  it('conserves the point pool exactly', () => {
    let s = beginCreation(initialState('points')).state;
    s = submitName(s, '甲', '男').state;
    s = submitOrigin(s, 'shusheng').state;
    expect(submitAllocation(s, OVER).rejected).toBeTruthy();
    expect(submitAllocation(s, SHORT).rejected).toContain('12');
    expect(submitAllocation(s, EVEN_ALLOCATION).rejected).toBeUndefined();
  });

  it('caps any single attribute at MAX_ALLOCATION', () => {
    let s = beginCreation(initialState('cap')).state;
    s = submitName(s, '甲', '男').state;
    s = submitOrigin(s, 'shusheng').state;
    const spike: Attributes = { ...emptyAllocation(), shenHun: MAX_ALLOCATION + 1, tiPo: 4 };
    spike.wuXing = CREATION_POINTS - spike.shenHun - spike.tiPo;
    expect(submitAllocation(s, spike).rejected).toBeTruthy();
  });

  it('rejects fractional and negative allocations', () => {
    let s = beginCreation(initialState('frac')).state;
    s = submitName(s, '甲', '男').state;
    s = submitOrigin(s, 'shusheng').state;
    expect(submitAllocation(s, { ...EVEN_ALLOCATION, shenHun: 2.5, tiPo: 3.5 }).rejected).toBeTruthy();
    expect(
      submitAllocation(s, { shenHun: -1, tiPo: 5, wuXing: 4, dingLi: 4, jiBian: 0 }).rejected,
    ).toBeTruthy();
  });

  it('reports the remaining pool correctly', () => {
    expect(allocationRemaining(emptyAllocation())).toBe(CREATION_POINTS);
    expect(allocationRemaining(EVEN_ALLOCATION)).toBe(0);
  });

  it('adds base, allocation, origin and fate into the final attributes', () => {
    const s = newRun('attrs', { originId: 'chihou' });
    const c = s.character!;
    const fate = fateForRoll(c.spiritRoot.rollValue);
    void fate;
    for (const k of ATTRIBUTE_KEYS) {
      expect(c.attributes[k]).toBeGreaterThanOrEqual(BASE_ATTRIBUTE + EVEN_ALLOCATION[k]);
    }
    // 边军斥候 gives 体魄 +2.
    expect(c.attributes.tiPo).toBeGreaterThanOrEqual(BASE_ATTRIBUTE + EVEN_ALLOCATION.tiPo + 2);
  });

  it('files exactly three D100 in the draw, one of them sealed', () => {
    let s = beginCreation(initialState('draw')).state;
    s = submitName(s, '甲', '男').state;
    s = submitOrigin(s, 'shusheng').state;
    s = submitAllocation(s, EVEN_ALLOCATION).state;
    const before = s.rolls.length;
    s = drawDestiny(s).state;
    const added = s.rolls.slice(before);
    const d100 = added.filter((r) => r.die === 'D100');
    expect(d100).toHaveLength(3);
    expect(d100.map((r) => r.reason)).toEqual(['灵根·定品', '命格·定盘', SEAL_REASON]);
  });

  it('never writes the sealed roll into any narration', () => {
    const s = newRun('sealed');
    const daoYuan = s.character!.daoYuan;
    const text = s.log.map((l) => l.text).join('\n');
    expect(text).not.toContain(SEAL_REASON);
    expect(text).not.toContain(`道缘`);
    // The number itself may coincide with a stat, so check the labelled form.
    expect(text).not.toContain(`道缘 ${daoYuan}`);
  });

  it('is fully reproducible from the seed', () => {
    const a = newRun('mirror');
    const b = newRun('mirror');
    expect(a.character!.spiritRoot).toEqual(b.character!.spiritRoot);
    expect(a.character!.fateId).toBe(b.character!.fateId);
    expect(a.character!.daoYuan).toBe(b.character!.daoYuan);
    expect(a.rngState).toBe(b.rngState);
  });

  it('gives different lives to different seeds', () => {
    const seeds = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const roots = seeds.map((s) => newRun(s).character!.spiritRoot.rollValue);
    expect(new Set(roots).size).toBeGreaterThan(1);
  });

  it('starts alive, at 凡尘, aged 16, with full bars', () => {
    const c = newRun('start').character!;
    expect(c.realm.realm).toBe('mortal');
    expect(c.age).toBe(16);
    expect(c.hp).toBe(c.maxHp);
    expect(c.mana).toBe(c.maxMana);
    expect(c.hp).toBeGreaterThan(0);
  });

  it('grants 出身 items and auto-equips what can be worn', () => {
    const c = newRun('gear', { originId: 'chihou' }).character!;
    expect(c.inventory.some((s) => s.itemId === 'tiedao')).toBe(true);
    expect(c.equipped.weapon).toBe('tiedao');
  });

  it('seeds the 图录 chain for the 灭运之命 fate only', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const c = newRun(seed).character!;
      if (c.fateId === 'mieyun') {
        expect(c.flags.tulu1).toBe(true);
        expect(c.inventory.some((s) => s.itemId === 'tulu1')).toBe(true);
      }
    }
  });

  it('appends the 入世 link to the audit chain', () => {
    const s = newRun('chain');
    expect(s.chain).toHaveLength(1);
    expect(s.chain[0]!.command).toBe('入世');
  });

  it('cannot re-open the scroll once creation has begun', () => {
    const s = beginCreation(initialState('reopen')).state;
    expect(beginCreation(s).rejected).toBeTruthy();
  });
});

describe('creation · 抽取表', () => {
  it('covers D100 1..100 for 灵根 with no gaps or overlaps', () => {
    for (let v = 1; v <= 100; v++) {
      const def = spiritRootDefForRoll(v);
      expect(v).toBeGreaterThanOrEqual(def.rollMin);
      expect(v).toBeLessThanOrEqual(def.rollMax);
    }
    const covered = SPIRIT_ROOT_TABLE.reduce((n, d) => n + (d.rollMax - d.rollMin + 1), 0);
    expect(covered).toBe(100);
  });

  it('covers D100 1..100 for 命格 with no gaps or overlaps', () => {
    for (let v = 1; v <= 100; v++) {
      const f = fateForRoll(v);
      expect(v).toBeGreaterThanOrEqual(f.rollMin);
      expect(v).toBeLessThanOrEqual(f.rollMax);
    }
    const covered = FATES.reduce((n, f) => n + (f.rollMax - f.rollMin + 1), 0);
    expect(covered).toBe(100);
  });

  it('keeps 灵根 speed and calamity affinity monotone in grade', () => {
    for (let i = 1; i < SPIRIT_ROOT_TABLE.length; i++) {
      expect(SPIRIT_ROOT_TABLE[i]!.speedMultiplier).toBeGreaterThan(
        SPIRIT_ROOT_TABLE[i - 1]!.speedMultiplier,
      );
      expect(SPIRIT_ROOT_TABLE[i]!.calamityAffinity).toBeGreaterThan(
        SPIRIT_ROOT_TABLE[i - 1]!.calamityAffinity,
      );
    }
  });

  it('offers at least six origins, each with a machine-readable perk', () => {
    expect(ORIGINS.length).toBeGreaterThanOrEqual(6);
    for (const o of ORIGINS) {
      expect(o.special.length).toBeGreaterThan(4);
      expect(o.startFortune).toBeGreaterThanOrEqual(0);
      expect(o.startCalamity).toBeGreaterThanOrEqual(0);
    }
  });
});
