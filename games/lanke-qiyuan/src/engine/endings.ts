/**
 * endings.ts — every way a life can close, and the single table that fires them.
 *
 * The root simulator's mistake was two sources of truth: sixteen endings in
 * `data/`, five of them wired. Here the prose lives in `data/endings.ts` and
 * the *conditions* live in `ENDING_TRIGGERS` below — one entry per ending, no
 * exceptions. `reachableEndingIds()` is derived from that table, so a data
 * integrity test can prove that no ending is decoration.
 *
 * Triggers come in two kinds:
 *   living — an achievement closes the story while you are still walking;
 *   death  — evaluated in order once 寿元 runs out, first match wins.
 */

import { ENDINGS, getEnding } from '@/data/endings';
import { getRealm } from '@/data/realms';
import { PLACES } from '@/data/places';
import { chessDaoLabel } from './insight';
import { formatRealm, formatSeason, say } from './prose';
import { countBefriended, maxFavor } from './spirits';
import { realmAtLeast } from './audit';
import type { EndingResult, GameState } from './types';
import { MAX_CHESS_DAO, MAX_DUST } from './types';

export interface EndingTrigger {
  id: string;
  kind: 'living' | 'death';
  /** shown in the README's mechanics table */
  condition: string;
  test: (state: GameState) => boolean;
}

const flag = (state: GameState, key: string): number =>
  Number(state.character?.flags[key] ?? 0);

/**
 * Order matters twice over: living triggers are scanned top-down every turn,
 * and death triggers are scanned top-down the season 寿元 runs out.
 */
export const ENDING_TRIGGERS: readonly EndingTrigger[] = [
  // ---------------------------------------------------------------- living
  {
    id: 'end_tianren',
    kind: 'living',
    condition: '破境至天人',
    test: (s) => s.character?.realm.realm === 'tianren',
  },
  {
    id: 'end_wuzi',
    kind: 'living',
    condition: '悟《无字谱》且棋道圆满 100',
    test: (s) =>
      s.character !== null &&
      s.character.manuals.includes('manual_tianpu_wuzi') &&
      s.character.chessDao >= MAX_CHESS_DAO,
  },
  {
    id: 'end_shouping',
    kind: 'living',
    condition: '胜云中叟,接过云海棋台',
    test: (s) => flag(s, '接过棋台') === 1 || s.character?.flags['接过棋台'] === true,
  },
  {
    id: 'end_lanke',
    kind: 'living',
    condition: '于烂柯山见过那一局,棋道 ≥ 85,且已入通玄',
    test: (s) =>
      s.character !== null &&
      s.seenEvents.includes('ev_lanke_ju') &&
      s.character.chessDao >= 85 &&
      realmAtLeast(s.character.realm.realm, 'tongxuan'),
  },
  {
    id: 'end_zuowang',
    kind: 'living',
    condition: '入坐忘境,坐忘 ≥ 24 次,心尘 ≤ 5',
    test: (s) =>
      s.character !== null &&
      realmAtLeast(s.character.realm.realm, 'zuowang') &&
      flag(s, '坐忘次数') >= 24 &&
      s.character.dust <= 5,
  },
  {
    id: 'end_qiyou',
    kind: 'living',
    condition: '与 8 位精怪结交(好感 ≥ 50)',
    test: (s) => countBefriended(s) >= 8,
  },
  {
    id: 'end_shanshui',
    kind: 'living',
    condition: '踏遍舆图十二处',
    test: (s) => (s.character?.visited.length ?? 0) >= PLACES.length,
  },
  {
    id: 'end_wenzhang',
    kind: 'living',
    condition: '悟谱 ≥ 8 部,且才学 ≥ 14',
    test: (s) =>
      s.character !== null &&
      s.character.manuals.length >= 8 &&
      s.character.attributes.caiXue >= 14,
  },
  {
    id: 'end_chenman',
    kind: 'living',
    condition: '心尘满溢 100',
    test: (s) => (s.character?.dust ?? 0) >= MAX_DUST,
  },
  {
    id: 'end_shenhun',
    kind: 'living',
    condition: '心神枯竭连续 5 季',
    test: (s) => flag(s, '枯坐') >= 5,
  },

  // ----------------------------------------------------------------- death
  {
    id: 'end_qisheng',
    kind: 'death',
    condition: '寿终 · 棋道 ≥ 88 且 胜局 ≥ 20',
    test: (s) => s.character !== null && s.character.chessDao >= 88 && s.stats.matchesWon >= 20,
  },
  {
    id: 'end_zhihei',
    kind: 'death',
    condition: '寿终 · 心尘 ≥ 55 且「旧债未清」',
    test: (s) =>
      s.character !== null && s.character.dust >= 55 && s.character.flags['旧债未清'] === true,
  },
  {
    id: 'end_gudeng',
    kind: 'death',
    condition: '寿终 · 有一位精怪好感 ≥ 90',
    test: (s) => maxFavor(s) >= 90,
  },
  {
    id: 'end_guoshou',
    kind: 'death',
    condition: '寿终 · 止步通玄之下,而胜局 ≥ 12',
    test: (s) =>
      s.character !== null &&
      !realmAtLeast(s.character.realm.realm, 'tongxuan') &&
      s.stats.matchesWon >= 12,
  },
  {
    id: 'end_shouzhong',
    kind: 'death',
    condition: '寿终 · 心尘 ≤ 30 且棋道 ≥ 40',
    test: (s) =>
      s.character !== null && s.character.dust <= 30 && s.character.chessDao >= 40,
  },
  {
    id: 'end_wuming',
    kind: 'death',
    condition: '寿终 · 其余一切',
    test: () => true,
  },
];

/** Every ending id the engine can actually produce. */
export function reachableEndingIds(): string[] {
  return [...new Set(ENDING_TRIGGERS.map((t) => t.id))];
}

/** Scans the living triggers; returns the first that fires, or null. */
export function checkLivingEndings(state: GameState): string | null {
  if (!state.character) return null;
  for (const t of ENDING_TRIGGERS) {
    if (t.kind !== 'living') continue;
    if (t.test(state)) return t.id;
  }
  return null;
}

/** Scans the death triggers. Always returns something (`end_wuming` catches all). */
export function chooseDeathEnding(state: GameState): string {
  for (const t of ENDING_TRIGGERS) {
    if (t.kind !== 'death') continue;
    if (t.test(state)) return t.id;
  }
  return 'end_wuming';
}

// ============================================================================
// Closing the scroll
// ============================================================================

function summaryLines(state: GameState): string[] {
  const c = state.character;
  const s = state.stats;
  const lines = [
    `历时 ${formatSeason(state.turn)}`,
    `享年 ${c?.age ?? 0} 岁(寿元 ${c?.lifespan ?? 0})`,
    `巅峰境界 ${s.peakRealmLabel}`,
    `棋道 ${s.peakChessDao} · ${chessDaoLabel(s.peakChessDao)}`,
    `对局 ${s.matchesPlayed} 局,胜 ${s.matchesWon} 局`,
    `观棋 ${s.gamesWatched} 次`,
    `行过 ${s.placesSeen} 处,悟谱 ${s.manualsLearned} 部`,
    `结交精怪 ${s.spiritsBefriended} 位`,
    `破境未成 ${s.breakthroughsFailed} 次`,
    `掷骰 ${s.totalRolls} 次`,
  ];
  if (c) lines.push(`心尘 ${c.dust} · 银钱 ${c.coin}`);
  return lines;
}

/** Ends the life. Idempotent: a second call on an ended state is a no-op. */
export function finishGame(state: GameState, endingId: string): EndingResult | null {
  if (state.phase === 'ended' && state.ending) return state.ending;
  const def = getEnding(endingId) ?? getEnding('end_wuming');
  if (!def) return null;
  const c = state.character;
  if (c && state.stats.peakRealmLabel === '凡尘·初境') {
    state.stats.peakRealmLabel = formatRealm(c.realm);
  }

  const result: EndingResult = {
    id: def.id,
    title: def.title,
    rank: def.rank,
    closing: def.closing,
    epitaph: def.epitaph,
    summary: summaryLines(state),
  };
  state.ending = result;
  state.phase = 'ended';
  state.pendingEvent = null;
  state.match = null;
  say(state, `——〔${def.title}〕`, 'moon');
  say(state, def.epitaph, 'normal');
  say(state, def.closing, 'jade');
  return result;
}

/** Age past 寿元 by this season? The turn pipeline asks once per season. */
export function isPastLifespan(state: GameState): boolean {
  const c = state.character;
  return c !== null && c.age > c.lifespan;
}

/** The number of years a realm grants — used by the panel's 寿元 readout. */
export function lifespanOf(state: GameState): number {
  const c = state.character;
  return c ? getRealm(c.realm.realm).lifespan : 0;
}

/** Sanity helper for tests and the README table. */
export function allEndingIds(): string[] {
  return ENDINGS.map((e) => e.id);
}
