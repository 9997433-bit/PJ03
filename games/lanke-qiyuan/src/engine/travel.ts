/**
 * travel.ts — 游历: the road, and what happens on it.
 *
 * Travelling somewhere new costs 银钱 and is gated on 境界, because a few of
 * the twelve places simply do not exist for anyone who cannot yet see them.
 * Staying put and wandering the same town costs nothing and still rolls the
 * event table — the road is where the story is, but so is the doorstep.
 */

import { getPlace, PLACES } from '@/data/places';
import { realmAtLeast } from './audit';
import { rollTravelEvent, type FireResult } from './events';
import { addCoin, addDust, addSpirit, note, say } from './prose';
import type { GameState, PlaceDef } from './types';

export const WANDER_SPIRIT_COST = 8;

/** 行脚 — the 采药山民 perk halves fares and buys an extra roll of the table. */
export function isRoadWise(state: GameState): boolean {
  return state.character?.flags['识药'] === true;
}

export function fareFor(state: GameState, place: PlaceDef): number {
  return isRoadWise(state) ? Math.ceil(place.fare / 2) : place.fare;
}

/** Places currently reachable, with the fare each would cost. */
export function reachablePlaces(state: GameState): { place: PlaceDef; fare: number; here: boolean }[] {
  const c = state.character;
  if (!c) return [];
  return PLACES.filter((p) => realmAtLeast(c.realm.realm, p.minRealm)).map((p) => ({
    place: p,
    fare: fareFor(state, p),
    here: p.id === state.placeId,
  }));
}

export interface TravelResult {
  ok: boolean;
  message: string;
  moved: boolean;
  event: FireResult | null;
}

const NO_EVENT: FireResult = { pending: false, eventId: null, ending: null, match: null };

export function travel(state: GameState, placeId?: string): TravelResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。', moved: false, event: null };

  let moved = false;
  if (placeId && placeId !== state.placeId) {
    const place = getPlace(placeId);
    if (!place) return { ok: false, message: `舆图上没有「${placeId}」。`, moved: false, event: null };
    if (!realmAtLeast(c.realm.realm, place.minRealm)) {
      return { ok: false, message: `${place.name} — 此境未到,汝找不到那条路。`, moved: false, event: null };
    }
    const fare = fareFor(state, place);
    if (c.coin < fare) {
      return { ok: false, message: `盘缠不足:去${place.name}需 ${fare},今有 ${c.coin}。`, moved: false, event: null };
    }
    addCoin(c, -fare);
    state.placeId = placeId;
    moved = true;
    if (!c.visited.includes(placeId)) {
      c.visited.push(placeId);
      state.stats.placesSeen = c.visited.length;
      say(state, `汝第一次站在${place.name}。`, 'jade');
    } else {
      say(state, `汝又回到${place.name}。`, 'bamboo');
    }
    say(state, place.desc, 'normal');
    if (fare > 0) note(state, `盘缠 −${fare}`);
  } else {
    const place = getPlace(state.placeId);
    say(state, `汝在${place?.name ?? '此处'}信步而行,并无定处。`, 'bamboo');
  }

  addSpirit(c, -WANDER_SPIRIT_COST);
  addDust(c, 2, c.flags['静者'] === true);

  let event = rollTravelEvent(state);
  // 行脚: a second roll, but only when the first left nothing pending.
  if (isRoadWise(state) && !event.pending && !event.ending) {
    const extra = rollTravelEvent(state);
    if (extra.eventId) event = extra;
  }

  return {
    ok: true,
    message: moved ? `已至${getPlace(state.placeId)?.name ?? ''}。` : '游历毕。',
    moved,
    event: event ?? NO_EVENT,
  };
}
