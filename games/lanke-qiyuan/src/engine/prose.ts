/**
 * prose.ts — narration helpers shared by every engine module.
 *
 * The log is a capped ring buffer with monotonic ids so React keys stay
 * stable even after the oldest lines are dropped. Four speakers: 弈者 (the
 * unnamed immortal narrator), 棋录 (mechanical bookkeeping), 弈 (the board),
 * and 汝 (you).
 */

import type { Character, GameState, LogEntry, LogTone, RealmState, Speaker } from './types';
import { LOG_CAP, MAX_CHESS_DAO, MAX_DUST, TURNS_PER_YEAR } from './types';
import { getRealm } from '@/data/realms';

export function log(state: GameState, speaker: Speaker, text: string, tone?: LogTone): void {
  const id = state.nextLogId;
  state.nextLogId = id + 1;
  const entry: LogEntry = { id, turn: state.turn, speaker, text, ...(tone ? { tone } : {}) };
  state.narrativeLog.push(entry);
  if (state.narrativeLog.length > LOG_CAP) {
    state.narrativeLog.splice(0, state.narrativeLog.length - LOG_CAP);
  }
}

/** 弈者 — the narrator. */
export function say(state: GameState, text: string, tone?: LogTone): void {
  log(state, '弈者', text, tone);
}

/** 棋录 — bookkeeping lines (gains, losses, refusals). */
export function note(state: GameState, text: string, tone: LogTone = 'muted'): void {
  log(state, '棋录', text, tone);
}

/** 弈 — the board speaking during a match. */
export function board(state: GameState, text: string, tone?: LogTone): void {
  log(state, '弈', text, tone);
}

// ============================================================================
// Formatting
// ============================================================================

export function formatRealm(realm: RealmState): string {
  return `${getRealm(realm.realm).name}·${realm.stage}`;
}

/** Turn 1 is the first season of the first year. */
export function formatSeason(turn: number): string {
  const seasons = ['春', '夏', '秋', '冬'];
  const idx = ((turn - 1) % TURNS_PER_YEAR + TURNS_PER_YEAR) % TURNS_PER_YEAR;
  const year = Math.floor((turn - 1) / TURNS_PER_YEAR) + 1;
  return `第${year}年·${seasons[idx]}`;
}

export function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ============================================================================
// Clamped mutators — the only sanctioned way to move the core meters
// ============================================================================

export function addSpirit(c: Character, delta: number): number {
  const before = c.spirit;
  c.spirit = Math.max(0, Math.min(c.maxSpirit, c.spirit + delta));
  return c.spirit - before;
}

export function addDust(c: Character, delta: number, quietMind = false): number {
  // 静者 only slows dust accruing, never the relief of shedding it.
  const scaled = delta > 0 && quietMind ? Math.round(delta * 0.75) : delta;
  const before = c.dust;
  c.dust = Math.max(0, Math.min(MAX_DUST, c.dust + scaled));
  return c.dust - before;
}

export function addChessDao(c: Character, delta: number): number {
  const before = c.chessDao;
  c.chessDao = Math.max(0, Math.min(MAX_CHESS_DAO, c.chessDao + delta));
  return c.chessDao - before;
}

export function addCoin(c: Character, delta: number): number {
  const before = c.coin;
  c.coin = Math.max(0, c.coin + delta);
  return c.coin - before;
}

export function addInsight(c: Character, delta: number): number {
  const before = c.insight;
  c.insight = Math.max(0, c.insight + delta);
  return c.insight - before;
}

/** Adds 修为, spilling nothing: the bar caps at expNeeded until 破境. */
export function addExp(c: Character, delta: number): number {
  const before = c.realm.exp;
  c.realm.exp = Math.max(0, Math.min(c.realm.expNeeded, c.realm.exp + delta));
  return c.realm.exp - before;
}

// ============================================================================
// Stock lines
// ============================================================================

export const UNKNOWN_COMMAND = '此举不在谱内。';
export const NOT_PLAYING = '命格未定,不可妄动。';
export const LIFE_OVER = '此局已终。唯「重开」可再入一世。';
export const EVENT_PENDING = '眼下之事未了,须先抉择。';
export const MATCH_PENDING = '棋局未终,不容分神。(稳守 / 急攻 / 弃子 / 试探 / 封盘 / 投子)';

export const CULTIVATE_LINES: readonly string[] = [
  '汝寻一处僻静,铺开棋枰,自黑先起手。',
  '窗外落雪。汝一手一手地摆,不为胜负。',
  '打谱至深夜。烛芯结了三次灯花。',
  '汝盘膝而坐,棋子在指间转了一圈又一圈。',
  '晨光爬上枰面时,汝已经摆到了第三十七手。',
  '汝闭着眼落子。落错了也不悔,继续往下推。',
];

export const SIT_FORGET_LINES: readonly string[] = [
  '汝什么也不做,只是坐着。',
  '汝把棋收进罐里,听风穿过檐角。',
  '汝望着一处不存在的地方,坐了很久。',
  '呼吸慢下来。慢到汝忘了自己在呼吸。',
];

export const SPECTATE_LINES: readonly string[] = [
  '街边一局野棋,围了七八个人。汝挤在最外圈。',
  '茶楼二层有人对弈,汝在楼梯上站着看完。',
  '两个孩子在地上画格子下棋,规则是他们自己编的。',
  '一位老妇独自摆谱,摆的是几十年前的旧局。',
  '庙前石桌上有人厮杀正酣,落子声脆得像雨。',
];

/** Deterministic pick — the caller supplies the audited roll. */
export function pickBy<T>(options: readonly T[], roll: number): T {
  if (options.length === 0) throw new Error('pickBy: empty options');
  return options[(roll - 1) % options.length] as T;
}
