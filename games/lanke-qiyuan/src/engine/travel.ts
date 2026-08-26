/**
 * travel.ts — 游历 and the event table.
 *
 * Travelling is how the world reaches you. A season on the road pays a fare,
 * moves you to a new place, and rolls the event table once (twice with the
 * 行脚 perk). Staying put also rolls — the road is where the story is, but so
 * is the doorstep.
 *
 * Bucket selection is a D100 shifted by 气韵, the hidden 缘法, and 心尘 — a
 * clouded mind genuinely does attract worse days. Within a bucket, entries
 * are drawn by weight after filtering on realm, place, flags and 棋道.
 */

import type { EventBucket, GameEvent, GameState, PendingEvent } from './types';
import { roll, rollWeighted } from './rng';
import { addDust, addSpirit, note, say } from './prose';
import { applyEffect, checkFavorThresholds } from './effects';
import { startMatch } from './chess';
import { checkBonus } from './attributes';
import { EVENTS, getEvent } from '@/data/events';
import { PLACES, getPlace } from '@/data/places';
import { getOrigin } from '@/data/origins';
import { realmTier } from '@/data/realms';

const TRAVEL_SPIRIT_COST = 10;

export function travelFare(base: number, roadWise: boolean): number {
  return roadWise ? Math.ceil(base / 2) : base;
}

/** Places you can currently afford and are permitted to reach. */
export function reachablePlaces(
  state: GameState,
): { id: string; name: string; fare: number; affordable: boolean }[] {
  const c = state.character;
  if (!c) return [];
  const tier = realmTier(c.realm.realm);
  const origin = getOrigin(c.originId);
  return PLACES.filter((p) => realmTier(p.minRealm) <= tier && p.id !== state.placeId).map((p) => {
    const fare = travelFare(p.fare, origin?.perk === 'roadWise');
    return { id: p.id, name: p.name, fare, affordable: c.coin >= fare };
  });
}

/** 游历 — one season on the road. */
export function travel(state: GameState, placeId?: string): void {
  const c = state.character;
  if (!c) return;

  const origin = getOrigin(c.originId);
  const roadWise = origin?.perk === 'roadWise';

  if (placeId && placeId !== state.placeId) {
    const place = getPlace(placeId);
    if (!place) {
      note(state, '舆图上无此处。', 'dusk');
      return;
    }
    if (realmTier(place.minRealm) > realmTier(c.realm.realm)) {
      say(state, '汝往那个方向走了三日,路却总把汝送回原处。有些地方,得先看得见才到得了。', 'dusk');
      return;
    }
    const fare = travelFare(place.fare, roadWise);
    if (c.coin < fare) {
      note(state, `盘缠不足(需${fare}钱,有${c.coin}钱)。`, 'dusk');
      return;
    }
    c.coin -= fare;
    state.placeId = place.id;
    if (!c.visited.includes(place.id)) {
      c.visited.push(place.id);
      state.stats.placesSeen = c.visited.length;
      say(state, `汝第一次踏上${place.name}的地界。`, 'bamboo');
    }
    say(state, place.desc);
    if (fare > 0) note(state, `盘缠 -${fare}(余${c.coin})。`);
  } else {
    const here = getPlace(state.placeId);
    say(state, `汝在${here?.name ?? '此处'}又住了一季,四处走走。`);
  }

  addSpirit(c, -TRAVEL_SPIRIT_COST);
  addDust(c, 3, origin?.perk === 'quietMind');

  rollEvent(state);
  // 行脚 sees more of the road: a second draw, but only if the first was quiet.
  if (roadWise && !state.pendingEvent) rollEvent(state);
}

// ============================================================================
// The event table
// ============================================================================

/** Rolls a bucket, shifted by 气韵, the hidden 缘法, and 心尘. */
export function rollBucket(state: GameState): EventBucket {
  const c = state.character!;
  const d100 = roll(state, 'D100', '游历·气数');
  const shift = c.attributes.qiYun * 1.4 + c.attributes.yuanFa * 2.2 - c.dust * 0.45;
  const score = d100 + shift;
  if (score <= 26) return '波折';
  if (score <= 72) return '寻常';
  if (score <= 96) return '际遇';
  return '奇遇';
}

/** Every event that could legally fire right now, in the given bucket. */
export function eligibleEvents(state: GameState, bucket: EventBucket): GameEvent[] {
  const c = state.character!;
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

/**
 * Draw one event. Falls back down the bucket ladder when the rolled bucket
 * has nothing to offer, so a season is never silently eventless by accident.
 */
export function rollEvent(state: GameState): void {
  const c = state.character;
  if (!c || state.pendingEvent) return;

  const wanted = rollBucket(state);
  const ladder: EventBucket[] = ['奇遇', '际遇', '寻常', '波折'];
  const order = [wanted, ...ladder.filter((b) => b !== wanted)];

  let pool: GameEvent[] = [];
  for (const bucket of order) {
    pool = eligibleEvents(state, bucket);
    if (pool.length > 0) break;
  }
  if (pool.length === 0) {
    say(state, '这一季无事发生。有时候无事,便是最好的事。');
    return;
  }

  const event = rollWeighted(
    state,
    pool.map((e) => ({ item: e, weight: e.weight })),
    '游历·遇事',
  );
  presentEvent(state, event);
}

function presentEvent(state: GameState, event: GameEvent): void {
  if (event.once && !state.seenEvents.includes(event.id)) state.seenEvents.push(event.id);

  say(state, `——${event.name}——`, 'bamboo');
  say(state, event.narrative);

  if (!event.choices || event.choices.length === 0) {
    const effect = event.autoEffect;
    if (effect) {
      say(state, effect.narrative);
      const report = applyEffect(state, effect);
      if (report.lines.length > 0) note(state, report.lines.join(' · '));
      checkFavorThresholds(state);
      if (report.match) startMatch(state, report.match);
      if (report.ending) state.pendingEnding = report.ending;
    }
    return;
  }

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
}

/** Resolve the pending event with the player's pick. */
export function resolveEventChoice(state: GameState, choiceIndex: number): void {
  const c = state.character;
  const pending = state.pendingEvent;
  if (!c || !pending) return;

  const event = getEvent(pending.eventId);
  const choice = event?.choices?.[choiceIndex];
  if (!event || !choice) {
    note(state, '无此抉择。', 'dusk');
    return;
  }

  state.pendingEvent = null;
  say(state, `汝${choice.text}。`);

  let effect = choice.success;
  if (choice.check) {
    const origin = getOrigin(c.originId);
    const bonus = checkBonus(c, choice.check.attr, origin);
    const d20 = roll(state, 'D20', `${event.name}·${choice.check.attr}检定`);
    const total = d20 + bonus;
    const passed = total >= choice.check.dc;
    note(
      state,
      `检定:D20=${d20} + ${bonus} = ${total} vs 难度 ${choice.check.dc} — ${passed ? '过' : '未过'}`,
    );
    if (!passed && choice.failure) {
      effect = choice.failure;
    } else if (!passed) {
      say(state, '未能如愿。此事就此揭过。', 'dusk');
      return;
    }
  }

  say(state, effect.narrative, effect === choice.failure ? 'dusk' : 'normal');
  const report = applyEffect(state, effect);
  if (report.lines.length > 0) note(state, report.lines.join(' · '));
  checkFavorThresholds(state);
  if (report.match) startMatch(state, report.match);
  if (report.ending) state.pendingEnding = report.ending;
}
