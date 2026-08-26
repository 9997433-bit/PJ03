/**
 * chess.ts — 弈道, the conflict system.
 *
 * A match is a fixed number of 手 (exchanges). Each exchange rolls
 * `D20 + 枰力 + 棋风修正` against `对手棋力 + 8`; the difference moves 目数
 * (`margin`). When the hands run out, whoever leads on 目数 has won. Nobody
 * bleeds; the loser pays the stake, gains 心尘, and — importantly — still
 * learns something.
 *
 * The five 棋风 are a rock-paper-scissors layer on top of that arithmetic:
 *
 *   稳守  small gains, much smaller losses
 *   急攻  swings hard both ways; spends 先手 for a large bonus
 *   弃子  gives up 目数 now to arm 劫争 — the next exchange counts double
 *   试探  barely moves the score, but earns 先手
 *   封盘  freezes the position and burns a hand: the way to protect a lead
 *
 * Every opponent punishes one style (`counters`) and cannot answer another
 * (`weakTo`), which is what makes reading the intro worth doing.
 */

import type { BoardStyle, Character, GameState, MatchState, OpponentDef } from './types';
import { roll } from './rng';
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
import { addFavor, addItem, checkFavorThresholds } from './effects';
import { getManual } from '@/data/manuals';
import { getOpponent, opponentsAt } from '@/data/opponents';
import { getItem } from '@/data/items';
import { realmTier } from '@/data/realms';

export const ALL_STYLES: readonly BoardStyle[] = ['稳守', '急攻', '弃子', '试探', '封盘'];

export const STYLE_HINTS: Record<BoardStyle, string> = {
  稳守: '守住已有的。赢得少,输得更少。',
  急攻: '倾力一击。胜负都放大;有先手时威力最盛。',
  弃子: '舍一块,换一个劫。此手吃亏,下一手加倍。',
  试探: '轻轻一碰,看他如何应。所得甚微,却能夺先手。',
  封盘: '把局面钉死。领先时封盘,是最难看也最有效的一手。',
};

/** 枰力 — everything you bring to the board, before the dice. */
export function boardPower(c: Character): number {
  const manual = c.studyingId ? getManual(c.studyingId) : null;
  const moodMod = c.moods.reduce((sum, m) => sum + (m.boardMod ?? 0), 0);
  return (
    Math.floor(c.chessDao / 3) +
    c.chessAffinity.boardBonus +
    (manual?.boardBonus ?? 0) +
    Math.floor(c.attributes.wuXing / 2) +
    Math.floor(c.attributes.xinJing / 3) +
    realmTier(c.realm.realm) +
    moodMod -
    Math.floor(c.dust / 20)
  );
}

/** The opponents willing to sit down with you here and now. */
export function availableOpponents(state: GameState): OpponentDef[] {
  const c = state.character;
  if (!c) return [];
  const tier = realmTier(c.realm.realm);
  return opponentsAt(state.placeId).filter((o) => realmTier(o.minRealm) <= tier);
}

const MATCH_SPIRIT_PER_HAND = 3;

/** 弈道 — sit down opposite somebody. */
export function startMatch(state: GameState, opponentId?: string): void {
  const c = state.character;
  if (!c) return;

  const here = availableOpponents(state);
  if (here.length === 0) {
    say(state, '此处无人愿与汝对坐。棋是两个人的事。', 'dusk');
    return;
  }

  const opponent = opponentId ? getOpponent(opponentId) : here[0];
  if (!opponent || !here.some((o) => o.id === opponent.id)) {
    note(state, `此处可弈者:${here.map((o) => o.name).join('、')}`, 'dusk');
    return;
  }
  if (c.coin < opponent.stake) {
    note(state, `彩头${opponent.stake}钱,汝囊中只有${c.coin}。`, 'dusk');
    return;
  }

  state.match = {
    opponentId: opponent.id,
    hand: 1,
    hands: opponent.hands,
    margin: 0,
    initiative: false,
    ko: false,
    log: [],
    over: false,
  };
  state.phase = 'match';
  state.stats.matchesPlayed += 1;

  say(state, opponent.intro, 'bamboo');
  note(
    state,
    `【${opponent.name}·${opponent.title}】棋力 ${opponent.strength} · 共${opponent.hands}手 · 彩头 ${opponent.stake}钱`,
    'muted',
  );
  note(state, `汝之枰力 ${boardPower(c)}。请落子。`, 'muted');
}

interface HandResult {
  d20: number;
  delta: number;
  marginDelta: number;
}

function resolveHand(state: GameState, opponent: OpponentDef, style: BoardStyle): HandResult {
  const c = state.character!;
  const m = state.match!;

  let styleMod = 0;
  if (style === '稳守') styleMod += 3;
  if (style === '试探') styleMod += 1;
  if (style === '封盘') styleMod += 2;
  if (style === '弃子') styleMod -= 2;
  if (style === '急攻' && m.initiative) styleMod += 6;

  if (style === opponent.weakTo) styleMod += 5;
  if (style === opponent.counters) styleMod -= 5;

  const d20 = roll(state, 'D20', `弈道·第${m.hand}手·${style}`);
  const delta = d20 + boardPower(c) + styleMod - (opponent.strength + 8);

  let marginDelta: number;
  switch (style) {
    case '稳守':
      marginDelta = delta > 0 ? Math.round(delta * 0.6) : Math.round(delta * 0.4);
      break;
    case '急攻':
      marginDelta = Math.round(delta * 1.5);
      break;
    case '弃子':
      marginDelta = Math.round(delta * 0.5) - 4;
      break;
    case '试探':
      marginDelta = Math.round(delta * 0.4);
      break;
    case '封盘':
      marginDelta = Math.round(delta * 0.3);
      break;
  }

  if (m.ko) {
    marginDelta *= 2;
    m.ko = false;
  }
  return { d20, delta, marginDelta };
}

function styleNarration(style: BoardStyle, delta: number): string {
  const good = delta > 0;
  switch (style) {
    case '稳守':
      return good ? '汝不急不躁,一路补厚。他的先手渐渐没了用处。' : '守得住形,守不住势。他一点一点地啃。';
    case '急攻':
      return good ? '汝一手压过去,他的大龙立时喘不过气。' : '攻得太深。回头一看,自家反倒露了破绽。';
    case '弃子':
      return good ? '汝弃了一块。他吃得欢喜,却没看见劫材已经攒好了。' : '弃子是弃了,劫材没攒成。这块白丢了。';
    case '试探':
      return good ? '汝轻轻碰了一下。他应错了——先手到手。' : '汝碰了一下,他不应。这一手等于没下。';
    case '封盘':
      return good ? '汝把局面封死。棋盘上再无变化,只剩数目。' : '封是封住了,可封住的是自己的路。';
  }
}

/** One exchange. */
export function playHand(state: GameState, style: BoardStyle): void {
  const c = state.character;
  const m = state.match;
  if (!c || !m || m.over) return;
  const opponent = getOpponent(m.opponentId);
  if (!opponent) return;

  const hadInitiative = m.initiative;
  const { d20, delta, marginDelta } = resolveHand(state, opponent, style);

  if (style === '急攻' && hadInitiative) m.initiative = false;
  if (style === '试探' && delta > 0) m.initiative = true;
  if (style === '弃子') m.ko = true;

  m.margin += marginDelta;
  const line = styleNarration(style, delta);
  board(state, `第${m.hand}手 · ${style} —— ${line}`, marginDelta >= 0 ? 'bamboo' : 'dusk');
  note(
    state,
    [
      `D20=${d20}`,
      `目数 ${marginDelta >= 0 ? '+' : ''}${marginDelta}`,
      `局面 ${m.margin >= 0 ? '+' : ''}${m.margin}目`,
      m.initiative ? '先手在汝' : '',
      m.ko ? '劫争已起' : '',
    ]
      .filter(Boolean)
      .join(' · '),
    'muted',
  );
  m.log.push(`第${m.hand}手 ${style} ${marginDelta >= 0 ? '+' : ''}${marginDelta}目`);

  // 封盘 spends an extra hand: that is the cost of freezing the position.
  m.hand += style === '封盘' ? 2 : 1;

  if (m.hand > m.hands) {
    finishMatch(state, m.margin > 0 ? 'win' : m.margin < 0 ? 'loss' : 'draw');
  }
}

/** 投子 — concede before the hands run out. */
export function resignMatch(state: GameState): void {
  const m = state.match;
  if (!m || m.over) return;
  board(state, '汝把子放回罐里。「这局,我认了。」', 'dusk');
  finishMatch(state, 'resigned');
}

function finishMatch(state: GameState, result: MatchState['result']): void {
  const c = state.character!;
  const m = state.match!;
  const opponent = getOpponent(m.opponentId)!;

  m.over = true;
  m.result = result;
  state.phase = 'playing';
  addSpirit(c, -MATCH_SPIRIT_PER_HAND * Math.min(m.hand, m.hands));

  const lines: string[] = [];

  if (result === 'win') {
    state.stats.matchesWon += 1;
    say(state, opponent.onLoss, 'jade');
    if (opponent.stake > 0) {
      addCoin(c, opponent.stake);
      state.stats.coinEarned += opponent.stake;
      lines.push(`银钱 +${opponent.stake}`);
    }
    const reward = opponent.reward;
    if (reward?.chessDao) {
      const d = addChessDao(c, reward.chessDao);
      if (d !== 0) lines.push(`棋道 +${d}`);
    }
    if (reward?.insight) {
      addInsight(c, reward.insight);
      lines.push(`悟 +${reward.insight}`);
    }
    if (reward?.exp) {
      const d = addExp(c, reward.exp);
      if (d !== 0) lines.push(`修为 +${d}`);
    }
    if (reward?.itemId && !c.inventory.some((s) => s.itemId === reward.itemId)) {
      addItem(c, reward.itemId);
      lines.push(`得【${getItem(reward.itemId)?.name ?? reward.itemId}】`);
    }
    const shed = addDust(c, -6);
    if (shed !== 0) lines.push(`心尘 ${shed}`);
    if (opponent.spiritId) {
      const applied = addFavor(state, opponent.spiritId, 12);
      if (applied !== 0) lines.push(`${state.spirits[opponent.spiritId]?.name}好感 +${applied}`);
    }
  } else if (result === 'draw') {
    say(state, '数到最后,不多不少。两人对着枰,都没说话。', 'moon');
    const d = addChessDao(c, 2);
    if (d !== 0) lines.push(`棋道 +${d}`);
    addInsight(c, 1);
    lines.push('悟 +1');
    if (opponent.spiritId) addFavor(state, opponent.spiritId, 8);
  } else {
    say(state, opponent.onWin, 'dusk');
    if (opponent.stake > 0) {
      // Never below zero: an empty purse simply pays what it has.
      const paid = Math.min(c.coin, result === 'resigned' ? Math.ceil(opponent.stake / 2) : opponent.stake);
      addCoin(c, -paid);
      if (paid > 0) lines.push(`银钱 -${paid}`);
    }
    // A defeat still teaches, and conceding early teaches a little less.
    const learn = result === 'resigned' ? 1 : 2;
    const d = addChessDao(c, learn);
    if (d !== 0) lines.push(`棋道 +${d}`);
    const gained = addExp(c, Math.round((opponent.reward?.exp ?? 20) * 0.3));
    if (gained !== 0) lines.push(`修为 +${gained}`);
    const dust = addDust(c, result === 'resigned' ? 5 : 9);
    if (dust !== 0) lines.push(`心尘 +${dust}`);
    if (opponent.spiritId) addFavor(state, opponent.spiritId, result === 'resigned' ? -2 : 4);
  }

  state.stats.peakChessDao = Math.max(state.stats.peakChessDao, c.chessDao);
  const label =
    result === 'win' ? '胜' : result === 'loss' ? '负' : result === 'draw' ? '和' : '投子';
  note(
    state,
    `——【${opponent.name}】${label} · 终局 ${m.margin >= 0 ? '+' : ''}${m.margin}目——${lines.length > 0 ? '\n' + lines.join(' · ') : ''}`,
    result === 'win' ? 'jade' : result === 'draw' ? 'moon' : 'dusk',
  );
  checkFavorThresholds(state);
  state.match = null;
}
