/**
 * board.ts — 弈道, the conflict system. Nobody bleeds; you lose 目数.
 *
 * A match is a fixed number of 手 (exchanges). Each exchange is
 *
 *   D20 + 悟性 + 枰加成 + 棋风修正 + 先手  vs  对手手筋 (strength ÷ 3 + 8)
 *
 * and the difference moves 目数 (`margin`). Five 棋风 give the exchange its
 * texture:
 *
 *   稳守  narrow swings both ways — the safe grind
 *   急攻  wide swings; spends 先手 for a large bonus
 *   弃子  concede this exchange to arm 劫争, doubling the next one
 *   试探  small gain, but earns 先手
 *   封盘  seal the board and end the match now, keeping the current 目数
 *
 * Every opponent punishes one 棋风 (`counters`) and fumbles another
 * (`weakTo`), so the read matters more than the numbers.
 */

import { getOpponent, OPPONENTS } from '@/data/opponents';
import { realmAtLeast } from './audit';
import { boardBonus } from './cultivation';
import { addToInventory } from './inventory';
import { adjustFavor } from './spirits';
import {
  addChessDao,
  addCoin,
  addDust,
  addExp,
  addInsight,
  addSpirit,
  board,
  note,
  say,
} from './prose';
import { roll } from './rng';
import type { BoardStyle, GameState, MatchState, OpponentDef } from './types';

export const BOARD_STYLES: readonly BoardStyle[] = ['稳守', '急攻', '弃子', '试探', '封盘'];

export const STYLE_HELP: Record<BoardStyle, string> = {
  稳守: '收紧阵形。胜负都小,但不会崩。',
  急攻: '直取要害。若有先手,威力倍增;若无,反受其乱。',
  弃子: '此手认输,换一个劫。下一手目数加倍。',
  试探: '轻轻一碰。所得不多,却能抢到先手。',
  封盘: '就此收官。目数落定,不再更改。(第三手后方可)',
};

/** Minimum hand at which 封盘 is allowed. */
export const SEAL_FROM_HAND = 3;

export interface OpenResult {
  ok: boolean;
  message: string;
}

/** Opponents who will sit down with you here and now. */
export function availableOpponents(state: GameState): OpponentDef[] {
  const c = state.character;
  if (!c) return [];
  return OPPONENTS.filter(
    (o) => realmAtLeast(c.realm.realm, o.minRealm) && placeOf(o) === state.placeId,
  );
}

function placeOf(o: OpponentDef): string {
  const prefix = o.title.split('·')[0] ?? '';
  return PLACE_OF_TITLE[prefix] ?? '';
}

const PLACE_OF_TITLE: Record<string, string> = {
  宁安县: 'ningan',
  稽川渡: 'jichuan',
  幽篁竹海: 'zhulin',
  烂柯山: 'lankeshan',
  云栖古寺: 'gusi',
  夜市旧镇: 'yezhen',
  沧河龙渊: 'canghe',
  九荒古道: 'jiuhuang',
  玄阙书院: 'xuanque',
  阴司渡: 'yinsi',
  云海棋台: 'yunhai',
  太虚枰: 'taixu',
};

export function openMatch(state: GameState, opponentId: string): OpenResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。' };
  if (state.match) return { ok: false, message: '棋局未终,不容分神。' };
  const opp = getOpponent(opponentId);
  if (!opp) return { ok: false, message: `无此对手:${opponentId}` };
  if (!realmAtLeast(c.realm.realm, opp.minRealm)) {
    return { ok: false, message: `${opp.name}还看不见汝,汝也看不见他。` };
  }
  if (placeOf(opp) !== state.placeId) return { ok: false, message: `${opp.name}不在此处。` };
  if (c.coin < opp.stake) return { ok: false, message: `彩头 ${opp.stake} 银钱,汝掏不出。` };
  if (c.spirit < 8) return { ok: false, message: '心神将尽,坐下也是输。先坐忘罢。' };

  state.match = {
    opponentId,
    hand: 1,
    hands: opp.hands,
    margin: 0,
    initiative: false,
    ko: false,
    log: [],
    over: false,
  };
  state.phase = 'match';
  say(state, opp.intro, 'moon');
  board(state, `——${opp.name}（${opp.title}）· 共 ${opp.hands} 手 · 彩头 ${opp.stake}`, 'jade');
  note(state, '棋风:稳守 / 急攻 / 弃子 / 试探 / 封盘,或「投子」认负。');
  return { ok: true, message: `与${opp.name}对坐。` };
}

interface StyleProfile {
  /** flat modifier to the exchange roll */
  mod: number;
  /** how strongly the exchange result scales into 目数 */
  scale: number;
  spiritCost: number;
}

const STYLE_PROFILE: Record<BoardStyle, StyleProfile> = {
  稳守: { mod: 3, scale: 0.6, spiritCost: 3 },
  急攻: { mod: -1, scale: 1.5, spiritCost: 7 },
  弃子: { mod: 0, scale: 0, spiritCost: 4 },
  试探: { mod: 2, scale: 0.4, spiritCost: 2 },
  封盘: { mod: 0, scale: 0, spiritCost: 5 },
};

export interface HandResult {
  ok: boolean;
  message: string;
  d20?: number;
  delta?: number;
  matchOver?: boolean;
  /** set when the match resolved this hand */
  outcome?: MatchOutcome;
}

export interface MatchOutcome {
  result: 'win' | 'loss' | 'draw' | 'resigned';
  margin: number;
  coinDelta: number;
  ending?: string;
}

/** The opponent's difficulty for one exchange. */
export function handDC(opp: OpponentDef): number {
  return 8 + Math.round(opp.strength / 3);
}

export function playHand(state: GameState, style: BoardStyle): HandResult {
  const c = state.character;
  const m = state.match;
  if (!c || !m) return { ok: false, message: '此刻无局可弈。' };
  if (m.over) return { ok: false, message: '此局已终。' };
  const opp = getOpponent(m.opponentId);
  if (!opp) return { ok: false, message: '对手不知所踪。' };

  if (style === '封盘') {
    if (m.hand < SEAL_FROM_HAND) {
      return { ok: false, message: `第 ${m.hand} 手便封盘?至少下满 ${SEAL_FROM_HAND} 手。` };
    }
    board(state, '汝把手按在棋罐上:「就到这里罢。」', 'muted');
    addSpirit(c, -STYLE_PROFILE.封盘.spiritCost);
    const outcome = settle(state, opp, m);
    return { ok: true, message: '已封盘。', matchOver: true, outcome };
  }

  const profile = STYLE_PROFILE[style];
  const d20 = roll(state, 'D20', `弈道·第${m.hand}手·${style}`);
  const dc = handDC(opp);

  let mod = profile.mod + boardBonus(c) + Math.round(c.attributes.wuXing / 2);
  if (style === opp.weakTo) mod += 5;
  if (style === opp.counters) mod -= 5;
  if (style === '急攻' && m.initiative) mod += 6;

  const total = d20 + mod;
  let delta = 0;

  if (style === '弃子') {
    // Give up this exchange on purpose; the ko it starts is worth more.
    delta = -Math.max(2, Math.round(opp.strength / 6));
    m.ko = true;
    board(state, `汝弃了一块。对手吃下去时手停了一瞬——那里有个劫。`, 'dusk');
  } else {
    const raw = (total - dc) * profile.scale;
    delta = Math.round(raw * (1 + opp.strength / 60));
    if (m.ko) {
      delta *= 2;
      m.ko = false;
      board(state, '劫争一了,盘面陡然一宽。', 'jade');
    }
  }

  if (style === '试探') {
    m.initiative = true;
    board(state, '汝落了一手闲棋。对手想了很久——先手到了汝这边。', 'bamboo');
  } else if (style === '急攻' && m.initiative) {
    m.initiative = false;
  }

  m.margin += delta;
  addSpirit(c, -profile.spiritCost);

  const line = `第${m.hand}手·${style} D20 ${d20}${mod >= 0 ? '+' : ''}${mod} = ${total} vs ${dc} → 目数 ${delta >= 0 ? '+' : ''}${delta}(累计 ${m.margin >= 0 ? '+' : ''}${m.margin})`;
  m.log.push(line);
  board(state, line, delta >= 0 ? 'jade' : 'dusk');

  if (style === opp.weakTo) board(state, `${opp.name}显然不擅应此。`, 'jade');
  if (style === opp.counters) board(state, `${opp.name}等的正是这一手。`, 'dusk');

  m.hand += 1;
  if (m.hand > m.hands) {
    const outcome = settle(state, opp, m);
    return { ok: true, message: '终局。', d20, delta, matchOver: true, outcome };
  }
  if (c.spirit <= 0) {
    board(state, '汝眼前一黑,手指僵在半空。这局下不下去了。', 'dusk');
    const outcome = settle(state, opp, m, 'resigned');
    return { ok: true, message: '心神耗尽。', d20, delta, matchOver: true, outcome };
  }
  return { ok: true, message: line, d20, delta, matchOver: false };
}

export function resign(state: GameState): HandResult {
  const c = state.character;
  const m = state.match;
  if (!c || !m) return { ok: false, message: '此刻无局可弈。' };
  const opp = getOpponent(m.opponentId);
  if (!opp) return { ok: false, message: '对手不知所踪。' };
  board(state, '汝拈起一子,又放回罐里。「我输了。」', 'muted');
  const outcome = settle(state, opp, m, 'resigned');
  return { ok: true, message: '已投子。', matchOver: true, outcome };
}

// ============================================================================
// Settlement
// ============================================================================

function settle(
  state: GameState,
  opp: OpponentDef,
  m: MatchState,
  forced?: 'resigned',
): MatchOutcome {
  const c = state.character;
  m.over = true;
  state.phase = 'playing';
  state.stats.matchesPlayed += 1;
  if (!c) {
    state.match = null;
    return { result: 'resigned', margin: m.margin, coinDelta: 0 };
  }

  const result: MatchOutcome['result'] =
    forced === 'resigned' ? 'resigned' : m.margin > 0 ? 'win' : m.margin < 0 ? 'loss' : 'draw';
  m.result = result;

  let coinDelta = 0;
  let ending: string | undefined;

  if (result === 'win') {
    state.stats.matchesWon += 1;
    coinDelta = addCoin(c, opp.stake);
    state.stats.coinEarned += coinDelta;
    say(state, opp.onLoss, 'jade');
    const r = opp.reward;
    const gains: string[] = [`目数 +${m.margin}`];
    if (coinDelta > 0) gains.push(`银钱 +${coinDelta}`);
    if (r?.chessDao) gains.push(`棋道 +${addChessDao(c, r.chessDao)}`);
    if (r?.insight) gains.push(`悟 +${addInsight(c, r.insight)}`);
    if (r?.exp) gains.push(`修为 +${addExp(c, r.exp)}`);
    if (r?.itemId) {
      addToInventory(c, r.itemId, 1);
      gains.push('另有所赠');
    }
    addDust(c, -4);
    note(state, gains.join(' · '), 'jade');
    if (opp.spiritId) adjustFavor(state, opp.spiritId, 14);
    c.flags['连胜'] = Number(c.flags['连胜'] ?? 0) + 1;
    c.flags['胜局'] = Number(c.flags['胜局'] ?? 0) + 1;
    if (Number(c.flags['胜局']) >= 20) c.flags['国手'] = true;
  } else if (result === 'draw') {
    say(state, '数子毕,不多不少。两人都愣了一下,继而都笑了。', 'moon');
    addChessDao(c, 1);
    addInsight(c, 1);
    addExp(c, Math.round(opp.strength * 1.5));
    note(state, '和局 · 棋道 +1 · 悟 +1', 'jade');
    c.flags['连胜'] = 0;
  } else {
    coinDelta = addCoin(c, -opp.stake);
    say(state, opp.onWin, 'dusk');
    addExp(c, Math.round(opp.strength));
    const dust = result === 'resigned' ? 8 : 5;
    addDust(c, dust);
    addChessDao(c, 1);
    note(state, `目数 ${m.margin} · 银钱 ${coinDelta} · 心尘 +${dust} · 棋道 +1(输棋也是棋)`, 'dusk');
    c.flags['连胜'] = 0;
    c.flags['败局'] = Number(c.flags['败局'] ?? 0) + 1;
  }

  if (c.chessDao > state.stats.peakChessDao) state.stats.peakChessDao = c.chessDao;

  // 云中叟 is the last board. Beating him hands over the seat itself.
  if (result === 'win' && opp.id === 'yunhai_weiqi') {
    c.flags['接过棋台'] = true;
    say(state, '云中叟起身,把石凳让了出来:「这台子,该换人守了。」', 'moon');
  }

  state.match = null;
  return { result, margin: m.margin, coinDelta, ...(ending ? { ending } : {}) };
}
