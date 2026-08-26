import { describe, expect, it } from 'vitest';
import {
  BUCKETS,
  BUCKET_THRESHOLDS,
  bucketOf,
  drawEvent,
  eligibleEvents,
  fireEvent,
  fortuneShift,
  resolveChoice,
  rollTravelEvent,
} from '../events';
import { EVENTS, getEvent } from '@/data/events';
import { playableState, withCharacter } from './helpers';
import type { GameEvent, GameState } from '../types';

/** The first event in the table that parks for a choice at 凡尘. */
function firstChoiceEvent(): GameEvent {
  const found = EVENTS.find(
    (e) => e.realms.includes('chen') && (e.choices?.length ?? 0) > 0,
  );
  expect(found).toBeDefined();
  return found as GameEvent;
}

describe('游历 — the bucket roll', () => {
  it('names four buckets and covers the whole D100 range without a gap', () => {
    expect(BUCKETS).toHaveLength(4);
    expect(BUCKET_THRESHOLDS).toHaveLength(4);
    expect(BUCKET_THRESHOLDS[3]!.upTo).toBe(Number.POSITIVE_INFINITY);
    for (let n = 1; n <= 200; n += 1) expect(BUCKETS).toContain(bucketOf(n));
  });

  it('sorts each threshold band into the bucket it names', () => {
    expect(bucketOf(1)).toBe('波折');
    expect(bucketOf(22)).toBe('波折');
    expect(bucketOf(23)).toBe('寻常');
    expect(bucketOf(62)).toBe('寻常');
    expect(bucketOf(63)).toBe('际遇');
    expect(bucketOf(88)).toBe('际遇');
    expect(bucketOf(89)).toBe('奇遇');
  });

  it('lifts the roll with 气韵 and the hidden 缘法, and drags it down with 心尘', () => {
    const base = playableState();
    const lucky = withCharacter(base, {
      attributes: { ...base.character!.attributes, qiYun: 14, yuanFa: 9 },
      dust: 0,
    });
    const grimy = withCharacter(lucky, { dust: 90 });
    expect(fortuneShift(lucky)).toBeGreaterThan(fortuneShift(base));
    expect(fortuneShift(grimy)).toBeLessThan(fortuneShift(lucky));
  });
});

describe('游历 — eligibility gates', () => {
  it('never offers an event outside the current 境界', () => {
    const s = playableState();
    for (const bucket of BUCKETS) {
      for (const e of eligibleEvents(s, bucket)) expect(e.realms).toContain('chen');
    }
  });

  it('never offers a place-locked event somewhere else', () => {
    const s = playableState();
    for (const bucket of BUCKETS) {
      for (const e of eligibleEvents(s, bucket)) {
        if (e.places.length > 0) expect(e.places).toContain(s.placeId);
      }
    }
  });

  it('withholds flag-gated chains until the flag is set', () => {
    const gated = EVENTS.find((e) => e.requiresFlag !== undefined);
    expect(gated).toBeDefined();
    const key = gated!.requiresFlag as string;
    const s = playableState();
    expect(eligibleEvents(s, gated!.bucket).some((e) => e.id === gated!.id)).toBe(false);
    const opened = withCharacter(s, { flags: { ...s.character!.flags, [key]: true } });
    opened.character!.realm.realm = gated!.realms[0]!;
    expect(eligibleEvents(opened, gated!.bucket).some((e) => e.id === gated!.id)).toBe(true);
  });

  it('drops a `once` event after it has been seen', () => {
    const once = EVENTS.find(
      (e) => e.once === true && e.requiresFlag === undefined && e.minYuanFa === undefined &&
        e.minChessDao === undefined,
    );
    expect(once).toBeDefined();
    const s = playableState();
    s.character!.realm.realm = once!.realms[0]!;
    if (once!.places.length > 0) s.placeId = once!.places[0]!;
    expect(eligibleEvents(s, once!.bucket).some((e) => e.id === once!.id)).toBe(true);
    s.seenEvents.push(once!.id);
    expect(eligibleEvents(s, once!.bucket).some((e) => e.id === once!.id)).toBe(false);
  });

  it('withholds 棋道-gated events from a beginner', () => {
    const gated = EVENTS.find((e) => (e.minChessDao ?? 0) > 30);
    expect(gated).toBeDefined();
    const s = withCharacter(playableState(), { chessDao: 0 });
    expect(eligibleEvents(s, gated!.bucket).some((e) => e.id === gated!.id)).toBe(false);
  });
});

describe('游历 — drawing and firing', () => {
  it('always produces an event by falling through to a non-empty bucket', () => {
    for (const seed of ['甲', '乙', '丙', '丁', '戊', '己']) {
      const drawn = drawEvent(playableState(seed));
      expect(drawn.event).not.toBeNull();
      expect(BUCKETS).toContain(drawn.bucket);
    }
  });

  it('records the bucket roll in the audit trail', () => {
    const s = playableState();
    const before = s.rolls.length;
    drawEvent(s);
    expect(s.rolls.length).toBeGreaterThan(before);
    expect(s.rolls.some((r) => r.reason.includes('游历'))).toBe(true);
  });

  it('parks a choice event and locks the turn until it is answered', () => {
    const s = playableState();
    const out = fireEvent(s, firstChoiceEvent());
    expect(out.pending).toBe(true);
    expect(s.pendingEvent?.eventId).toBe(out.eventId);
    expect(s.pendingEvent?.choices.length).toBeGreaterThan(0);
  });

  it('does not leak the check DC into the parked choice payload', () => {
    const s = playableState();
    fireEvent(s, firstChoiceEvent());
    for (const ch of s.pendingEvent!.choices) {
      expect(Object.keys(ch).sort()).toEqual(expect.arrayContaining(['text']));
      expect('success' in ch).toBe(false);
      expect('check' in ch).toBe(false);
    }
  });

  it('resolves an auto-effect event on the spot with no pending state', () => {
    const auto = EVENTS.find((e) => e.autoEffect !== undefined && e.realms.includes('chen'));
    expect(auto).toBeDefined();
    const s = playableState();
    const out = fireEvent(s, auto!);
    expect(out.pending).toBe(false);
    expect(s.pendingEvent).toBeNull();
  });

  it('writes the event name and narrative into the scroll', () => {
    const s = playableState();
    const before = s.narrativeLog.length;
    rollTravelEvent(s);
    expect(s.narrativeLog.length).toBeGreaterThan(before);
  });
});

describe('游历 — choice resolution', () => {
  function parked(seed = '抉择-1'): GameState {
    const s = playableState(seed);
    fireEvent(s, firstChoiceEvent());
    return s;
  }

  it('refuses a choice index the event does not have', () => {
    const s = parked();
    const out = resolveChoice(s, 99);
    expect(out.ok).toBe(false);
    expect(s.pendingEvent).not.toBeNull();
  });

  it('refuses when nothing is pending at all', () => {
    const s = playableState();
    expect(resolveChoice(s, 0).ok).toBe(false);
  });

  it('clears the pending event once answered', () => {
    const s = parked();
    const out = resolveChoice(s, 0);
    expect(out.ok).toBe(true);
    expect(s.pendingEvent).toBeNull();
  });

  it('rolls a D20 against the DC when the choice carries a check', () => {
    const withCheck = EVENTS.find(
      (e) => e.realms.includes('chen') && e.choices?.some((ch) => ch.check !== undefined),
    );
    expect(withCheck).toBeDefined();
    const idx = withCheck!.choices!.findIndex((ch) => ch.check !== undefined);
    const s = playableState('检定-1');
    fireEvent(s, withCheck!);
    const out = resolveChoice(s, idx);
    expect(out.d20).toBeGreaterThanOrEqual(1);
    expect(out.d20).toBeLessThanOrEqual(20);
    expect(out.dc).toBe(withCheck!.choices![idx]!.check!.dc);
    expect(typeof out.passed).toBe('boolean');
  });

  it('a checkless choice always passes', () => {
    const plain = EVENTS.find(
      (e) => e.realms.includes('chen') && e.choices?.some((ch) => ch.check === undefined),
    );
    expect(plain).toBeDefined();
    const idx = plain!.choices!.findIndex((ch) => ch.check === undefined);
    const s = playableState('无检定');
    fireEvent(s, plain!);
    expect(resolveChoice(s, idx).passed).toBe(true);
  });

  it('resolves every choice of every 凡尘 event without throwing', () => {
    for (const e of EVENTS.filter((x) => x.realms.includes('chen') && x.choices)) {
      for (let i = 0; i < e.choices!.length; i += 1) {
        const s = playableState(`遍历-${e.id}-${i}`);
        fireEvent(s, e);
        const out = resolveChoice(s, i);
        expect(out.ok).toBe(true);
        expect(getEvent(e.id)).toBeDefined();
      }
    }
  });
});
