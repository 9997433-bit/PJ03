import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COURTESY,
  DEFAULT_NAME,
  QIYUAN_LOTTERY,
  allocateAttributes,
  chooseOrigin,
  lookupQiYuanRow,
  newGame,
  resolveChessAffinity,
  rollChessAffinity,
  setIdentity,
} from '@/engine/creation';
import { ATTR_MAX, ATTR_MIN, ATTR_TOTAL, validateAllocation } from '@/engine/attributes';
import { ALL_AFFINITIES } from '@/engine/types';
import { EVEN_ALLOC, playingState } from './helpers';

describe('creation — the 棋缘 lottery table', () => {
  it('covers 1..100 with no gap or overlap', () => {
    for (let d = 1; d <= 100; d++) {
      const matches = QIYUAN_LOTTERY.filter((r) => d >= r.min && d <= r.max);
      expect(matches, `D100=${d}`).toHaveLength(1);
    }
  });

  it('rises monotonically in speed and board bonus', () => {
    for (let i = 1; i < QIYUAN_LOTTERY.length; i++) {
      expect(QIYUAN_LOTTERY[i]!.speedMultiplier).toBeGreaterThan(
        QIYUAN_LOTTERY[i - 1]!.speedMultiplier,
      );
      expect(QIYUAN_LOTTERY[i]!.boardBonus).toBeGreaterThanOrEqual(
        QIYUAN_LOTTERY[i - 1]!.boardBonus,
      );
    }
  });

  it('maps the extremes to the expected grades', () => {
    expect(lookupQiYuanRow(1).grade).toBe('顽石之缘');
    expect(lookupQiYuanRow(100).grade).toBe('太虚棋缘');
  });

  it('throws on an impossible roll', () => {
    expect(() => lookupQiYuanRow(0)).toThrow(/棋缘天数溢出/);
    expect(() => lookupQiYuanRow(101)).toThrow();
  });

  it('draws the right number of distinct affinities', () => {
    for (const row of QIYUAN_LOTTERY) {
      const affinity = resolveChessAffinity(row.min, () => 0);
      expect(affinity.affinities).toHaveLength(row.affinityCount);
      expect(new Set(affinity.affinities).size).toBe(row.affinityCount);
      for (const a of affinity.affinities) expect(ALL_AFFINITIES).toContain(a);
    }
  });

  it('records the roll that produced it', () => {
    expect(resolveChessAffinity(77, () => 1).rollValue).toBe(77);
  });
});

describe('creation — attribute allocation rules', () => {
  it('accepts a lawful spread', () => {
    expect(validateAllocation(EVEN_ALLOC)).toBeNull();
  });

  it('rejects a wrong total', () => {
    expect(validateAllocation({ ...EVEN_ALLOC, xinJing: 8 })).toContain(String(ATTR_TOTAL));
  });

  it('rejects values outside the per-item band', () => {
    expect(
      validateAllocation({ xinJing: ATTR_MAX + 1, wuXing: 4, caiXue: 4, qiYun: 9 }),
    ).toContain(`${ATTR_MIN}–${ATTR_MAX}`);
  });

  it('rejects non-integers', () => {
    expect(validateAllocation({ ...EVEN_ALLOC, wuXing: 7.5, caiXue: 6.5 })).not.toBeNull();
  });
});

describe('creation — the four-step gate', () => {
  it('starts in the creation phase at step 0 with an opening narration', () => {
    const s = newGame('棋-gate');
    expect(s.phase).toBe('creation');
    expect(s.creationStep).toBe(0);
    expect(s.character).toBeNull();
    expect(s.narrativeLog.length).toBeGreaterThan(0);
  });

  it('refuses to skip straight to the origin', () => {
    const s = chooseOrigin(newGame('棋-skip'), 'shusheng');
    expect(s.creationStep).toBe(0);
    expect(s.creationDraft?.originId).toBeNull();
  });

  it('refuses to skip straight to attributes or the draw', () => {
    const base = newGame('棋-skip2');
    expect(allocateAttributes(base, EVEN_ALLOC).creationStep).toBe(0);
    expect(rollChessAffinity(base).creationStep).toBe(0);
  });

  it('falls back to default names when given blanks', () => {
    const s = setIdentity(newGame('棋-blank'), '   ', '');
    expect(s.creationDraft?.name).toBe(DEFAULT_NAME);
    expect(s.creationDraft?.courtesy).toBe(DEFAULT_COURTESY);
  });

  it('trims over-long names', () => {
    const s = setIdentity(newGame('棋-long'), '一二三四五六七八九十', '甲乙丙丁戊己庚辛壬');
    expect(s.creationDraft!.name.length).toBeLessThanOrEqual(8);
    expect(s.creationDraft!.courtesy.length).toBeLessThanOrEqual(8);
  });

  it('will not revisit a completed step', () => {
    let s = setIdentity(newGame('棋-once'), '甲', '乙');
    s = setIdentity(s, '丙', '丁');
    expect(s.creationDraft?.name).toBe('甲');
    expect(s.creationStep).toBe(1);
  });

  it('rejects an unknown origin', () => {
    const s = chooseOrigin(setIdentity(newGame('棋-bad'), '甲', '乙'), 'no_such_origin');
    expect(s.creationStep).toBe(1);
  });

  it('applies origin modifiers on top of the allocation', () => {
    let s = setIdentity(newGame('棋-mods'), '甲', '乙');
    s = chooseOrigin(s, 'shusheng'); // 才学 +3, 悟性 +1, 气韵 −1
    s = allocateAttributes(s, EVEN_ALLOC);
    expect(s.creationDraft!.attributes).toEqual({
      xinJing: 7,
      wuXing: 8,
      caiXue: 10,
      qiYun: 6,
    });
  });

  it('reaches the playing phase with a fully-formed character', () => {
    const s = playingState();
    expect(s.phase).toBe('playing');
    expect(s.creationStep).toBe(4);
    expect(s.creationDraft).toBeNull();
    expect(s.turn).toBe(1);
    const c = s.character!;
    expect(c.name).toBe('计缘');
    expect(c.courtesy).toBe('青竹');
    expect(c.spirit).toBe(c.maxSpirit);
    expect(c.realm.realm).toBe('chen');
    expect(c.realm.stage).toBe('初境');
    expect(c.dust).toBe(0);
  });

  it('grants the origin its starting kit', () => {
    const c = playingState().character!;
    expect(c.coin).toBe(30);
    expect(c.inventory.map((i) => i.itemId)).toContain('brush_qingyu');
    expect(c.manuals).toContain('manual_canpu_shuangyan');
    expect(c.studyingId).toBe('manual_canpu_shuangyan');
  });

  it('seals the hidden 缘法 roll and keeps it off every narrated line', () => {
    const s = playingState();
    const sealed = s.rolls.filter((r) => r.sealed);
    expect(sealed).toHaveLength(1);
    expect(sealed[0]!.reason).toContain('缘法暗掷');
    const yuanFa = s.character!.attributes.yuanFa;
    expect(yuanFa).toBeGreaterThanOrEqual(1);
    expect(yuanFa).toBeLessThanOrEqual(10);
    for (const line of s.narrativeLog) {
      expect(line.text).not.toContain('缘法:');
      expect(line.text).not.toContain(`缘法${yuanFa}`);
    }
  });

  it('is fully deterministic for a given seed', () => {
    const a = playingState('棋-determinism');
    const b = playingState('棋-determinism');
    expect(a.character!.chessAffinity).toEqual(b.character!.chessAffinity);
    expect(a.character!.attributes.yuanFa).toBe(b.character!.attributes.yuanFa);
    expect(a.rngState).toBe(b.rngState);
  });

  it('gives different lives to different seeds', () => {
    const seeds = ['棋-1', '棋-2', '棋-3', '棋-4', '棋-5', '棋-6'];
    const grades = seeds.map((s) => playingState(s).character!.chessAffinity.rollValue);
    expect(new Set(grades).size).toBeGreaterThan(1);
  });

  it('refuses a second draw of the 棋缘', () => {
    const s = playingState();
    const again = rollChessAffinity(s);
    expect(again.character!.chessAffinity).toEqual(s.character!.chessAffinity);
  });
});
