import { describe, expect, it } from 'vitest';
import { buildForecast, canDivine, divinationCost, divine } from './divination';
import { calamityPhase, strikeThreshold } from './calamity';
import { peekDice } from './rng';
import { cloneState } from './util';
import { forceRealm, newRun, setCalamity } from '@/test/helpers';

function rich(seed: string, calamity = 70) {
  const s = setCalamity(forceRealm(newRun(seed), 'xuanguang'), calamity);
  s.character!.spiritStones = 50000;
  s.character!.mana = s.character!.maxMana;
  return s;
}

describe('divination · 推演命数', () => {
  it('prices the three depths in ascending order', () => {
    const s = rich('price');
    const shallow = divinationCost(s, 'shallow');
    const deep = divinationCost(s, 'deep');
    const heavenly = divinationCost(s, 'heavenly');
    expect(deep.stones).toBeGreaterThan(shallow.stones);
    expect(heavenly.stones).toBeGreaterThan(deep.stones);
    expect(heavenly.costsTurn).toBe(true);
    expect(shallow.costsTurn).toBe(false);
  });

  it('discounts for 钦天监小吏 and for 太阴入命', () => {
    const plain = rich('discount');
    plain.character!.originId = 'shusheng';
    plain.character!.fateId = 'wuge';
    const seer = rich('discount');
    seer.character!.originId = 'guanxing';
    seer.character!.fateId = 'taiyin';
    expect(divinationCost(seer, 'deep').stones).toBeLessThan(divinationCost(plain, 'deep').stones);
    expect(divinationCost(seer, 'deep').calamity).toBeLessThan(
      divinationCost(plain, 'deep').calamity,
    );
  });

  it('refuses when 玄晶 or 法力 fall short', () => {
    const s = rich('poor');
    s.character!.spiritStones = 0;
    expect(canDivine(s, 'deep')).toContain('玄晶不足');
    s.character!.spiritStones = 50000;
    s.character!.mana = 0;
    expect(canDivine(s, 'deep')).toContain('法力不足');
  });

  it('burns no audited rolls — looking must not move what is looked at', () => {
    const s = rich('nodice');
    const before = s.rolls.length;
    const rng = s.rngState;
    divine(s, 'heavenly');
    expect(s.rolls.length).toBe(before);
    expect(s.rngState).toBe(rng);
  });

  it('charges the backlash to the meter', () => {
    const s = rich('backlash', 40);
    const before = s.character!.calamity.value;
    const cost = divinationCost(s, 'deep');
    divine(s, 'deep');
    expect(s.character!.calamity.value).toBe(before + cost.calamity);
  });

  it('浅观 reveals probabilities but no raw dice', () => {
    const s = rich('shallow');
    const f = buildForecast(s, 'shallow');
    expect(f.lines.every((l) => l.peek === undefined)).toBe(true);
    expect(f.lines.some((l) => l.label === '劫运')).toBe(true);
  });

  it('深演 names the exact next D100 and it is the one that lands', () => {
    const s = rich('deep', 75);
    const forecast = buildForecast(s, 'deep');
    const line = forecast.lines.find((l) => l.label === '下一掷')!;
    const predicted = Number(line.peek);
    expect(predicted).toBe(peekDice(s.rngState, 'D100', 1)[0]);

    const before = s.rolls.length;
    calamityPhase(s);
    const actual = s.rolls[before]!;
    expect(actual.reason).toBe('劫运判定');
    expect(actual.value).toBe(predicted);
  });

  it('深演 verdict about whether the sky opens matches the outcome', () => {
    for (const seed of ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']) {
      const s = rich(seed, 78);
      const forecast = buildForecast(s, 'deep');
      const predictedStrike = forecast.summary.includes('有劫');
      const probe = cloneState(s);
      const logs = calamityPhase(probe);
      const struck = logs.some((l) => l.text.includes('天开了一线'));
      expect(struck).toBe(predictedStrike);
    }
  });

  it('窥天 names the 劫 that the very next phase produces', () => {
    const s = rich('heavenly', 92);
    const forecast = buildForecast(s, 'heavenly');
    const line = forecast.lines.find((l) => l.label === '窥天')!;
    const probe = cloneState(s);
    const logs = calamityPhase(probe);
    const jieText = logs
      .filter((l) => l.speaker === '劫')
      .map((l) => l.text)
      .join(' ');
    if (jieText) expect(line.detail).toBe(jieText);
    else expect(line.detail).toContain('无劫可窥');
  });

  it('projects next year\u2019s meter, tier and threshold consistently', () => {
    const s = rich('project', 55);
    const f = buildForecast(s, 'shallow');
    const line = f.lines.find((l) => l.label === '劫运')!;
    const projected = s.character!.calamity.value;
    expect(line.chance).toBeGreaterThanOrEqual(strikeThreshold(projected));
  });

  it('counts every reading and stores the latest forecast', () => {
    const s = rich('count');
    divine(s, 'shallow');
    divine(s, 'shallow');
    expect(s.stats.divinations).toBe(2);
    expect(s.forecast).not.toBeNull();
    expect(s.forecast!.turn).toBe(s.turn + 1);
  });

  it('is deterministic — same state, same reading', () => {
    const a = rich('mirror', 68);
    const b = rich('mirror', 68);
    expect(buildForecast(a, 'heavenly')).toEqual(buildForecast(b, 'heavenly'));
  });
});
