/**
 * prose.ts — 天道之声 for the world-systems layer (combat / events /
 * exploration / economy / alchemy / npc / quests / turn).
 *
 * State-mutating log helpers + deterministic line pools. Pools are picked
 * via an FNV hash of (turn, log counter) so replays stay identical WITHOUT
 * consuming audited dice. Complements narrative.ts (pure log builders used
 * by the creation/cultivation/breakthrough layer).
 */

import type { GameState, LogEntry, LogTone } from './types';
import { LOG_CAP } from './types';
import { fnv1a64 } from './audit';
import { realmLabelOf } from './realms';
import { settleLevelUps } from './cultivation';

// ============================================================================
// Log helpers (id-safe against optional counters)
// ============================================================================

function nextLogId(state: GameState): number {
  const id = state.nextLogId ?? (state.narrativeLog[state.narrativeLog.length - 1]?.id ?? 0) + 1;
  state.nextLogId = id + 1;
  return id;
}

export function say(
  state: GameState,
  text: string,
  tone?: LogTone,
  speaker: LogEntry['speaker'] = '天道',
): void {
  state.narrativeLog.push({ id: nextLogId(state), turn: state.turn, speaker, text, tone });
  if (state.narrativeLog.length > LOG_CAP) {
    state.narrativeLog.splice(0, state.narrativeLog.length - LOG_CAP);
  }
}

export function sys(state: GameState, text: string, tone: LogTone = 'muted'): void {
  say(state, text, tone, '系统');
}

export function battle(state: GameState, text: string, tone: LogTone = 'normal'): void {
  say(state, text, tone, '战斗');
}

/** deterministic pool pick — replay-stable, does not touch the dice */
export function pick(state: GameState, pool: readonly string[]): string {
  if (pool.length === 0) return '';
  const h = fnv1a64(`${state.turn}:${state.nextLogId ?? state.narrativeLog.length}:${pool.length}`);
  const idx = Number(BigInt('0x' + h) % BigInt(pool.length));
  return pool[idx] ?? pool[0]!;
}

/** "炼气七层" / "筑基中期" — canonical realm label */
export const formatRealm = realmLabelOf;

// ============================================================================
// Stats & world bootstrap (defensive against optional fields)
// ============================================================================

type StatsBlock = NonNullable<GameState['stats']>;

export function ensureStats(state: GameState): StatsBlock {
  if (!state.stats) {
    state.stats = {
      totalRolls: 0,
      stonesEarned: 0,
      enemiesSlain: 0,
      breakthroughsFailed: 0,
      pillsConsumed: 0,
      peakRealmLabel: state.character ? realmLabelOf(state.character.realm) : '凡人',
    };
  }
  return state.stats;
}

export function bumpStat(state: GameState, key: Exclude<keyof StatsBlock, 'peakRealmLabel'>, delta: number): void {
  const stats = ensureStats(state);
  stats[key] += delta;
}

// ============================================================================
// Exp gain with automatic minor level-ups (delegates settling to cultivation)
// ============================================================================

export function gainExp(state: GameState, amount: number): void {
  const c = state.character;
  if (!c || amount === 0) return;
  if (amount < 0) {
    c.realm = { ...c.realm, exp: Math.max(0, c.realm.exp + amount) };
    return;
  }
  c.realm = { ...c.realm, exp: c.realm.exp + amount };
  settleLevelUps(state);
}

// ============================================================================
// Line pools — 凡人流 tone: cold, restrained, vivid
// ============================================================================

export const NO_WISHING = '天道不受愿。';
export const UNKNOWN_COMMAND = '天道未闻此道。(输入「面板」可查看可用指令)';

export const COMBAT_TACTIC_FLAVOR: Record<string, readonly string[]> = {
  强攻: [
    '汝不闪不避,携全力一击迎面撞上——伤敌一千,何惜自损。',
    '狭路相逢,汝先出手,招招搏命。',
  ],
  游斗: [
    '汝身形游走,只守不攻,目光在对手周身逡巡,寻那一处破绽。',
    '汝且战且退,以巧卸力。急的,是对面。',
  ],
  设伏: ['汝佯装败退,袖中符土悄然落地,伏势暗成。', '汝虚晃一招,暗中布下后手。'],
  术法: ['真气涌向指尖,汝掐诀,喝声起。', '汝袖袍一振,术法脱手而出。'],
};

export const COMBAT_WIN_LINES: readonly string[] = [
  '尘埃落定。汝收势而立,气息微乱,人还站着——站着的,便是赢家。',
  '对手倒下时,眼里还带着不信。汝拭去兵刃上的血,不发一言。',
];

export const COMBAT_FLEE_SUCCESS: readonly string[] = [
  '汝觑得空隙,足尖一点,身形没入林莽。身后咆哮渐远。逃,亦是修行。',
  '风声在耳边炸开。等汝停步时,已在十里之外。狼狈,但活着。',
];

export const COMBAT_FLEE_FAIL: readonly string[] = [
  '汝转身欲走,退路已断。对手眼中多了一分讥诮——和杀意。',
  '遁走不成,反露了背门。险之又险。',
];

export const COMBAT_LOSE_ROBBED: readonly string[] = [
  '汝力竭倒地。对手翻检了汝的储物袋,拿走了看得上眼的一切,临走留下一句:"念汝修行不易,留汝一命。"',
  '败了。醒来时日已西斜,储物袋轻了大半,伤口的血凝成了黑痂。活着,就还有账可算。',
];

export const ALCHEMY_SUCCESS_LINES: readonly string[] = [
  '炉温三起三落,汝额角见汗。开炉——丹香扑面,一枚圆润丹丸卧于炉底。成了。',
  '火候将过未过之际,汝果断收火。炉盖掀开,丹成。',
];

export const ALCHEMY_GREAT_SUCCESS_LINES: readonly string[] = [
  '炉中忽起异香,经久不散。此炉出丹,竟比丹方所载多出一枚——妙手,偶得之。',
];

export const ALCHEMY_FAIL_LINES: readonly string[] = [
  '一声闷响,炉盖冲天而起。满室焦烟里,汝盯着一炉黑灰,良久无言。药材,没了。',
  '火候差了一线,满炉药力化作青烟。天道旁观,不予置评。',
];

export const MARKET_ARRIVE_LINES: readonly string[] = [
  '坊市人声如沸。灵气、铜臭与丹香混作一处——修行人的红尘,俱在此地。',
  '万宝阁前幡旗招展。掌柜远远便拱手:"道友,里边请。"',
];

export const EXPLORE_INTRO_LINES: readonly string[] = [
  '汝束紧行囊,踏入{place}。',
  '晨雾未散,汝已行在{place}的深处。',
];

export const REST_LINES: readonly string[] = [
  '汝寻了处僻静山洞,调息养伤。伤处的钝痛,一日轻过一日。',
  '一季静养。汝煮药、行气、睡整觉——修行人难得把自己当人。',
];
