// ============================================================================
// narrative.ts — 天道叙事模板库
// 冷峻、克制、文言化。天道旁观,不安慰,不喝彩。
// ============================================================================

import type { GameState, LogEntry } from './types';
import { NARRATIVE_LOG_CAP } from './types';

/** Render a template, replacing {var} placeholders. */
export function render(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function say(turn: number, text: string, tone?: LogEntry['tone']): LogEntry {
  return { turn, speaker: '天道', text, tone: tone ?? 'normal' };
}

export function sys(turn: number, text: string, tone?: LogEntry['tone']): LogEntry {
  return { turn, speaker: '系统', text, tone: tone ?? 'normal' };
}

export function battle(turn: number, text: string, tone?: LogEntry['tone']): LogEntry {
  return { turn, speaker: '战斗', text, tone: tone ?? 'normal' };
}

/** Append logs to the state's ring buffer (capped). */
export function appendLogs(state: GameState, logs: LogEntry[]): GameState {
  if (logs.length === 0) return state;
  const merged = [...state.narrativeLog, ...logs];
  return {
    ...state,
    narrativeLog:
      merged.length > NARRATIVE_LOG_CAP ? merged.slice(merged.length - NARRATIVE_LOG_CAP) : merged,
  };
}

// ---------------------------------------------------------------------------
// 模板库 T —— keyed by module · outcome
// ---------------------------------------------------------------------------

export const T = {
  // ===== 开篇 =====
  opening: [
    '天地不仁,以万物为刍狗。',
    '今有一缕生魂,坠入尘寰。姓名未定,命数未书。',
    '天道执笔,记汝一生。落子无悔。',
  ],
  creationOrigin: '汝生于{origin}。{desc}',
  creationAttributes: '骨相既定:根骨{genGu},悟性{wuXing},心性{xinXing},气运{qiYun}。命格如是,不增不减。',
  spiritRootPrelude: '测灵碑前,汝伸手按上碑面。碑光明灭——',
  spiritRootResult: {
    五灵根: '碑面五色驳杂,黯淡如泥。五灵根,俗谓伪灵根。仙路于汝,近乎闭塞。天道记下,不置一词。',
    四灵根: '四色微光,浊而不清。四灵根,资质下下。修行之路,汝当以苦为舟。',
    三灵根: '三色光华,勉强成形。三灵根,中人之姿。可入门墙,难望绝顶。',
    双灵根: '两色灵光,清亮夺目。双灵根,已胜世间九成之人。',
    真灵根: '一色纯光,直上三尺!真灵根——百年难遇,宗门必争。',
    异灵根: '碑光骤变,异色横空!变异灵根,天地钟爱,妖孽之姿。',
    天灵根: '万丈光柱,贯穿天地!天灵根!!测灵碑嗡鸣不止——此界百年,唯汝一人。',
  } as Record<string, string>,
  hiddenRoll: '最后,天道于幕后掷下一枚骰子。汝听见骰声,看不见点数。——天道已掷,命数已定。',
  creationDone: '尘埃落定。{name},汝之仙路,自此始。生死祸福,俱在骰中。',

  // ===== 修炼 =====
  cultivate: [
    '汝盘膝而坐,吐纳灵气。窗外日升月落,不知几度。',
    '灵气如丝,缓缓入体。修行无岁月,一坐又三月。',
    '汝依法行功,周天流转。进境或迟或速,天道皆记。',
  ],
  cultivateGain: '此番闭关,修为增长{exp}点。',
  layerUp: '经脉中灵气轰然一涨——{realmName}。水到,渠成。',
  mortalToQi: '一缕灵气终于突破皮膜,沉入丹田。引气入体,炼气一层。凡人之躯,自此告别。',
  stageUp: '道行圆融,更上一重。今为{realmName}。',
  gateReached: '修为已至{realmName}之极,再进一步,便是天堑。可尝试【突破】。',

  // ===== 突破 =====
  breakthroughAttempt: '汝闭死关,孤注一掷。天地屏息,骰子已在天道指间。',
  breakthroughRoll: '掷骰:D100 = {roll},所需 ≤ {chance}。',
  breakthroughSuccess: '轰——天堑既过,天地易色。{realmName}!寿元亦随之而涨。',
  breakthroughFail: '气机逆行,经脉俱震。汝之道,止步于此乎?修为折损{loss}点。',
  breakthroughInjury: '走火余波未平,心魔已生。此劫,需以岁月慢慢偿还。',
  breakthroughDeath: '经脉寸断,金身崩解。汝以身试天,天未让路。',
  breakthroughNotReady: '修为未至其极,妄言突破。天道不应。',
  bottleneck: '连番受挫,道基蒙尘。瓶颈已成,再突破难上加难。(可寻破障丹解之)',

  // ===== 战斗 =====
  combatStart: '【遭遇】{enemyName}——{desc}',
  combatPlayerHit: '汝出手,{enemyName}受创{dmg}点。(掷D20={roll})',
  combatEnemyHit: '{enemyName}反扑,汝受创{dmg}点。(敌掷D20={roll})',
  combatArtCast: '汝催动『{artName}』,威能大涨。',
  combatWin: '{enemyName}倒下了。尘埃落定,汝收势而立。',
  combatLoot: '战利:{loot}。',
  combatLose: '汝力竭倒地。{enemyName}掠走了汝三成灵石,扬长而去。败者,无言。',
  combatFled: '汝且战且退,遁入荒野。性命尚在,颜面无存。',
  combatFleeFail: '遁走不及,被拦了回来。(掷D100={roll})',
  combatCannotFlee: '此敌不容走脱。',
  combatDeath: '汝的血溅在地上,很快凉了。天道合上此页。',

  // ===== 事件桶 =====
  bucketPrelude: {
    大凶: '是夜,凶星临顶。',
    小凶: '风向不对。',
    平: '',
    小吉: '今日风顺。',
    大吉: '紫气东来。',
  } as Record<string, string>,

  // ===== 坊市/炼丹 =====
  marketBuy: '购入{item}×{count},付灵石{cost}。',
  marketSell: '售出{item}×{count},得灵石{gain}。',
  marketPoor: '囊中灵石不足。钱掌柜的笑容淡了三分。',
  marketNoItem: '坊市并无此物。',
  alchemyAttempt: '丹炉起火,药香渐浓。汝屏息控火——',
  alchemySuccess: '炉盖掀开,丹成!得『{item}』一枚。(掷D100={roll},需≤{chance})',
  alchemyFail: '一声闷响,炉中焦黑。药材尽毁,徒留青烟。(掷D100={roll},需≤{chance})',
  alchemyNoMaterials: '药材不齐,巧妇难为。',

  // ===== 岁月/终局 =====
  aging: '又一年。汝{age}岁,寿元{lifespan}。',
  injuryHealed: '{injury}终于痊愈。',
  endingSummary: '【终】{title}。享年{age}岁,止步{realm},历{turns}载春秋,掷骰{rolls}次。',

  // ===== 系统 =====
  denyWish: '天道不受愿。',
  denyUnknown: '天道不解此言。(输入【面板】可见可行之事)',
  denyPhase: '此时不可行此事。',
  corruptSave: '此界因果紊乱,不可续。唯有重开。',
  restartConfirm: '因果尽散,再入轮回?',
  restarted: '前尘尽散。新的一世,骰子重掷。',
  invariantViolation: '天机紊乱,此举不作数。(状态回滚)',
} as const;

/** Pick a line from a rotating pool deterministically by turn. */
export function pickLine(pool: readonly string[], turn: number): string {
  return pool[turn % pool.length];
}
