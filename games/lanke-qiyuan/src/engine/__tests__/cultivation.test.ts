import { describe, expect, it } from 'vitest';
import { cultivate, expectedExpGain, settleStageUps, speedBreakdown, tickMoods, applyMood, clearBurdens, boardBonus } from '../cultivation';
import { insightDC, sitForget, spectate, learnManual, studyManual, chessDaoLabel } from '../insight';
import { playableState, withCharacter } from './helpers';
import { getRealm } from '@/data/realms';
import { MAX_CHESS_DAO, MAX_DUST } from '../types';

describe('cultivation — the multiplier stack', () => {
  it('multiplies base, 棋缘, 参谱, 心境, 悟性 and the 心尘 penalty', () => {
    const s = playableState();
    const c = s.character!;
    const b = speedBreakdown(c);
    expect(b.total).toBeCloseTo(
      b.base * b.affinity * b.manual * b.mood * b.comprehension * b.dustPenalty,
      6,
    );
  });

  it('uses the realm table for its base', () => {
    const s = playableState();
    expect(speedBreakdown(s.character!).base).toBe(getRealm('chen').cultivateBase);
  });

  it('slows down as 心尘 rises', () => {
    const clean = playableState();
    const dirty = withCharacter(clean, { dust: 80 });
    expect(speedBreakdown(dirty.character!).total).toBeLessThan(
      speedBreakdown(clean.character!).total,
    );
  });

  it('floors the 心尘 penalty at 0.4 so a filthy mind still progresses', () => {
    const s = withCharacter(playableState(), { dust: MAX_DUST });
    expect(speedBreakdown(s.character!).dustPenalty).toBe(0.4);
    expect(expectedExpGain(s.character!)).toBeGreaterThan(0);
  });

  it('speeds up with a higher 悟性', () => {
    const dull = withCharacter(playableState(), { attributes: { xinJing: 7, wuXing: 4, caiXue: 7, qiYun: 7, yuanFa: 5 } });
    const sharp = withCharacter(playableState(), { attributes: { xinJing: 7, wuXing: 14, caiXue: 7, qiYun: 7, yuanFa: 5 } });
    expect(speedBreakdown(sharp.character!).total).toBeGreaterThan(speedBreakdown(dull.character!).total);
  });

  it('adds 修为 and spends 心神 on a 修炼 turn', () => {
    const s = playableState();
    const before = { exp: s.character!.realm.exp, spirit: s.character!.spirit };
    const out = cultivate(s);
    expect(out.gained).toBeGreaterThan(0);
    expect(s.character!.realm.exp).toBe(before.exp + out.gained);
    expect(s.character!.spirit).toBeLessThan(before.spirit);
  });

  it('never lets 修为 exceed the stage wall', () => {
    let s = playableState();
    for (let i = 0; i < 40; i++) {
      cultivate(s);
      expect(s.character!.realm.exp).toBeLessThanOrEqual(s.character!.realm.expNeeded);
      s = s;
    }
  });
});

describe('cultivation — the stage ladder', () => {
  it('promotes 初境 → 中境 when the bar is full', () => {
    const s = playableState();
    s.character!.realm.exp = s.character!.realm.expNeeded;
    const ups = settleStageUps(s);
    expect(ups).toHaveLength(1);
    expect(s.character!.realm.stage).toBe('中境');
    expect(s.character!.realm.exp).toBe(0);
  });

  it('chains 初境 → 圆融 when the wall is enormous', () => {
    const s = playableState();
    s.character!.realm.expNeeded = 1;
    s.character!.realm.exp = 1;
    const ups = settleStageUps(s);
    expect(ups.length).toBeGreaterThanOrEqual(1);
    expect(['中境', '圆融']).toContain(s.character!.realm.stage);
  });

  it('stops at 圆融 and raises the 破境 flag instead', () => {
    const s = playableState();
    s.character!.realm.stage = '圆融';
    s.character!.realm.exp = s.character!.realm.expNeeded;
    const ups = settleStageUps(s);
    expect(ups).toHaveLength(0);
    expect(s.character!.realm.stage).toBe('圆融');
    expect(s.character!.flags['圆融待破']).toBe(true);
  });

  it('does nothing when the bar is not full', () => {
    const s = playableState();
    s.character!.realm.exp = 1;
    expect(settleStageUps(s)).toHaveLength(0);
  });
});

describe('cultivation — 心境状态', () => {
  it('applies a mood and lets it colour the speed stack', () => {
    const s = playableState();
    const before = speedBreakdown(s.character!).total;
    applyMood(s, { id: 'm', name: '清风', kind: 'boon', turnsLeft: 2, speedMult: 1.5, desc: 'x' });
    expect(speedBreakdown(s.character!).total).toBeGreaterThan(before);
  });

  it('replaces a mood with the same id rather than stacking it', () => {
    const s = playableState();
    const mood = { id: 'm', name: '清风', kind: 'boon' as const, turnsLeft: 2, desc: 'x' };
    applyMood(s, mood);
    applyMood(s, mood);
    expect(s.character!.moods.filter((m) => m.id === 'm')).toHaveLength(1);
  });

  it('expires a mood after its last season', () => {
    const s = playableState();
    applyMood(s, { id: 'm', name: '清风', kind: 'boon', turnsLeft: 1, desc: 'x' });
    tickMoods(s);
    expect(s.character!.moods).toHaveLength(0);
  });

  it('keeps a permanent mood (turnsLeft −1) forever', () => {
    const s = playableState();
    applyMood(s, { id: 'm', name: '旧疾', kind: 'burden', turnsLeft: -1, desc: 'x' });
    for (let i = 0; i < 10; i++) tickMoods(s);
    expect(s.character!.moods).toHaveLength(1);
  });

  it('clears only burdens, leaving boons in place', () => {
    const s = playableState();
    applyMood(s, { id: 'a', name: '好', kind: 'boon', turnsLeft: 5, desc: 'x' });
    applyMood(s, { id: 'b', name: '坏', kind: 'burden', turnsLeft: 5, desc: 'x' });
    expect(clearBurdens(s)).toBe(1);
    expect(s.character!.moods.map((m) => m.id)).toEqual(['a']);
  });
});

describe('insight — 棋道悟性, the signature system', () => {
  it('raises the watching DC as 棋道 climbs', () => {
    expect(insightDC(0)).toBeLessThan(insightDC(50));
    expect(insightDC(50)).toBeLessThan(insightDC(100));
  });

  it('never lets 棋道 pass its ceiling however long you watch', () => {
    const s = withCharacter(playableState(), { chessDao: MAX_CHESS_DAO - 1 });
    for (let i = 0; i < 60; i++) {
      s.character!.spirit = s.character!.maxSpirit;
      spectate(s);
    }
    expect(s.character!.chessDao).toBeLessThanOrEqual(MAX_CHESS_DAO);
  });

  it('counts every 观棋 in the life statistics', () => {
    const s = playableState();
    spectate(s);
    spectate(s);
    expect(s.stats.gamesWatched).toBe(2);
  });

  it('reports a success whenever the total clears the DC', () => {
    const s = playableState();
    const out = spectate(s);
    if (out.d20 !== 1 && out.total >= out.dc) expect(out.success).toBe(true);
  });

  it('grants 棋道 on any success and nothing on a failure', () => {
    let sawSuccess = false;
    let sawFailure = false;
    for (let i = 0; i < 30 && !(sawSuccess && sawFailure); i++) {
      const s = playableState(`观棋-${i}`);
      const before = s.character!.chessDao;
      const out = spectate(s);
      if (out.success) {
        sawSuccess = true;
        expect(s.character!.chessDao).toBeGreaterThan(before);
      } else {
        sawFailure = true;
        expect(s.character!.chessDao).toBe(before);
      }
    }
    expect(sawSuccess).toBe(true);
  });

  it('labels 棋道 monotonically', () => {
    const seen = [0, 12, 26, 42, 58, 74, 88, 100].map(chessDaoLabel);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('insight — 坐忘', () => {
  it('restores 心神 and sheds 心尘', () => {
    const s = withCharacter(playableState(), { dust: 60 });
    s.character!.spirit = 1;
    const out = sitForget(s);
    expect(out.spiritRestored).toBeGreaterThan(0);
    expect(out.dustShed).toBeGreaterThan(0);
    expect(s.character!.dust).toBeLessThan(60);
  });

  it('never pushes 心神 above its ceiling', () => {
    const s = playableState();
    for (let i = 0; i < 10; i++) sitForget(s);
    expect(s.character!.spirit).toBeLessThanOrEqual(s.character!.maxSpirit);
  });

  it('never pushes 心尘 below zero', () => {
    const s = playableState();
    for (let i = 0; i < 10; i++) sitForget(s);
    expect(s.character!.dust).toBeGreaterThanOrEqual(0);
  });
});

describe('insight — 棋谱', () => {
  it('refuses a manual whose 棋道 requirement is unmet', () => {
    const s = withCharacter(playableState(), { chessDao: 0, insight: 99 });
    expect(learnManual(s, 'manual_tianpu_wuzi').ok).toBe(false);
  });

  it('refuses a manual the player cannot afford in 悟', () => {
    const s = withCharacter(playableState(), { chessDao: 100, insight: 0 });
    expect(learnManual(s, 'manual_gupu_lanke').ok).toBe(false);
  });

  it('spends 悟 and records the manual on success', () => {
    const s = withCharacter(playableState(), { chessDao: 100, insight: 30, manuals: [] });
    expect(learnManual(s, 'manual_gupu_jiangxue').ok).toBe(true);
    expect(s.character!.manuals).toContain('manual_gupu_jiangxue');
    expect(s.character!.insight).toBeLessThan(30);
  });

  it('discounts the 悟 cost for the 博览 perk', () => {
    const plain = withCharacter(playableState('谱', 'qiguan'), { chessDao: 100, insight: 30, manuals: [] });
    const wide = withCharacter(playableState('谱', 'guyi'), { chessDao: 100, insight: 30, manuals: [] });
    learnManual(plain, 'manual_mingpu_songfeng');
    learnManual(wide, 'manual_mingpu_songfeng');
    expect(wide.character!.insight).toBeGreaterThan(plain.character!.insight);
  });

  it('refuses to 参 a manual that has not been comprehended', () => {
    const s = withCharacter(playableState(), { manuals: [] });
    expect(studyManual(s, 'manual_tianpu_taixu').ok).toBe(false);
  });

  it('lifts the board bonus once a stronger manual is studied', () => {
    const s = withCharacter(playableState(), { chessDao: 100, insight: 99, manuals: [] });
    const before = boardBonus(s.character!);
    learnManual(s, 'manual_tianpu_wuzi');
    studyManual(s, 'manual_tianpu_wuzi');
    expect(boardBonus(s.character!)).toBeGreaterThan(before);
  });
});
