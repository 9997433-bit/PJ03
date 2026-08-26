/**
 * cultivation.ts — 修炼 and the stage ladder.
 *
 * 修为 accrues from four multiplied factors, all of them visible on the
 * 命盘 so the player can reason about the number:
 *
 *   base(境界) × 棋缘 × 参谱 × 心境状态 × (1 + 悟性/25) × 心尘系数
 *
 * plus a D6 of scatter. Stage-ups inside a realm are automatic; only the jump
 * BETWEEN realms is a gamble (see breakthrough.ts).
 */

import { getRealm } from '@/data/realms';
import { getManual } from '@/data/manuals';
import { deriveMaxSpirit } from './attributes';
import { addDust, addExp, addSpirit, formatRealm, note, pickBy, say } from './prose';
import { CULTIVATE_LINES } from './prose';
import { roll } from './rng';
import type { Character, GameState, Mood } from './types';
import { MAX_DUST, STAGES } from './types';

/** 修炼 costs this much 心神 before any modifier. */
export const CULTIVATE_SPIRIT_COST = 12;

/** 心尘 slows cultivation but never stops it — a filthy mind still crawls forward. */
export const MIN_DUST_PENALTY = 0.4;

export interface SpeedBreakdown {
  base: number;
  affinity: number;
  manual: number;
  mood: number;
  comprehension: number;
  dustPenalty: number;
  total: number;
}

/** The full multiplier stack, exposed so the panel can show its own maths. */
export function speedBreakdown(c: Character): SpeedBreakdown {
  const base = getRealm(c.realm.realm).cultivateBase;
  const affinity = c.chessAffinity.speedMultiplier;
  const manual = c.studyingId ? (getManual(c.studyingId)?.speedBonus ?? 1) : 1;
  let mood = 1;
  for (const m of c.moods) mood *= m.speedMult ?? 1;
  const comprehension = 1 + c.attributes.wuXing / 25;
  const dustPenalty = Math.max(
    MIN_DUST_PENALTY,
    1 - ((1 - MIN_DUST_PENALTY) * c.dust) / MAX_DUST,
  );
  const total = base * affinity * manual * mood * comprehension * dustPenalty;
  return { base, affinity, manual, mood, comprehension, dustPenalty, total };
}

/** Expected 修为 per 修炼 turn, before the D6 of scatter. */
export function expectedExpGain(c: Character): number {
  return Math.max(1, Math.round(speedBreakdown(c).total));
}

/** The board-side flat bonus from 棋缘 + the manual being studied + moods. */
export function boardBonus(c: Character): number {
  let bonus = c.chessAffinity.boardBonus;
  if (c.studyingId) bonus += getManual(c.studyingId)?.boardBonus ?? 0;
  for (const m of c.moods) bonus += m.boardMod ?? 0;
  return bonus;
}

// ============================================================================
// Stage ladder
// ============================================================================

export interface StageUp {
  from: string;
  to: string;
}

/**
 * Spends full 修为 bars on 初境→中境→圆融 promotions. Stops at 圆融, where the
 * bar simply stays full until 破境 is attempted.
 */
export function settleStageUps(state: GameState): StageUp[] {
  const c = state.character;
  if (!c) return [];
  const def = getRealm(c.realm.realm);
  const ups: StageUp[] = [];

  // Bounded: at most two promotions exist inside a realm.
  for (let guard = 0; guard < 3; guard++) {
    const idx = STAGES.indexOf(c.realm.stage);
    if (idx < 0 || idx >= STAGES.length - 1) break;
    if (c.realm.exp < c.realm.expNeeded) break;
    const before = formatRealm(c.realm);
    c.realm.stage = STAGES[idx + 1] as Character['realm']['stage'];
    c.realm.exp = 0;
    c.realm.expNeeded = def.expPerStage[idx + 1] ?? def.expPerStage[2];
    const after = formatRealm(c.realm);
    ups.push({ from: before, to: after });
    c.maxSpirit = deriveMaxSpirit(c.realm.realm, c.attributes);
    addSpirit(c, Math.round(c.maxSpirit * 0.3));
    say(state, `${before} → ${after}。气脉自行通了一节,汝并未觉得费力。`, 'jade');
  }

  if (
    c.realm.stage === '圆融' &&
    c.realm.exp >= c.realm.expNeeded &&
    !c.flags['圆融待破']
  ) {
    c.flags['圆融待破'] = true;
    note(state, '修为已满,再积无益。当「破境」矣。', 'jade');
  }
  return ups;
}

// ============================================================================
// 修炼
// ============================================================================

export interface CultivateOutcome {
  gained: number;
  spiritSpent: number;
  stageUps: StageUp[];
}

export function cultivate(state: GameState): CultivateOutcome {
  const c = state.character;
  if (!c) return { gained: 0, spiritSpent: 0, stageUps: [] };

  const flavour = roll(state, 'D6', '打谱·情境');
  say(state, pickBy(CULTIVATE_LINES, flavour), 'bamboo');

  const scatter = roll(state, 'D6', '修为·散数');
  const base = speedBreakdown(c).total;
  // The D6 shifts the yield by ±25% around the expectation.
  const gained = Math.max(1, Math.round(base * (0.75 + (scatter - 1) * 0.1)));
  const applied = addExp(c, gained);
  const spiritSpent = -addSpirit(c, -CULTIVATE_SPIRIT_COST);
  // Sitting alone over a board is quiet work; a little dust still settles.
  addDust(c, 1, hasQuietMind(c));

  if (c.studyingId) {
    const manual = getManual(c.studyingId);
    if (manual) note(state, `参《${manual.name.replace(/[《》]/g, '')}》而行,修为 +${applied}。`);
    else note(state, `修为 +${applied}。`);
  } else {
    note(state, `修为 +${applied}。(无谱可参,进境慢些)`);
  }

  const stageUps = settleStageUps(state);
  return { gained: applied, spiritSpent, stageUps };
}

/** 静者 perk lookup without importing the origin table into hot paths. */
export function hasQuietMind(c: Character): boolean {
  return c.flags['静者'] === true;
}

// ============================================================================
// 心境状态 upkeep
// ============================================================================

/** Ticks every mood one turn, applying its per-turn drips and expiring it. */
export function tickMoods(state: GameState): void {
  const c = state.character;
  if (!c) return;
  const survivors: Mood[] = [];
  for (const m of c.moods) {
    if (m.spiritPerTurn) addSpirit(c, m.spiritPerTurn);
    if (m.dustPerTurn) addDust(c, m.dustPerTurn, hasQuietMind(c));
    if (m.turnsLeft < 0) {
      survivors.push(m);
      continue;
    }
    const left = m.turnsLeft - 1;
    if (left > 0) survivors.push({ ...m, turnsLeft: left });
    else note(state, `〔${m.name}〕已散。`);
  }
  c.moods = survivors;
}

/** Adds a mood, replacing any existing one with the same id. */
export function applyMood(state: GameState, mood: Mood): void {
  const c = state.character;
  if (!c) return;
  c.moods = c.moods.filter((m) => m.id !== mood.id);
  c.moods.push({ ...mood });
  note(state, `〔${mood.name}〕${mood.desc}`, mood.kind === 'boon' ? 'jade' : 'dusk');
}

export function clearBurdens(state: GameState): number {
  const c = state.character;
  if (!c) return 0;
  const before = c.moods.length;
  c.moods = c.moods.filter((m) => m.kind !== 'burden');
  const cleared = before - c.moods.length;
  if (cleared > 0) note(state, `心头压着的 ${cleared} 件事,忽然都轻了。`, 'jade');
  return cleared;
}
