import { describe, expect, it } from 'vitest';
import { CALAMITY_STRIKES, MITIGATIONS, TIER_FLOOR, tierOf } from '@/data/calamities';
import {
  calamityAccrual,
  calamityPhase,
  dissolveCalamity,
  drawStrike,
  mitigationChance,
  mitigationOptions,
  resolveStrike,
  strikeThreshold,
} from './calamity';
import { forceRealm, give, newRun, setCalamity } from '@/test/helpers';

describe('calamity · 劫运积累', () => {
  it('always accrues something once a life is under way', () => {
    const s = newRun('accrue');
    expect(calamityAccrual(s)).toBeGreaterThan(0);
  });

  it('accrues faster at a higher realm', () => {
    const low = newRun('tier-low');
    const high = forceRealm(newRun('tier-low'), 'yuanshen');
    expect(calamityAccrual(high)).toBeGreaterThan(calamityAccrual(low));
  });

  it('accrues faster the brighter the 气运', () => {
    const dim = newRun('fortune');
    const bright = newRun('fortune');
    bright.character!.fortune = 90;
    expect(calamityAccrual(bright)).toBeGreaterThan(calamityAccrual(dim));
  });

  it('accrues faster after 灭运 has been used repeatedly', () => {
    const clean = newRun('extinguish');
    const dirty = newRun('extinguish');
    dirty.character!.extinguishCount = 10;
    expect(calamityAccrual(dirty)).toBeGreaterThan(calamityAccrual(clean));
  });

  it('never exceeds the meter ceiling', () => {
    const s = setCalamity(newRun('ceiling'), 99.8);
    calamityPhase(s);
    expect(s.character!.calamity.value).toBeLessThanOrEqual(100);
  });

  it('tracks the peak monotonically', () => {
    const s = newRun('peak');
    for (let i = 0; i < 10; i++) calamityPhase(s);
    expect(s.character!.calamity.peak).toBeGreaterThanOrEqual(s.character!.calamity.value);
  });
});

describe('calamity · 阶与判定', () => {
  it('maps values to the five tiers at the documented floors', () => {
    expect(tierOf(0)).toBe('安泰');
    expect(tierOf(TIER_FLOOR.微澜)).toBe('微澜');
    expect(tierOf(TIER_FLOOR.阴云)).toBe('阴云');
    expect(tierOf(TIER_FLOOR.雷动)).toBe('雷动');
    expect(tierOf(TIER_FLOOR.天诛)).toBe('天诛');
    expect(tierOf(100)).toBe('天诛');
  });

  it('never lets the sky open below 25', () => {
    for (let v = 0; v < 25; v++) expect(strikeThreshold(v)).toBe(0);
  });

  it('raises the threshold monotonically above 25', () => {
    for (let v = 26; v <= 100; v++) {
      expect(strikeThreshold(v)).toBeGreaterThanOrEqual(strikeThreshold(v - 1));
    }
  });

  it('makes 天诛 overwhelmingly likely at the ceiling', () => {
    expect(strikeThreshold(100)).toBeGreaterThan(85);
  });

  it('rolls no 劫运判定 at all while the meter is calm', () => {
    const s = setCalamity(newRun('calm'), 0);
    const before = s.rolls.length;
    calamityPhase(s);
    expect(s.rolls.slice(before).some((r) => r.reason === '劫运判定')).toBe(false);
  });

  it('rolls the 劫运判定 as the first audited roll once the meter bites', () => {
    const s = setCalamity(newRun('bite'), 70);
    const before = s.rolls.length;
    calamityPhase(s);
    expect(s.rolls[before]!.reason).toBe('劫运判定');
  });
});

describe('calamity · 落劫', () => {
  it('draws only strikes belonging to the current tier', () => {
    const s = setCalamity(newRun('draw'), 65);
    for (let i = 0; i < 30; i++) {
      const strike = drawStrike(s, '雷动');
      expect(strike).not.toBeNull();
      expect(strike!.tier).toBe('雷动');
    }
  });

  it('never draws a 心魔 strike while 护魂符 is active', () => {
    const s = setCalamity(newRun('ward'), 45);
    s.character!.flags.hunWard = true;
    for (let i = 0; i < 40; i++) {
      expect(drawStrike(s, '阴云')!.kind).not.toBe('心魔');
    }
  });

  it('vents the meter when a damage strike resolves', () => {
    const s = setCalamity(newRun('vent'), 50);
    const strike = CALAMITY_STRIKES.find((x) => x.id === 'jie_shicai')!;
    const before = s.character!.calamity.value;
    resolveStrike(s, strike);
    expect(s.character!.calamity.value).toBe(before - strike.vent);
    expect(s.character!.calamity.survived).toBe(1);
  });

  it('spends 定劫符 instead of the character when one is carried', () => {
    const s = setCalamity(newRun('jieward'), 85);
    s.character!.flags.jieWard = true;
    const hpBefore = s.character!.hp;
    resolveStrike(s, CALAMITY_STRIKES.find((x) => x.id === 'jie_duanji')!);
    expect(s.character!.hp).toBe(hpBefore);
    expect(s.character!.flags.jieWard).toBeUndefined();
    expect(s.character!.calamity.dissolved).toBe(1);
  });

  it('turns a strike with an enemy into a fight the player must take', () => {
    const s = setCalamity(newRun('fight'), 65);
    resolveStrike(s, CALAMITY_STRIKES.find((x) => x.id === 'jie_tianlei')!);
    expect(s.phase).toBe('combat');
    expect(s.combat!.enemyId).toBe('tianlei');
    expect(s.combat!.source).toBe('calamity');
    expect(s.combat!.vent).toBeGreaterThan(0);
  });

  it('softens damage for a character with high 功德', () => {
    const strike = CALAMITY_STRIKES.find((x) => x.id === 'jie_xueguang')!;
    const poor = setCalamity(newRun('soft'), 50);
    const saint = setCalamity(newRun('soft'), 50);
    saint.character!.merit = 600;
    saint.character!.attributes.dingLi = 20;
    resolveStrike(poor, strike);
    resolveStrike(saint, strike);
    const poorLoss = poor.character!.maxHp - poor.character!.hp;
    const saintLoss = saint.character!.maxHp - saint.character!.hp;
    expect(saintLoss).toBeLessThan(poorLoss);
  });

  it('gives 荧惑守心 extra cultivation out of surviving a 劫', () => {
    const s = setCalamity(newRun('yinghuo'), 45);
    s.character!.fateId = 'yinghuo';
    s.character!.realm.exp = 0;
    resolveStrike(s, CALAMITY_STRIKES.find((x) => x.id === 'jie_liuhuo')!);
    expect(s.character!.realm.exp).toBeGreaterThan(0);
  });
});

describe('calamity · 化解劫运', () => {
  it('publishes an option for every mitigation', () => {
    const s = setCalamity(newRun('options'), 40);
    expect(mitigationOptions(s)).toHaveLength(MITIGATIONS.length);
  });

  it('marks unaffordable mitigations with a reason', () => {
    const s = setCalamity(newRun('poor'), 40);
    s.character!.spiritStones = 0;
    s.character!.merit = 0;
    const opts = mitigationOptions(s);
    expect(opts.find((o) => o.id === 'sheCai')!.affordable).toBe(false);
    expect(opts.find((o) => o.id === 'sheCai')!.reason).toBe('玄晶不足');
  });

  it('refuses 主动应劫 when there is no 劫 to meet', () => {
    const s = setCalamity(newRun('nojie'), 5);
    const yingJie = mitigationOptions(s).find((o) => o.id === 'yingJie')!;
    expect(yingJie.affordable).toBe(false);
  });

  it('lowers the published odds as 劫运 climbs', () => {
    const light = setCalamity(newRun('odds'), 25);
    const heavy = setCalamity(newRun('odds'), 90);
    expect(mitigationChance(heavy, 'sheCai')).toBeLessThan(mitigationChance(light, 'sheCai'));
  });

  it('keeps published odds inside 5–95', () => {
    for (const value of [20, 45, 70, 99]) {
      const s = setCalamity(newRun('bounds'), value);
      for (const m of MITIGATIONS) {
        if (m.id === 'yingJie') continue;
        const chance = mitigationChance(s, m.id);
        expect(chance).toBeGreaterThanOrEqual(5);
        expect(chance).toBeLessThanOrEqual(95);
      }
    }
  });

  it('charges the cost whether the attempt succeeds or fails', () => {
    const s = setCalamity(newRun('charge'), 45);
    s.character!.spiritStones = 1000;
    dissolveCalamity(s, 'sheCai');
    expect(s.character!.spiritStones).toBe(600);
  });

  it('consumes the 蔽运符 that 布蔽运阵 requires', () => {
    const s = give(setCalamity(newRun('array'), 45), 'bianyunfu', 1);
    s.character!.spiritStones = 1000;
    dissolveCalamity(s, 'buZhen');
    expect(s.character!.inventory.some((x) => x.itemId === 'bianyunfu')).toBe(false);
  });

  it('either lowers the meter on success or nudges it up on failure', () => {
    const s = setCalamity(newRun('outcome'), 50);
    s.character!.merit = 300;
    const before = s.character!.calamity.value;
    dissolveCalamity(s, 'sanGongDe');
    const after = s.character!.calamity.value;
    expect(after === before - 14 || after === before + 2).toBe(true);
  });

  it('主动应劫 pulls the strike forward instead of reducing the meter', () => {
    const s = setCalamity(newRun('meet'), 65);
    const logs = dissolveCalamity(s, 'yingJie');
    expect(logs.some((l) => l.speaker === '劫')).toBe(true);
    expect(s.character!.flags.yingJieCount).toBe(1);
  });

  it('rejects an unknown mitigation without touching the character', () => {
    const s = setCalamity(newRun('unknown'), 45);
    const stones = s.character!.spiritStones;
    // @ts-expect-error — deliberately illegal id
    dissolveCalamity(s, 'nope');
    expect(s.character!.spiritStones).toBe(stones);
  });
});
