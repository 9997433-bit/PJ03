/**
 * insight.ts — 棋道悟性, this game's signature system.
 *
 * 棋道 (0–100) is the through-line: it gates every 破境, it decides which
 * 棋谱 you can read at all, and it is the only stat that cannot be bought.
 * The single way to raise it is to *watch* — 观棋 — and watching gets harder
 * the more you already understand:
 *
 *   D20 + 悟性 + 参谱加成  vs  DC = 8 + ⌊棋道 ÷ 6⌋
 *
 * So the first ten points come almost free and the last ten take a lifetime.
 * A natural 20 is 顿悟: the board stops being a board for a moment.
 *
 * 坐忘 is the counterweight — it produces nothing, and it is the only reliable
 * way to shed 心尘.
 */

import { getManual } from '@/data/manuals';
import { getOrigin } from '@/data/origins';
import { boardBonus } from './cultivation';
import { applyMood } from './cultivation';
import {
  addChessDao,
  addDust,
  addExp,
  addInsight,
  addSpirit,
  note,
  pickBy,
  say,
  SIT_FORGET_LINES,
  SPECTATE_LINES,
} from './prose';
import { roll } from './rng';
import type { Character, GameState } from './types';
import { MAX_CHESS_DAO } from './types';

export const SPECTATE_SPIRIT_COST = 6;

/** The wall a 观棋 check must clear at the current 棋道. */
export function insightDC(chessDao: number): number {
  return 8 + Math.floor(chessDao / 6);
}

/** 听子 — the 棋馆学徒 perk multiplies what watching yields. */
function stoneEarBonus(c: Character): number {
  return getOrigin(c.originId)?.perk === 'stoneEar' ? 1.5 : 1;
}

export interface SpectateOutcome {
  d20: number;
  dc: number;
  total: number;
  success: boolean;
  epiphany: boolean;
  chessDaoGained: number;
  insightGained: number;
}

/**
 * 观棋 — stand at the edge of somebody else's game and try to see it.
 */
export function spectate(state: GameState): SpectateOutcome {
  const c = state.character;
  if (!c) {
    return { d20: 0, dc: 0, total: 0, success: false, epiphany: false, chessDaoGained: 0, insightGained: 0 };
  }

  const flavour = roll(state, 'D6', '观棋·情境');
  say(state, pickBy(SPECTATE_LINES, flavour), 'bamboo');

  const d20 = roll(state, 'D20', '观棋·悟性检定');
  const dc = insightDC(c.chessDao);
  const total = d20 + c.attributes.wuXing + boardBonus(c);
  const epiphany = d20 === 20;
  const success = epiphany || (d20 !== 1 && total >= dc);

  let chessDaoGained = 0;
  let insightGained = 0;

  if (epiphany) {
    chessDaoGained = addChessDao(c, Math.round(4 * stoneEarBonus(c)));
    insightGained = addInsight(c, 3);
    addExp(c, 40);
    addDust(c, -6);
    say(
      state,
      '——那一手落下时,汝忽然不再看见棋子,只看见棋子之间的空。此后很久,汝走路都在算气。',
      'moon',
    );
    applyMood(state, {
      id: 'mood_dunwu',
      name: '顿悟',
      kind: 'boon',
      turnsLeft: 4,
      speedMult: 1.35,
      boardMod: 2,
      desc: '一层窗纸破了。趁着这几日,想什么通什么。',
    });
  } else if (success) {
    const margin = total - dc;
    const raw = 1 + Math.min(2, Math.floor(margin / 6));
    chessDaoGained = addChessDao(c, Math.round(raw * stoneEarBonus(c)));
    addExp(c, 12 + margin);
    if (margin >= 8) insightGained = addInsight(c, 1);
    say(state, '汝看懂了其中一手。就一手,但那一手汝会记一辈子。', 'jade');
  } else {
    addExp(c, 4);
    addDust(c, 2, c.flags['静者'] === true);
    say(state, '汝看了很久。他们收了棋,汝还站着,没看出什么来。', 'muted');
  }

  const spent = -addSpirit(c, -SPECTATE_SPIRIT_COST);
  state.stats.gamesWatched += 1;
  if (c.chessDao > state.stats.peakChessDao) state.stats.peakChessDao = c.chessDao;

  const parts: string[] = [`D20 ${d20} + 悟性 ${c.attributes.wuXing}`];
  const bb = boardBonus(c);
  if (bb !== 0) parts.push(`枰 ${bb >= 0 ? '+' : ''}${bb}`);
  note(state, `观棋检定:${parts.join(' ')} = ${total} vs 难度 ${dc} → ${success ? '通' : '未通'}`);
  if (chessDaoGained > 0) note(state, `棋道 +${chessDaoGained}${insightGained > 0 ? `,悟 +${insightGained}` : ''}`, 'jade');
  if (spent > 0 && c.spirit <= 0) note(state, '心神已尽。该坐忘了。', 'dusk');

  return { d20, dc, total, success, epiphany, chessDaoGained, insightGained };
}

// ============================================================================
// 坐忘
// ============================================================================

export interface SitForgetOutcome {
  spiritRestored: number;
  dustShed: number;
  deep: boolean;
}

/**
 * 坐忘 — do nothing, on purpose. Restores 心神 in proportion to 心境 and is
 * the main sink for 心尘. A D6 of 6 goes deep and grants a lasting calm.
 */
export function sitForget(state: GameState): SitForgetOutcome {
  const c = state.character;
  if (!c) return { spiritRestored: 0, dustShed: 0, deep: false };

  const flavour = roll(state, 'D6', '坐忘·情境');
  say(state, pickBy(SIT_FORGET_LINES, flavour), 'bamboo');

  const depth = roll(state, 'D6', '坐忘·入定');
  const deep = depth >= 5;

  const restore = Math.round(c.maxSpirit * (0.35 + c.attributes.xinJing * 0.03) * (deep ? 1.5 : 1));
  const spiritRestored = addSpirit(c, restore);
  const shed = -(6 + Math.round(c.attributes.xinJing * 0.9) + (deep ? 12 : 0));
  const dustShed = -addDust(c, shed);
  addExp(c, deep ? 18 : 6);

  if (deep) {
    say(state, '汝坐得太深,连坐着这件事也忘了。醒来时,身上落了一层松针。', 'moon');
    applyMood(state, {
      id: 'mood_xujing',
      name: '虚静',
      kind: 'boon',
      turnsLeft: 3,
      speedMult: 1.15,
      dustPerTurn: -3,
      desc: '心里那面镜子擦干净了,照什么是什么。',
    });
  }
  note(state, `心神 +${spiritRestored},心尘 −${dustShed}。`);
  return { spiritRestored, dustShed, deep };
}

// ============================================================================
// 参谱 / 悟谱
// ============================================================================

export interface ManualResult {
  ok: boolean;
  message: string;
}

/** 悟谱 — spend 悟 to comprehend a manual permanently. */
export function learnManual(state: GameState, manualId: string): ManualResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。' };
  const manual = getManual(manualId);
  if (!manual) return { ok: false, message: `无此谱:${manualId}` };
  if (c.manuals.includes(manualId)) return { ok: false, message: `《${manual.name.replace(/[《》]/g, '')}》早已在心。` };
  if (c.chessDao < manual.minChessDao) {
    return { ok: false, message: `棋道 ${c.chessDao} 未及 ${manual.minChessDao},此谱翻开也是白纸。` };
  }
  const discount = getOrigin(c.originId)?.perk === 'wideRead' ? 0.7 : 1;
  const cost = Math.max(1, Math.round(manual.insightCost * discount));
  if (c.insight < cost) return { ok: false, message: `悟不足:需 ${cost},今有 ${c.insight}。` };

  addInsight(c, -cost);
  c.manuals.push(manualId);
  state.stats.manualsLearned += 1;
  say(state, `汝把${manual.name}读到了最后一页,合上时手是抖的。`, 'jade');
  note(state, `悟 −${cost}。${manual.desc}`);
  if (!c.studyingId) {
    c.studyingId = manualId;
    note(state, `已改参${manual.name}。`);
  }
  return { ok: true, message: `已悟${manual.name}` };
}

/** 参谱 — pick which comprehended manual colours the next stretch of 修炼. */
export function studyManual(state: GameState, manualId: string): ManualResult {
  const c = state.character;
  if (!c) return { ok: false, message: '命格未定。' };
  const manual = getManual(manualId);
  if (!manual) return { ok: false, message: `无此谱:${manualId}` };
  if (!c.manuals.includes(manualId)) return { ok: false, message: `未悟${manual.name},参之无益。` };
  if (c.studyingId === manualId) return { ok: false, message: `正参${manual.name}。` };
  c.studyingId = manualId;
  say(state, `汝把${manual.name}摊在膝上。`, 'bamboo');
  note(state, `修为 ×${manual.speedBonus.toFixed(2)},弈道 +${manual.boardBonus}。`);
  return { ok: true, message: `已参${manual.name}` };
}

/** The manuals a character could learn right now, given 棋道 and 悟. */
export function readableManuals(c: Character): string[] {
  return c.manuals.slice();
}

/** 棋道 in words — used on the panel and in the ending scroll. */
export function chessDaoLabel(chessDao: number): string {
  if (chessDao >= MAX_CHESS_DAO) return '枰外之人';
  if (chessDao >= 88) return '通神';
  if (chessDao >= 74) return '入神';
  if (chessDao >= 58) return '坐照';
  if (chessDao >= 42) return '具体';
  if (chessDao >= 26) return '通幽';
  if (chessDao >= 12) return '用智';
  return '守拙';
}
