/**
 * lifecycle.ts — the passing of seasons, and how a life closes.
 *
 * There is no combat death here. A life ends in exactly three ways: 寿元
 * runs out, the mind gives way (心尘 100 held too long, or 心神 exhausted
 * for too many seasons), or you reach the top of the ladder. Which *scroll*
 * gets written is decided by `resolveEnding`, which reads the whole life
 * rather than the last moment.
 */

import type { EndingResult, GameState } from './types';
import { TURNS_PER_YEAR } from './types';
import { addDust, addSpirit, formatRealm, note, say } from './prose';
import { getEnding } from '@/data/endings';
import { getOrigin } from '@/data/origins';
import { PLACES } from '@/data/places';
import { realmTier } from '@/data/realms';

const EXHAUSTION_FLAG = '神思枯竭';
const DUST_FLAG = '尘满衣';

/** One season passes: moods tick, the body ages, the mind drifts. */
export function advanceSeason(state: GameState): void {
  const c = state.character;
  if (!c || state.phase === 'ended') return;

  state.turn += 1;

  const kept: typeof c.moods = [];
  for (const mood of c.moods) {
    if (mood.spiritPerTurn) addSpirit(c, mood.spiritPerTurn);
    if (mood.dustPerTurn) addDust(c, mood.dustPerTurn);
    if (mood.turnsLeft > 0) mood.turnsLeft -= 1;
    if (mood.turnsLeft === 0) {
      note(state, `【${mood.name}】已然消散。`);
      continue;
    }
    kept.push(mood);
  }
  c.moods = kept;

  // A sliver of natural recovery, and a sliver of natural forgetting.
  if (c.spirit < c.maxSpirit) addSpirit(c, Math.max(1, Math.round(c.maxSpirit * 0.04)));
  addDust(c, -1);

  // Timed flags (避秽在身 and the like) count down with the seasons.
  for (const [key, value] of Object.entries(c.flags)) {
    if (typeof value === 'number' && value > 0 && key.endsWith('在身')) {
      c.flags[key] = value - 1;
    }
  }

  if ((state.turn - 1) % TURNS_PER_YEAR === 0) {
    c.age += 1;
  }

  trackAttrition(state);
}

/** Slow-burn failure states — each needs several bad seasons in a row. */
function trackAttrition(state: GameState): void {
  const c = state.character!;

  const exhausted = typeof c.flags[EXHAUSTION_FLAG] === 'number' ? (c.flags[EXHAUSTION_FLAG] as number) : 0;
  if (c.spirit <= 0) {
    c.flags[EXHAUSTION_FLAG] = exhausted + 1;
    if (exhausted + 1 === 2) say(state, '汝已经很久没能好好睡一觉了。手抖得拿不住子。', 'dusk');
  } else if (exhausted > 0) {
    c.flags[EXHAUSTION_FLAG] = 0;
  }

  const dusty = typeof c.flags[DUST_FLAG] === 'number' ? (c.flags[DUST_FLAG] as number) : 0;
  if (c.dust >= 100) {
    c.flags[DUST_FLAG] = dusty + 1;
    if (dusty + 1 === 2) say(state, '汝看着棋枰,只看得见纵横的线,看不见棋了。', 'dusk');
  } else if (dusty > 0) {
    c.flags[DUST_FLAG] = 0;
  }
}

/** Returns an ending id when the life must close this season, else null. */
export function checkLifeEnd(state: GameState): string | null {
  const c = state.character;
  if (!c || state.phase === 'ended') return null;

  if (realmTier(c.realm.realm) >= 6 && c.realm.stage === '圆融' && c.realm.exp >= c.realm.expNeeded) {
    return 'end_tianren';
  }
  if ((c.flags[DUST_FLAG] as number) >= 4) return 'end_chenman';
  if ((c.flags[EXHAUSTION_FLAG] as number) >= 4) return 'end_shenhun';
  if (c.age > c.lifespan) return resolveNaturalEnding(state);
  return null;
}

/**
 * Which scroll a natural death earns. Checked most-specific first so a life
 * that qualifies for several gets the one that describes it best.
 */
export function resolveNaturalEnding(state: GameState): string {
  const c = state.character!;
  const tier = realmTier(c.realm.realm);
  const friends = Object.values(state.spirits).filter((s) => s.favor >= 50).length;

  if (c.manuals.includes('manual_tianpu_wuzi') && c.chessDao >= 90) return 'end_wuzi';
  if (state.seenEvents.includes('ev_lanke_ju') && c.chessDao >= 70) return 'end_lanke';
  if (tier >= 5 && state.spirits.yunweng && state.spirits.yunweng.favor >= 60) return 'end_shouping';
  if (tier >= 4 && c.dust <= 20) return 'end_zuowang';
  if (friends >= 5) return 'end_qiyou';
  if (c.visited.length >= PLACES.length - 2) return 'end_shanshui';
  if (c.manuals.length >= 6 && c.attributes.caiXue >= 12) return 'end_wenzhang';
  if (tier >= 2 && c.dust <= 60) return 'end_shouzhong';
  return 'end_wuming';
}

/** Write the closing scroll and freeze the state. */
export function endLife(state: GameState, endingId: string): void {
  const c = state.character;
  const def = getEnding(endingId) ?? getEnding('end_wuming')!;

  const summary: string[] = [];
  if (c) {
    const origin = getOrigin(c.originId);
    const friends = Object.values(state.spirits).filter((s) => s.favor >= 50);
    summary.push(`${c.name}(道号${c.courtesy})· ${origin?.name ?? ''} · 享年 ${c.age}`);
    summary.push(`终境 ${formatRealm(c.realm)} · 棋道 ${c.chessDao} · 心尘 ${c.dust}`);
    summary.push(`棋缘 ${c.chessAffinity.grade}【${c.chessAffinity.affinities.join('·')}】`);
    summary.push(`对弈 ${state.stats.matchesPlayed} 局,胜 ${state.stats.matchesWon} 局;观棋 ${state.stats.gamesWatched} 次`);
    summary.push(`足迹 ${c.visited.length}/${PLACES.length} 处 · 悟谱 ${c.manuals.length} 部`);
    summary.push(
      friends.length > 0
        ? `相知:${friends.map((s) => s.name).join('、')}`
        : '相知:无。这一路,汝走得很静。',
    );
    summary.push(`天道共掷 ${state.stats.totalRolls} 次 · 校验链 ${state.auditHash.slice(0, 12)}…`);
  }

  const result: EndingResult = {
    id: def.id,
    title: def.title,
    rank: def.rank,
    closing: def.closing,
    epitaph: def.epitaph,
    summary,
  };

  state.ending = result;
  state.phase = 'ended';
  state.pendingEvent = null;
  state.match = null;

  say(state, `——【${def.title}】——`, 'moon');
  say(state, def.epitaph, 'moon');
  say(state, def.closing, 'moon');
}
