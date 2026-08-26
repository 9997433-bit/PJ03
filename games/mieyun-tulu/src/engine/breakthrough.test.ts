import { describe, expect, it } from 'vitest';
import { REALMS } from '@/data/realms';
import { attemptBreakthrough, breakthroughOdds } from './breakthrough';
import { execute } from './turn';
import { forceRealm, newRun, setCalamity } from '@/test/helpers';

describe('breakthrough · 赔率', () => {
  it('is not ready mid-realm and ready at a filled ceiling', () => {
    const mid = forceRealm(newRun('bt-mid'), 'yinqi');
    expect(breakthroughOdds(mid).ready).toBe(false);
    const full = forceRealm(newRun('bt-full'), 'yinqi', true);
    expect(breakthroughOdds(full).ready).toBe(true);
  });

  it('names the realm being entered, not the one being left', () => {
    const s = forceRealm(newRun('bt-name'), 'yinqi', true);
    expect(breakthroughOdds(s).targetRealm).toBe(REALMS.tongxuan.name);
  });

  it('publishes a target that is the sum of its own parts', () => {
    const s = forceRealm(newRun('bt-parts'), 'yinqi', true);
    s.character!.fortune = 40;
    setCalamity(s, 30);
    const o = breakthroughOdds(s);
    expect(o.fortunePart).toBe(10);
    expect(o.calamityPart).toBe(-12);
    expect(o.chance).toBe(
      Math.max(3, Math.min(97, o.base + o.bonus + o.fortunePart + o.calamityPart)),
    );
  });

  it('is helped by 气运 and hurt by 劫运', () => {
    const lucky = forceRealm(newRun('bt-lucky'), 'yinqi', true);
    lucky.character!.fortune = 90;
    setCalamity(lucky, 0);
    const cursed = forceRealm(newRun('bt-lucky'), 'yinqi', true);
    cursed.character!.fortune = 90;
    setCalamity(cursed, 80);
    expect(breakthroughOdds(cursed).chance).toBeLessThan(breakthroughOdds(lucky).chance);
  });

  it('clamps the published target into 3–97 even at absurd meters', () => {
    const doomed = forceRealm(newRun('bt-clamp'), 'yinqi', true);
    setCalamity(doomed, 100);
    doomed.character!.fortune = 0;
    const o = breakthroughOdds(doomed);
    expect(o.chance).toBeGreaterThanOrEqual(3);
    expect(o.chance).toBeLessThanOrEqual(97);
  });

  it('folds a 丹药 buff into the bonus term and spends it on the attempt', () => {
    const s = forceRealm(newRun('bt-buff'), 'yinqi', true);
    const before = breakthroughOdds(s).bonus;
    s.character!.breakthroughBuff = 15;
    expect(breakthroughOdds(s).bonus).toBe(before + 15);
    attemptBreakthrough(s);
    expect(s.character!.breakthroughBuff).toBe(0);
  });
});

describe('breakthrough · 结果', () => {
  it('refuses an attempt that is not ready and rolls no dice', () => {
    const s = forceRealm(newRun('bt-refuse'), 'yinqi');
    const rolls = s.rolls.length;
    const log = attemptBreakthrough(s);
    expect(s.character!.realm.realm).toBe('yinqi');
    expect(s.rolls.length).toBe(rolls);
    expect(log.some((l) => l.text.includes('破亦无门'))).toBe(true);
  });

  it('on success enters the next realm at its first stage with a full pool', () => {
    const s = forceRealm(newRun('bt-win'), 'yinqi', true);
    s.character!.fortune = 100;
    setCalamity(s, 0);
    s.character!.breakthroughBuff = 90;
    attemptBreakthrough(s);
    const c = s.character!;
    expect(c.realm.realm).toBe('tongxuan');
    expect(c.realm.stage).toBe('初期');
    expect(c.realm.exp).toBe(0);
    expect(c.hp).toBe(c.maxHp);
    expect(c.mana).toBe(c.maxMana);
  });

  it('charges 劫运 for the crossing', () => {
    const s = forceRealm(newRun('bt-debt'), 'yinqi', true);
    s.character!.breakthroughBuff = 200;
    const before = s.character!.calamity.value;
    attemptBreakthrough(s);
    expect(s.character!.realm.realm).toBe('tongxuan');
    expect(s.character!.calamity.value).toBeGreaterThan(before);
  });

  it('extends the lifespan when a realm is crossed', () => {
    const s = forceRealm(newRun('bt-life'), 'yinqi', true);
    s.character!.breakthroughBuff = 200;
    const before = s.character!.lifespan;
    attemptBreakthrough(s);
    expect(s.character!.lifespan).toBeGreaterThan(before);
  });

  it('records the new peak realm in the run ledger', () => {
    const s = forceRealm(newRun('bt-peak'), 'yinqi', true);
    s.character!.breakthroughBuff = 200;
    attemptBreakthrough(s);
    expect(s.stats.peakRealm).toBe('tongxuan');
    expect(s.stats.peakRealmLabel).toContain('通玄');
  });

  it('on failure keeps the realm, sheds exp and adds 劫运', () => {
    const s = forceRealm(newRun('bt-lose'), 'yinqi', true);
    setCalamity(s, 100);
    s.character!.fortune = 0;
    const beforeExp = s.character!.realm.exp;
    const beforeCal = s.character!.calamity.value;
    attemptBreakthrough(s);
    expect(s.character!.realm.realm).toBe('yinqi');
    expect(s.character!.realm.exp).toBeLessThan(beforeExp);
    expect(s.character!.calamity.value).toBeGreaterThanOrEqual(beforeCal);
  });

  it('cannot kill below 玄光, where the death chance is zero', () => {
    for (let i = 0; i < 24; i++) {
      const s = forceRealm(newRun(`bt-safe-${i}`), 'yinqi', true);
      setCalamity(s, 100);
      s.character!.fortune = 0;
      attemptBreakthrough(s);
      expect(s.character!.hp).toBeGreaterThan(0);
    }
  });

  it('marks a fatal 破关 with the flag the ending checker reads', () => {
    let sawFatal = false;
    for (let i = 0; i < 80 && !sawFatal; i++) {
      const s = forceRealm(newRun(`bt-fatal-${i}`), 'yuanshen', true);
      setCalamity(s, 100);
      s.character!.fortune = 0;
      attemptBreakthrough(s);
      if (s.character!.hp <= 0) {
        sawFatal = true;
        expect(s.character!.flags.breakFatal).toBe(true);
      }
    }
    expect(sawFatal).toBe(true);
  });

  it('costs nothing when the resolver turns an unready attempt away', () => {
    const s = forceRealm(newRun('bt-free'), 'yinqi');
    const turn = s.turn;
    const rolls = s.rolls.length;
    const result = execute(s, { kind: '突破' });
    expect(result.rejected).toContain('此关未满');
    expect(result.state).toBe(s);
    expect(s.turn).toBe(turn);
    expect(s.rolls.length).toBe(rolls);
  });

  it('lets the resolver through once the ceiling is full', () => {
    const s = forceRealm(newRun('bt-allowed'), 'yinqi', true);
    const result = execute(s, { kind: '突破' });
    expect(result.rejected).toBeUndefined();
    expect(result.state.turn).toBe(s.turn + 1);
  });

  it('is byte-identical for the same seed and state', () => {
    const a = forceRealm(newRun('bt-repro'), 'yinqi', true);
    const b = forceRealm(newRun('bt-repro'), 'yinqi', true);
    expect(attemptBreakthrough(a).map((l) => l.text)).toEqual(
      attemptBreakthrough(b).map((l) => l.text),
    );
    expect(a.character!.realm).toEqual(b.character!.realm);
  });
});
