import { describe, expect, it } from 'vitest';
import { ENDINGS, endingById } from '@/data/endings';
import { ALL_ENDING_IDS, buildStats, canRetire, checkEndings, ENDING_TRIGGERS } from './endings';
import { forceRealm, newRun, setCalamity } from '@/test/helpers';

describe('endings · 目录', () => {
  it('ships at least twelve endings', () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(12);
  });

  it('covers victory, transcend, death, retire and fall', () => {
    const kinds = new Set(ENDINGS.map((e) => e.kind));
    for (const kind of ['victory', 'transcend', 'death', 'retire', 'fall']) {
      expect(kinds.has(kind as never)).toBe(true);
    }
  });

  it('documents a trigger for every id, and no phantom ids', () => {
    expect(Object.keys(ENDING_TRIGGERS).sort()).toEqual([...ALL_ENDING_IDS].sort());
  });

  it('gives every ending prose to close on', () => {
    for (const e of ENDINGS) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeGreaterThan(4);
      expect(e.closing.length).toBeGreaterThan(30);
    }
  });
});

describe('endings · 判定', () => {
  it('returns null while the story continues', () => {
    expect(checkEndings(forceRealm(newRun('alive'), 'tongxuan'))).toBeNull();
  });

  it('awards 长生 on entering the last realm', () => {
    const s = forceRealm(newRun('cs'), 'changsheng');
    expect(checkEndings(s)?.id).toBe('changsheng');
  });

  it('awards 图录出世 instead when the three卷 woke and 真解 is known', () => {
    const s = forceRealm(newRun('tulu-end'), 'changsheng');
    s.character!.flags.tuluAwake = true;
    s.character!.learned.push('tulu3n');
    expect(checkEndings(s)?.id).toBe('tulu_chushi');
  });

  it('awards 天诛 at a full 劫运 meter', () => {
    const s = setCalamity(forceRealm(newRun('doom'), 'yuanshen'), 100);
    expect(checkEndings(s)?.id).toBe('tianzhu');
  });

  it('awards 陨于斗法 for an ordinary death', () => {
    const s = forceRealm(newRun('slain'), 'tongxuan');
    s.character!.hp = 0;
    expect(checkEndings(s)?.id).toBe('zhanwang');
  });

  it('distinguishes the manner of death by flag', () => {
    const cases: [string, string][] = [
      ['zouhuoFatal', 'zouhuo'],
      ['breakFatal', 'posui'],
    ];
    for (const [flag, id] of cases) {
      const s = forceRealm(newRun(`death-${flag}`), 'tongxuan');
      s.character!.hp = 0;
      s.character!.flags[flag] = true;
      expect(checkEndings(s)?.id).toBe(id);
    }
    for (const slayer of ['xinmo', 'tianzhu']) {
      const s = forceRealm(newRun(`slain-${slayer}`), 'tongxuan');
      s.character!.hp = 0;
      s.character!.flags.slainBy = slayer;
      expect(checkEndings(s)?.id).toBe(slayer);
    }
  });

  it('lets a scripted death outrank every other cause', () => {
    const s = forceRealm(newRun('scripted'), 'tongxuan');
    s.character!.hp = 0;
    s.character!.flags.breakFatal = true;
    s.character!.flags.scriptedDeath = 'xinmo';
    expect(checkEndings(s)?.id).toBe('xinmo');
  });

  it('ranks death above a full 劫运 meter', () => {
    const s = setCalamity(forceRealm(newRun('both'), 'yuanshen'), 100);
    s.character!.hp = 0;
    expect(checkEndings(s)?.id).toBe('zhanwang');
  });

  it('awards 道统之主 to a ranked 元神 sect head', () => {
    const s = forceRealm(newRun('patriarch'), 'yuanshen');
    s.character!.sectId = 'taiyi';
    s.character!.sectRankIndex = 3;
    expect(checkEndings(s)?.id).toBe('daotong');
  });

  it('awards 夺运之魔 to a prolific 灭运 with no 功德 left', () => {
    const s = forceRealm(newRun('devil'), 'xuanguang');
    s.character!.extinguishCount = 12;
    s.character!.merit = -200;
    expect(checkEndings(s)?.id).toBe('duoyun_mo');
  });

  it('awards 寿元耗尽 when the years run out', () => {
    const s = forceRealm(newRun('old'), 'tongxuan');
    s.character!.age = s.character!.lifespan + 1;
    expect(checkEndings(s)?.id).toBe('shouyuan');
  });

  it('awards 无禄 when both meters flatten late in a run', () => {
    const s = forceRealm(newRun('flat'), 'tongxuan');
    s.character!.fortune = 0;
    setCalamity(s, 0);
    s.turn = 40;
    expect(checkEndings(s)?.id).toBe('wulu');
  });

  it('does not award 无禄 to a flat but young run', () => {
    const s = forceRealm(newRun('young-flat'), 'tongxuan');
    s.character!.fortune = 0;
    setCalamity(s, 0);
    s.turn = 5;
    expect(checkEndings(s)).toBeNull();
  });

  it('never ends a run twice', () => {
    const s = forceRealm(newRun('sealed-end'), 'changsheng');
    const first = checkEndings(s)!;
    s.ending = first;
    expect(checkEndings(s)).toBeNull();
  });
});

describe('endings · 归隐', () => {
  it('is only consulted when the player asks to leave', () => {
    const s = forceRealm(newRun('retire-gate'), 'tongxuan');
    s.turn = 30;
    s.character!.merit = 500;
    expect(checkEndings(s, false)).toBeNull();
    expect(checkEndings(s, true)?.id).toBe('gongde_yuanman');
  });

  it('honours a life of 劫 survived over a plain retirement', () => {
    const s = forceRealm(newRun('retire-trials'), 'tongxuan');
    s.turn = 30;
    s.character!.calamity.survived = 7;
    s.character!.calamity.dissolved = 4;
    expect(checkEndings(s, true)?.id).toBe('jieyu_daoshi');
  });

  it('falls back to plain 归隐', () => {
    const s = forceRealm(newRun('retire-plain'), 'tongxuan');
    s.turn = 30;
    s.character!.fortune = 50;
    setCalamity(s, 30);
    expect(checkEndings(s, true)?.id).toBe('guiyin');
  });

  it('refuses retirement before 通玄 and before the fifteenth year', () => {
    const early = newRun('too-early');
    expect(canRetire(early)).not.toBeNull();
    const lowRealm = forceRealm(newRun('low'), 'yinqi');
    lowRealm.turn = 40;
    expect(canRetire(lowRealm)).toContain('未通玄');
    const tooSoon = forceRealm(newRun('soon'), 'tongxuan');
    tooSoon.turn = 3;
    expect(canRetire(tooSoon)).toContain('太早');
  });

  it('allows retirement once both gates open', () => {
    const s = forceRealm(newRun('may-retire'), 'tongxuan');
    s.turn = 20;
    expect(canRetire(s)).toBeNull();
  });
});

describe('endings · 结算', () => {
  it('reports the run ledger with the ending', () => {
    const s = forceRealm(newRun('ledger'), 'changsheng');
    s.turn = 33;
    s.character!.age = 60;
    setCalamity(s, 70);
    const result = checkEndings(s)!;
    expect(result.stats.turns).toBe(33);
    expect(result.stats.years).toBe(44);
    expect(result.stats.peakCalamity).toBeGreaterThanOrEqual(70);
    expect(result.title).toBe(endingById('changsheng')!.title);
  });

  it('keeps the recorded peak when the character has since fallen', () => {
    const s = forceRealm(newRun('peak'), 'tongxuan');
    s.stats.peakRealm = 'yuanshen';
    s.stats.peakRealmLabel = '元神·圆满';
    expect(buildStats(s).peakRealmLabel).toBe('元神·圆满');
  });
});
