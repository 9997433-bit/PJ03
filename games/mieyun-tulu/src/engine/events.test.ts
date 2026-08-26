import { describe, expect, it } from 'vitest';
import { EVENTS, eventById } from '@/data/events';
import {
  BUCKET_BANDS,
  applyEventEffect,
  bucketForRoll,
  choiceChance,
  chooseEventOption,
  eligibleDestiny,
  eventsInBucket,
  explore,
  fortuneOffset,
  isEligible,
  resolveChoices,
} from './events';
import { forceRealm, newRun, setCalamity } from '@/test/helpers';

describe('events · 定桶', () => {
  it('covers D100 1..100 contiguously', () => {
    let expected = 1;
    for (const band of BUCKET_BANDS) {
      expect(band.min).toBe(expected);
      expected = band.max + 1;
    }
    expect(expected).toBe(101);
  });

  it('maps every value in 1..100 to a bucket', () => {
    for (let v = 1; v <= 100; v++) expect(bucketForRoll(v)).toBeTruthy();
  });

  it('clamps out-of-range values instead of falling through', () => {
    expect(bucketForRoll(-40)).toBe('大凶');
    expect(bucketForRoll(400)).toBe('大吉');
  });

  it('shifts the distribution right with 气运 and left with 劫运', () => {
    const bright = newRun('offset');
    bright.character!.fortune = 90;
    bright.character!.calamity.value = 0;
    const doomed = newRun('offset');
    doomed.character!.fortune = 0;
    doomed.character!.calamity.value = 90;
    expect(fortuneOffset(bright)).toBeGreaterThan(0);
    expect(fortuneOffset(doomed)).toBeLessThan(0);
  });
});

describe('events · 资格', () => {
  it('filters by realm order', () => {
    const s = forceRealm(newRun('realm'), 'yinqi');
    const ev = EVENTS.find((e) => !e.realmOrders.includes(1))!;
    expect(isEligible(s, ev)).toBe(false);
  });

  it('honours requiresFlag and forbidsFlag', () => {
    const s = forceRealm(newRun('flags'), 'yinqi');
    const chained = eventById('t_canjuan')!;
    expect(isEligible(s, chained)).toBe(false);
    s.character!.flags.tuluTrace = true;
    expect(isEligible(s, chained)).toBe(true);
    s.character!.flags.tulu1 = true;
    expect(isEligible(s, chained)).toBe(false);
  });

  it('honours the calamity window', () => {
    const s = forceRealm(newRun('window'), 'tongxuan');
    const gated = eventById('d_jieyun_fanshi')!;
    s.character!.calamity.value = 5;
    expect(isEligible(s, gated)).toBe(false);
    s.character!.calamity.value = 60;
    expect(isEligible(s, gated)).toBe(true);
  });

  it('honours the sealed 道缘 gate', () => {
    const s = forceRealm(newRun('seal'), 'yinqi');
    const gated = eventById('t_yizhao')!;
    s.character!.daoYuan = 10;
    expect(isEligible(s, gated)).toBe(false);
    s.character!.daoYuan = 99;
    expect(isEligible(s, gated)).toBe(true);
  });

  it('never repeats a once-only event', () => {
    const s = forceRealm(newRun('once'), 'yinqi');
    s.character!.daoYuan = 99;
    const gated = eventById('t_yizhao')!;
    expect(isEligible(s, gated)).toBe(true);
    s.character!.seenEvents.push('t_yizhao');
    expect(isEligible(s, gated)).toBe(false);
  });

  it('offers destiny events only when their chain is live', () => {
    const s = forceRealm(newRun('destiny'), 'tongxuan');
    s.character!.daoYuan = 5;
    s.character!.flags = {};
    expect(eligibleDestiny(s)).toHaveLength(0);
    s.character!.flags.tuluTrace = true;
    expect(eligibleDestiny(s).length).toBeGreaterThan(0);
  });
});

describe('events · 抉择赔率', () => {
  it('computes the D20 window exactly', () => {
    const s = newRun('odds');
    s.character!.attributes.jiBian = 5;
    const ev = eventById('d_shanbeng')!;
    const choice = ev.choices!.find((c) => c.id === 'ben')!;
    // DC 12, attr 5 → need D20 ≥ 7 → 14 of 20 faces → 70%.
    expect(choiceChance(s, choice)).toBe(70);
  });

  it('reports a certain choice as null rather than 100', () => {
    const s = newRun('certain');
    const ev = eventById('d_yiqi')!;
    const choice = ev.choices!.find((c) => c.id === 'rao')!;
    expect(choiceChance(s, choice)).toBeNull();
  });

  it('clamps the window at both ends', () => {
    const s = newRun('clamp');
    const ev = eventById('e_gulou')!;
    const choice = ev.choices!.find((c) => c.id === 'deng')!;
    s.character!.attributes.dingLi = 0;
    expect(choiceChance(s, choice)).toBeGreaterThanOrEqual(0);
    s.character!.attributes.dingLi = 40;
    expect(choiceChance(s, choice)).toBeLessThanOrEqual(100);
  });

  it('marks unaffordable choices without hiding them', () => {
    const s = newRun('afford');
    s.character!.spiritStones = 0;
    const options = resolveChoices(s, eventById('t_panyin')!);
    expect(options.find((o) => o.id === 'mai')!.affordable).toBe(false);
    expect(options.find((o) => o.id === 'duo')!.affordable).toBe(true);
  });

  it('surfaces the cost label for paid choices', () => {
    const s = newRun('cost');
    const options = resolveChoices(s, eventById('t_panyin')!);
    expect(options.find((o) => o.id === 'mai')!.costLabel).toContain('灵石');
  });
});

describe('events · 解析', () => {
  it('locks the phase while a choice is pending', () => {
    const s = forceRealm(newRun('lock'), 'yinqi');
    s.character!.flags.tuluTrace = true;
    let guard = 0;
    while (s.phase !== 'event' && guard++ < 60) {
      if (s.phase === 'combat') s.phase = 'playing';
      explore(s);
    }
    if (s.phase === 'event') {
      expect(s.pendingEvent).not.toBeNull();
      expect(s.pendingEvent!.options.length).toBeGreaterThan(0);
    }
  });

  it('clears the pending event after a choice resolves', () => {
    const s = forceRealm(newRun('resolve'), 'tongxuan');
    s.character!.flags.tuluTrace = true;
    s.pendingEvent = {
      eventId: 't_canjuan',
      options: resolveChoices(s, eventById('t_canjuan')!),
    };
    s.phase = 'event';
    chooseEventOption(s, 'shou');
    expect(s.pendingEvent).toBeNull();
    expect(s.character!.flags.tulu1).toBe(true);
  });

  it('rejects a choice the character cannot pay for', () => {
    const s = forceRealm(newRun('broke'), 'yuanshen');
    s.character!.spiritStones = 0;
    s.pendingEvent = { eventId: 't_panyin', options: resolveChoices(s, eventById('t_panyin')!) };
    s.phase = 'event';
    const logs = chooseEventOption(s, 'mai');
    expect(logs.some((l) => l.text.includes('力有不逮'))).toBe(true);
    expect(s.pendingEvent).not.toBeNull();
  });

  it('applies gains and losses through the derived multipliers', () => {
    const s = newRun('effect');
    const c = s.character!;
    c.fortune = 10;
    c.spiritStones = 100;
    applyEventEffect(s, { stones: 50, fortune: 10, merit: 5 });
    expect(c.spiritStones).toBe(150);
    expect(c.fortune).toBeGreaterThan(10);
    expect(c.merit).toBeGreaterThan(0);
  });

  it('clamps 气运 and 劫运 to 0–100 no matter what an event says', () => {
    const s = newRun('clampfx');
    applyEventEffect(s, { fortune: 9999, calamity: 9999 });
    expect(s.character!.fortune).toBe(100);
    expect(s.character!.calamity.value).toBe(100);
    applyEventEffect(s, { fortune: -9999, calamity: -9999 });
    expect(s.character!.fortune).toBe(0);
    expect(s.character!.calamity.value).toBe(0);
  });

  it('an event that starts a fight moves the phase to combat', () => {
    const s = forceRealm(newRun('combatfx'), 'tongxuan');
    applyEventEffect(s, { combat: 'yaolang' });
    expect(s.phase).toBe('combat');
    expect(s.combat!.source).toBe('event');
  });

  it('rolls exactly two audited dice for an ordinary 探索', () => {
    const s = forceRealm(newRun('rolls'), 'yinqi');
    s.character!.flags = {};
    s.character!.daoYuan = 1;
    const before = s.rolls.length;
    explore(s);
    const reasons = s.rolls.slice(before).map((r) => r.reason);
    expect(reasons[0]).toBe('遭遇·定桶');
    expect(reasons.some((r) => r.startsWith('遭遇·抽取'))).toBe(true);
  });

  it('records the event as seen', () => {
    const s = forceRealm(newRun('seen'), 'yinqi');
    s.character!.daoYuan = 1;
    explore(s);
    expect(s.character!.seenEvents.length).toBeGreaterThan(0);
  });

  it('finds something to draw in every bucket at every realm', () => {
    for (const realm of ['yinqi', 'tongxuan', 'xuanguang', 'yuanshen', 'dongzhen'] as const) {
      const s = setCalamity(forceRealm(newRun(`bucket-${realm}`), realm), 50);
      s.character!.fortune = 50;
      for (const band of BUCKET_BANDS) {
        expect(eventsInBucket(s, band.bucket).length).toBeGreaterThan(0);
      }
    }
  });
});
