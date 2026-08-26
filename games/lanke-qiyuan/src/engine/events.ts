/**
 * events.ts — the 游历 table: two audited rolls, then a choice.
 *
 * Roll one picks the 桶 (bucket) from D100 shifted by 气韵 and the hidden
 * 缘法, minus a penalty for 心尘 — a dusty traveller genuinely does meet
 * fewer wonders. Roll two picks an entry inside the bucket by weight, after
 * filtering on realm, place, flags, `once` and the hidden 缘法 gate.
 *
 * An event with `choices` parks in `state.pendingEvent` and locks the turn
 * parser until it is answered; an event with `autoEffect` resolves on the
 * spot.
 */

import { EVENTS, getEvent } from '@/data/events';
import { checkBonus } from './attributes';
import { getOrigin } from '@/data/origins';
import { applyEffect } from './effects';
import { note, say } from './prose';
import { roll, rollWeighted } from './rng';
import type { EventBucket, GameEvent, GameState, PendingEvent } from './types';

export const BUCKETS: readonly EventBucket[] = ['波折', '寻常', '际遇', '奇遇'];

/** Upper D100 bound of each bucket after the fortune shift. */
export const BUCKET_THRESHOLDS: readonly { bucket: EventBucket; upTo: number }[] = [
  { bucket: '波折', upTo: 22 },
  { bucket: '寻常', upTo: 62 },
  { bucket: '际遇', upTo: 88 },
  { bucket: '奇遇', upTo: Number.POSITIVE_INFINITY },
];

export function bucketOf(shiftedRoll: number): EventBucket {
  for (const row of BUCKET_THRESHOLDS) {
    if (shiftedRoll <= row.upTo) return row.bucket;
  }
  return '奇遇';
}

/** The published half of the fortune shift, plus the hidden 缘法 term. */
export function fortuneShift(state: GameState): number {
  const c = state.character;
  if (!c) return 0;
  const open = Math.round(c.attributes.qiYun * 0.8) - Math.round(c.dust * 0.15);
  const hidden = Math.round(c.attributes.yuanFa * 1.5);
  return open + hidden;
}

/** Every event that could legally fire right now in the given bucket. */
export function eligibleEvents(state: GameState, bucket: EventBucket): GameEvent[] {
  const c = state.character;
  if (!c) return [];
  return EVENTS.filter((e) => {
    if (e.bucket !== bucket) return false;
    if (!e.realms.includes(c.realm.realm)) return false;
    if (e.places.length > 0 && !e.places.includes(state.placeId)) return false;
    if (e.once && state.seenEvents.includes(e.id)) return false;
    if (e.minYuanFa !== undefined && c.attributes.yuanFa < e.minYuanFa) return false;
    if (e.minChessDao !== undefined && c.chessDao < e.minChessDao) return false;
    if (e.requiresFlag !== undefined && !c.flags[e.requiresFlag]) return false;
    return true;
  });
}

export interface DrawnEvent {
  event: GameEvent | null;
  bucket: EventBucket;
  shifted: number;
}

/**
 * Rolls the bucket and draws an entry. Falls back through neighbouring
 * buckets when the chosen one is empty at this realm/place, so a quiet corner
 * of the map never produces a silent season.
 */
export function drawEvent(state: GameState): DrawnEvent {
  const d100 = roll(state, 'D100', '游历·定桶');
  const shifted = d100 + fortuneShift(state);
  const bucket = bucketOf(shifted);

  const order: EventBucket[] = [bucket, ...BUCKETS.filter((b) => b !== bucket)];
  for (const b of order) {
    const pool = eligibleEvents(state, b);
    if (pool.length === 0) continue;
    const picked = rollWeighted(
      state,
      pool.map((e) => ({ item: e, weight: e.weight })),
      `游历·${b}抽取`,
    );
    return { event: picked, bucket: b, shifted };
  }
  return { event: null, bucket, shifted };
}

export interface FireResult {
  /** true when the event parked and now awaits a choice */
  pending: boolean;
  eventId: string | null;
  ending: string | null;
  match: string | null;
}

const NOTHING: FireResult = { pending: false, eventId: null, ending: null, match: null };

/** Presents a drawn event: parks it for a choice, or resolves it immediately. */
export function fireEvent(state: GameState, event: GameEvent): FireResult {
  if (event.once && !state.seenEvents.includes(event.id)) state.seenEvents.push(event.id);
  say(state, `〔${event.name}〕`, 'moon');
  say(state, event.narrative, 'normal');

  if (event.choices && event.choices.length > 0) {
    const pending: PendingEvent = {
      eventId: event.id,
      name: event.name,
      narrative: event.narrative,
      choices: event.choices.map((ch) => ({
        text: ch.text,
        ...(ch.hint ? { hint: ch.hint } : {}),
      })),
    };
    state.pendingEvent = pending;
    note(state, '——如何?', 'jade');
    return { pending: true, eventId: event.id, ending: null, match: null };
  }

  if (event.autoEffect) {
    const summary = applyEffect(state, event.autoEffect);
    return { pending: false, eventId: event.id, ending: summary.ending, match: summary.match };
  }
  return { ...NOTHING, eventId: event.id };
}

/** Rolls a bucket, draws, and presents in one step. */
export function rollTravelEvent(state: GameState): FireResult {
  const drawn = drawEvent(state);
  if (!drawn.event) {
    say(state, '一路无事。风把路边的草吹倒,又扶起来。', 'muted');
    return NOTHING;
  }
  return fireEvent(state, drawn.event);
}

// ============================================================================
// Choice resolution
// ============================================================================

export interface ChoiceResult {
  ok: boolean;
  message: string;
  passed?: boolean;
  d20?: number;
  total?: number;
  dc?: number;
  ending?: string | null;
  match?: string | null;
}

export function resolveChoice(state: GameState, choiceIndex: number): ChoiceResult {
  const c = state.character;
  const pending = state.pendingEvent;
  if (!c || !pending) return { ok: false, message: '眼下并无待决之事。' };
  const event = getEvent(pending.eventId);
  if (!event?.choices) {
    state.pendingEvent = null;
    return { ok: false, message: '此事已散。' };
  }
  const choice = event.choices[choiceIndex];
  if (!choice) return { ok: false, message: `无此选项:${choiceIndex + 1}` };

  state.pendingEvent = null;
  say(state, `汝${choice.text}。`, 'bamboo');

  if (!choice.check) {
    const summary = applyEffect(state, choice.success);
    return { ok: true, message: '已决。', passed: true, ending: summary.ending, match: summary.match };
  }

  const origin = getOrigin(c.originId);
  const bonus = checkBonus(c, choice.check.attr, origin);
  const d20 = roll(state, 'D20', `${event.name}·${ATTR_NAME[choice.check.attr]}检定`);
  const total = d20 + bonus;
  const dc = choice.check.dc;
  // A natural 1 always fails and a natural 20 always passes.
  const passed = d20 === 20 || (d20 !== 1 && total >= dc);

  note(
    state,
    `${ATTR_NAME[choice.check.attr]}检定:D20 ${d20} + ${bonus} = ${total} vs 难度 ${dc} → ${passed ? '成' : '败'}`,
    passed ? 'jade' : 'dusk',
  );

  const effect = passed ? choice.success : (choice.failure ?? choice.success);
  const summary = applyEffect(state, effect);
  return { ok: true, message: passed ? '成。' : '败。', passed, d20, total, dc, ending: summary.ending, match: summary.match };
}

const ATTR_NAME: Record<string, string> = {
  xinJing: '心境',
  wuXing: '悟性',
  caiXue: '才学',
  qiYun: '气韵',
  yuanFa: '缘法',
};
