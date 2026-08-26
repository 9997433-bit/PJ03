import { describe, expect, it } from 'vitest';
import { REALMS, REALM_ORDER } from '@/data/realms';
import { attemptBreakthrough, breakthroughOdds } from './breakthrough';
import {
  advanceProgress,
  atRealmCeiling,
  cultivate,
  cultivationGain,
  expNeededFor,
  isReadyForBreakthrough,
  realmLabel,
  seclude,
} from './cultivation';
import { forceRealm, newRun, setCalamity } from '@/test/helpers';

describe('cultivation · 修为', () => {
  it('yields at least one point of progress per turn', () => {
    expect(cultivationGain(newRun('gain'))).toBeGreaterThan(0);
  });

  it('scales with 悟性', () => {
    const dull = newRun('wits', { allocation: { shenHun: 6, tiPo: 6, wuXing: 0, dingLi: 0, jiBian: 0 } });
    const sharp = newRun('wits', { allocation: { shenHun: 0, tiPo: 0, wuXing: 7, dingLi: 5, jiBian: 0 } });
    expect(cultivationGain(sharp)).toBeGreaterThan(cultivationGain(dull));
  });

  it('is slowed by an injury and restored when it heals', () => {
    const s = newRun('injury');
    const healthy = cultivationGain(s);
    s.character!.injuries.push({
      id: 'daojiLie',
      name: '道基裂',
      severity: 3,
      turnsLeft: 5,
      effect: { cultivation: -0.45 },
    });
    expect(cultivationGain(s)).toBeLessThan(healthy);
    s.character!.injuries = [];
    expect(cultivationGain(s)).toBe(healthy);
  });

  it('spills through 引气 layers when given a large pour', () => {
    const s = forceRealm(newRun('layers'), 'yinqi');
    advanceProgress(s, 100000);
    expect(s.character!.realm.layer).toBe(9);
    expect(atRealmCeiling(s.character!.realm)).toBe(true);
  });

  it('spills through stages in a staged realm', () => {
    const s = forceRealm(newRun('stages'), 'tongxuan');
    advanceProgress(s, 10_000_000);
    expect(s.character!.realm.stage).toBe('圆满');
  });

  it('stops dead at the realm ceiling instead of overflowing', () => {
    const s = forceRealm(newRun('ceiling'), 'yinqi', true);
    advanceProgress(s, 999999);
    expect(s.character!.realm.exp).toBe(s.character!.realm.expNeeded);
    expect(isReadyForBreakthrough(s.character!.realm)).toBe(true);
  });

  it('never drops exp below zero', () => {
    const s = forceRealm(newRun('floor'), 'yinqi');
    advanceProgress(s, -99999);
    expect(s.character!.realm.exp).toBe(0);
  });

  it('grows the requirement geometrically across layers', () => {
    const s = forceRealm(newRun('growth'), 'yinqi');
    const first = expNeededFor(s.character!.realm);
    s.character!.realm.layer = 8;
    expect(expNeededFor(s.character!.realm)).toBeGreaterThan(first);
  });

  it('labels 引气 by layer and staged realms by stage', () => {
    const s = forceRealm(newRun('label'), 'yinqi');
    expect(realmLabel(s.character!.realm)).toBe('引气1层');
    forceRealm(s, 'xuanguang');
    expect(realmLabel(s.character!.realm)).toBe('玄光·初期');
  });

  it('闭关 outpaces 修炼 but adds 劫运', () => {
    const a = forceRealm(newRun('seclude'), 'yinqi');
    const b = forceRealm(newRun('seclude'), 'yinqi');
    cultivate(a);
    const jieBefore = b.character!.calamity.value;
    seclude(b);
    expect(b.character!.realm.exp).toBeGreaterThan(a.character!.realm.exp);
    expect(b.character!.calamity.value).toBe(jieBefore + 4);
  });

  it('risks 走火入魔 only once the meter is heavy', () => {
    const calm = setCalamity(forceRealm(newRun('zouhuo'), 'yinqi'), 10);
    const before = calm.rolls.length;
    cultivate(calm);
    expect(calm.rolls.slice(before).some((r) => r.reason === '修炼·气机逆转')).toBe(false);

    const risky = setCalamity(forceRealm(newRun('zouhuo'), 'yinqi'), 90);
    const before2 = risky.rolls.length;
    cultivate(risky);
    expect(risky.rolls.slice(before2).some((r) => r.reason === '修炼·气机逆转')).toBe(true);
  });
});

describe('breakthrough · 突破', () => {
  it('refuses while the bar is unfilled', () => {
    const s = forceRealm(newRun('early'), 'yinqi');
    expect(breakthroughOdds(s).ready).toBe(false);
    const logs = attemptBreakthrough(s);
    expect(logs.some((l) => l.text.includes('此关未满'))).toBe(true);
  });

  it('publishes the full arithmetic of the target number', () => {
    const s = forceRealm(newRun('odds'), 'yinqi', true);
    const odds = breakthroughOdds(s);
    expect(odds.ready).toBe(true);
    expect(odds.chance).toBe(
      Math.max(3, Math.min(97, odds.base + odds.bonus + odds.fortunePart + odds.calamityPart)),
    );
  });

  it('is helped by 气运 and hurt by 劫运', () => {
    const lucky = forceRealm(newRun('luck'), 'yinqi', true);
    lucky.character!.fortune = 90;
    lucky.character!.calamity.value = 0;
    const cursed = forceRealm(newRun('luck'), 'yinqi', true);
    cursed.character!.fortune = 0;
    cursed.character!.calamity.value = 90;
    expect(breakthroughOdds(lucky).chance).toBeGreaterThan(breakthroughOdds(cursed).chance);
  });

  it('clamps the published target into 3–97', () => {
    const s = forceRealm(newRun('clamp'), 'yinqi', true);
    s.character!.attributes.dingLi = 40;
    s.character!.breakthroughBuff = 500;
    expect(breakthroughOdds(s).chance).toBeLessThanOrEqual(97);
    s.character!.attributes.dingLi = 0;
    s.character!.breakthroughBuff = 0;
    s.character!.calamity.value = 100;
    forceRealm(s, 'dongzhen', true);
    expect(breakthroughOdds(s).chance).toBeGreaterThanOrEqual(3);
  });

  it('consumes the pill buff whether it works or not', () => {
    const s = forceRealm(newRun('buff'), 'yinqi', true);
    s.character!.breakthroughBuff = 30;
    attemptBreakthrough(s);
    expect(s.character!.breakthroughBuff).toBe(0);
  });

  it('deposits 劫运 on a successful crossing', () => {
    const s = forceRealm(newRun('deposit'), 'yinqi', true);
    s.character!.attributes.dingLi = 20;
    s.character!.fortune = 100;
    s.character!.calamity.value = 0;
    attemptBreakthrough(s);
    if (s.character!.realm.realm === 'tongxuan') {
      expect(s.character!.calamity.value).toBeGreaterThan(0);
      expect(s.character!.realm.exp).toBe(0);
      expect(s.character!.hp).toBe(s.character!.maxHp);
    }
  });

  it('records the peak realm reached', () => {
    const s = forceRealm(newRun('peak'), 'yinqi', true);
    s.character!.attributes.dingLi = 25;
    s.character!.fortune = 100;
    s.character!.calamity.value = 0;
    attemptBreakthrough(s);
    if (s.character!.realm.realm === 'tongxuan') {
      expect(s.stats.peakRealm).toBe('tongxuan');
    }
  });

  it('rolls a death check only in realms that carry one', () => {
    const s = forceRealm(newRun('death'), 'yinqi', true);
    s.character!.attributes.dingLi = 0;
    s.character!.calamity.value = 95;
    const before = s.rolls.length;
    attemptBreakthrough(s);
    // 通玄 has deathChance 0, so no 生死 roll should ever appear.
    expect(s.rolls.slice(before).some((r) => r.reason === '破关·生死')).toBe(false);
  });

  it('keeps realm ladder ordering and lifespans monotone', () => {
    for (let i = 1; i < REALM_ORDER.length; i++) {
      const prev = REALMS[REALM_ORDER[i - 1]!];
      const curr = REALMS[REALM_ORDER[i]!];
      expect(curr.order).toBe(prev.order + 1);
      expect(curr.lifespan).toBeGreaterThan(prev.lifespan);
      expect(curr.cultivationBase).toBeGreaterThan(prev.cultivationBase);
      expect(curr.breakthroughBase).toBeLessThan(prev.breakthroughBase);
      expect(curr.calamityOnEntry).toBeGreaterThanOrEqual(prev.calamityOnEntry);
    }
  });
});
