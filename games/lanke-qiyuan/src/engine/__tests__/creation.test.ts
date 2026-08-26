import { describe, expect, it } from 'vitest';
import {
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL,
  drawChessAffinity,
  newGame,
  setAttributes,
  setName,
  setOrigin,
  validateAllocation,
} from '../creation';
import { QIYUAN_TABLE, qiYuanRowFor } from '@/data/qiyuan';
import { ORIGINS } from '@/data/origins';
import { mapHiddenRollToYuanFa } from '../attributes';
import { SEALED_REASON_MARKER } from '../rng';

const EVEN = { xinJing: 7, wuXing: 7, caiXue: 7, qiYun: 7 };

describe('creation — the step gate lives in the engine', () => {
  it('starts a new life parked at step 0 in the creation phase', () => {
    const s = newGame('种子');
    expect(s.phase).toBe('creation');
    expect(s.creationStep).toBe(0);
    expect(s.character).toBeNull();
  });

  it('refuses 出身 before a name exists', () => {
    const s = newGame('种子');
    expect(setOrigin(s, 'qiguan').ok).toBe(false);
    expect(s.creationStep).toBe(0);
  });

  it('refuses 心性 before an origin exists', () => {
    const s = newGame('种子');
    setName(s, '王质', '');
    expect(setAttributes(s, EVEN).ok).toBe(false);
    expect(s.creationStep).toBe(1);
  });

  it('refuses the 棋缘 draw before attributes are allocated', () => {
    const s = newGame('种子');
    setName(s, '王质', '');
    setOrigin(s, 'qiguan');
    expect(drawChessAffinity(s).ok).toBe(false);
    expect(s.creationStep).toBe(2);
  });

  it('refuses a second name once the step has advanced', () => {
    const s = newGame('种子');
    setName(s, '王质', '');
    expect(setName(s, '别人', '').ok).toBe(false);
    expect(s.creationDraft?.name).toBe('王质');
  });

  it('refuses an empty name', () => {
    const s = newGame('种子');
    expect(setName(s, '   ', '').ok).toBe(false);
  });

  it('refuses an over-long name', () => {
    const s = newGame('种子');
    expect(setName(s, '一'.repeat(13), '').ok).toBe(false);
  });

  it('defaults the 道号 to 无名 when left blank', () => {
    const s = newGame('种子');
    setName(s, '王质', '');
    expect(s.creationDraft?.courtesy).toBe('无名');
  });

  it('refuses an unknown origin id', () => {
    const s = newGame('种子');
    setName(s, '王质', '');
    expect(setOrigin(s, 'no-such-origin').ok).toBe(false);
  });

  it('refuses a second 棋缘 draw — 落子无悔', () => {
    const s = newGame('种子');
    setName(s, '王质', '');
    setOrigin(s, 'qiguan');
    setAttributes(s, EVEN);
    expect(drawChessAffinity(s).ok).toBe(true);
    expect(drawChessAffinity(s).ok).toBe(false);
  });
});

describe('creation — attribute budget', () => {
  it('accepts an even split of the exact budget', () => {
    expect(validateAllocation(EVEN)).toBeNull();
  });

  it('rejects a total below the budget', () => {
    expect(validateAllocation({ ...EVEN, qiYun: 6 })).not.toBeNull();
  });

  it('rejects a total above the budget', () => {
    expect(validateAllocation({ ...EVEN, qiYun: 8 })).not.toBeNull();
  });

  it('rejects a value under the floor', () => {
    expect(validateAllocation({ xinJing: ATTR_MIN - 1, wuXing: 10, caiXue: 10, qiYun: 5 })).not.toBeNull();
  });

  it('rejects a value over the ceiling', () => {
    expect(validateAllocation({ xinJing: ATTR_MAX + 1, wuXing: 6, caiXue: 6, qiYun: 5 })).not.toBeNull();
  });

  it('rejects non-integers', () => {
    expect(validateAllocation({ ...EVEN, wuXing: 7.5, caiXue: 6.5 })).not.toBeNull();
  });

  it('conserves the budget across every legal split it accepts', () => {
    for (let a = ATTR_MIN; a <= ATTR_MAX; a++) {
      for (let b = ATTR_MIN; b <= ATTR_MAX; b++) {
        for (let c = ATTR_MIN; c <= ATTR_MAX; c++) {
          const d = ATTR_TOTAL - a - b - c;
          const alloc = { xinJing: a, wuXing: b, caiXue: c, qiYun: d };
          if (validateAllocation(alloc) === null) {
            expect(a + b + c + d).toBe(ATTR_TOTAL);
            expect(d).toBeGreaterThanOrEqual(ATTR_MIN);
            expect(d).toBeLessThanOrEqual(ATTR_MAX);
          }
        }
      }
    }
  });
});

describe('creation — the 棋缘 draw table', () => {
  it('covers 1..100 with no gap and no overlap', () => {
    for (let d = 1; d <= 100; d++) {
      const hits = QIYUAN_TABLE.filter((r) => d >= r.min && d <= r.max);
      expect(hits, `D100=${d}`).toHaveLength(1);
    }
  });

  it('rises monotonically in speed as the roll rises', () => {
    for (let i = 1; i < QIYUAN_TABLE.length; i++) {
      expect(QIYUAN_TABLE[i]!.speedMultiplier).toBeGreaterThan(QIYUAN_TABLE[i - 1]!.speedMultiplier);
    }
  });

  it('throws for an out-of-range roll', () => {
    expect(() => qiYuanRowFor(101)).toThrow();
  });

  it('draws as many distinct 灵机 as the grade promises', () => {
    for (const origin of ORIGINS) {
      const s = newGame(`灵机-${origin.id}`);
      setName(s, '王质', '');
      setOrigin(s, origin.id);
      setAttributes(s, EVEN);
      const drawn = drawChessAffinity(s);
      const affinity = drawn.affinity!;
      const row = qiYuanRowFor(affinity.rollValue);
      expect(affinity.affinities).toHaveLength(row.affinityCount);
      expect(new Set(affinity.affinities).size).toBe(row.affinityCount);
    }
  });
});

describe('creation — the sealed 缘法 roll', () => {
  it('maps the hidden D100 into 1..10', () => {
    for (let d = 1; d <= 100; d++) {
      const v = mapHiddenRollToYuanFa(d);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('is monotonic in the hidden roll', () => {
    for (let d = 2; d <= 100; d++) {
      expect(mapHiddenRollToYuanFa(d)).toBeGreaterThanOrEqual(mapHiddenRollToYuanFa(d - 1));
    }
  });

  it('records exactly one sealed roll and never reveals it', () => {
    const s = newGame('暗掷');
    setName(s, '王质', '');
    setOrigin(s, 'guyi');
    setAttributes(s, EVEN);
    drawChessAffinity(s);
    const sealed = s.rolls.filter((r) => r.sealed === true);
    expect(sealed).toHaveLength(1);
    expect(sealed[0]!.reason).toContain(SEALED_REASON_MARKER);
    // 缘法's value must not surface anywhere in the narrative log.
    const text = s.narrativeLog.map((e) => e.text).join('');
    expect(text).not.toContain('缘法');
  });
});

describe('creation — finalize', () => {
  it('produces a playable character on the first season', () => {
    const s = newGame('落定');
    setName(s, '王质', '观棋子');
    setOrigin(s, 'shusheng');
    setAttributes(s, EVEN);
    drawChessAffinity(s);
    expect(s.phase).toBe('playing');
    expect(s.creationStep).toBe(4);
    expect(s.creationDraft).toBeNull();
    expect(s.turn).toBe(1);
    expect(s.character?.name).toBe('王质');
  });

  it('applies origin modifiers, starting coin and the perk flag', () => {
    const s = newGame('出身');
    setName(s, '王质', '');
    setOrigin(s, 'shusheng');
    setAttributes(s, EVEN);
    drawChessAffinity(s);
    const c = s.character!;
    // 落第书生: 才学 +3, 悟性 +1, 气韵 −1
    expect(c.attributes.caiXue).toBe(10);
    expect(c.attributes.wuXing).toBe(8);
    expect(c.attributes.qiYun).toBe(6);
    expect(c.coin).toBe(30);
    expect(c.flags['识文断字']).toBe(true);
  });

  it('starts every origin with full 心神 and no 心尘', () => {
    for (const origin of ORIGINS) {
      const s = newGame(`起手-${origin.id}`);
      setName(s, '王质', '');
      setOrigin(s, origin.id);
      setAttributes(s, EVEN);
      drawChessAffinity(s);
      const c = s.character!;
      expect(c.spirit).toBe(c.maxSpirit);
      expect(c.dust).toBe(0);
      expect(c.chessDao).toBe(origin.startChessDao);
    }
  });

  it('replays byte-for-byte from the same seed', () => {
    const build = () => {
      const s = newGame('确定性');
      setName(s, '王质', '观棋子');
      setOrigin(s, 'daotong');
      setAttributes(s, { xinJing: 10, wuXing: 8, caiXue: 6, qiYun: 4 });
      drawChessAffinity(s);
      return s;
    };
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});
