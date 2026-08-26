/**
 * breakthrough.ts — 破境, the only real gamble in the game.
 *
 * Three gates must all be open before the dice are even allowed out:
 *   1. 圆融 stage with a full 修为 bar;
 *   2. 棋道 at or above the realm's `chessDaoGate` — you cannot grind past
 *      a wall you do not understand;
 *   3. 心尘 at or below `dustCeiling` — a cluttered mind poisons the attempt.
 *
 * The roll is D100 ≤ chance, where chance is assembled from published terms
 * so the player can do the arithmetic themselves. Failure is expensive but
 * never silently fatal: it burns 修为, floods 心尘 and leaves a 心魔 behind,
 * and it raises a pity counter that makes the next attempt easier.
 */

import { getRealm, nextRealmId } from '@/data/realms';
import { deriveMaxSpirit } from './attributes';
import { applyMood } from './cultivation';
import { addChessDao, addDust, addExp, addSpirit, formatRealm, note, say } from './prose';
import { roll } from './rng';
import type { GameState, RealmId } from './types';
import { MAX_DUST } from './types';

/** Each failed attempt adds this much to the next attempt's chance. */
export const PITY_PER_FAILURE = 7;
export const PITY_CAP = 35;
export const BREAKTHROUGH_SPIRIT_COST = 30;

export interface Gate {
  ok: boolean;
  reason: string | null;
}

export function breakthroughGate(state: GameState): Gate {
  const c = state.character;
  if (!c) return { ok: false, reason: '命格未定。' };
  const def = getRealm(c.realm.realm);
  const next = nextRealmId(c.realm.realm);
  if (!next) return { ok: false, reason: '汝已在最后一境。前面没有路了,也不需要路。' };
  if (c.realm.stage !== '圆融') return { ok: false, reason: `${formatRealm(c.realm)} — 须至圆融方可破境。` };
  if (c.realm.exp < c.realm.expNeeded) {
    return { ok: false, reason: `修为 ${c.realm.exp}/${c.realm.expNeeded},尚未圆满。` };
  }
  if (c.chessDao < def.chessDaoGate) {
    return { ok: false, reason: `棋道 ${c.chessDao} 不足 ${def.chessDaoGate}。看不懂的墙,撞不破。` };
  }
  if (c.dust > def.dustCeiling) {
    return { ok: false, reason: `心尘 ${c.dust} 高于 ${def.dustCeiling}。带着这些东西上路,只会摔得更重。` };
  }
  if (c.spirit < BREAKTHROUGH_SPIRIT_COST) {
    return { ok: false, reason: `心神 ${c.spirit} 不足 ${BREAKTHROUGH_SPIRIT_COST}。先坐忘罢。` };
  }
  return { ok: true, reason: null };
}

export interface ChanceTerms {
  base: number;
  chessDaoBonus: number;
  composureBonus: number;
  dustPenalty: number;
  pity: number;
  itemBonus: number;
  total: number;
}

/** Every term that goes into the D100 threshold, published for the modal. */
export function breakthroughChance(state: GameState): ChanceTerms {
  const c = state.character;
  const zero: ChanceTerms = {
    base: 0, chessDaoBonus: 0, composureBonus: 0, dustPenalty: 0, pity: 0, itemBonus: 0, total: 0,
  };
  if (!c) return zero;
  const def = getRealm(c.realm.realm);
  const base = def.breakthroughBase;
  const chessDaoBonus = Math.round((c.chessDao - def.chessDaoGate) * 0.8);
  const composureBonus = Math.round(c.attributes.xinJing * 1.2);
  const dustPenalty = -Math.round(c.dust * 0.5);
  const pity = Math.min(PITY_CAP, Number(c.flags['破境积怨'] ?? 0) * PITY_PER_FAILURE);
  const itemBonus = Number(c.flags['破境加持'] ?? 0);
  const total = Math.max(3, Math.min(96, base + chessDaoBonus + composureBonus + dustPenalty + pity + itemBonus));
  return { base, chessDaoBonus, composureBonus, dustPenalty, pity, itemBonus, total };
}

export interface BreakthroughOutcome {
  attempted: boolean;
  message: string;
  d100?: number;
  chance?: number;
  success?: boolean;
  /** a 1–3 roll shatters something */
  backlash?: boolean;
  newRealm?: RealmId;
  ending?: string;
}

export function attemptBreakthrough(state: GameState): BreakthroughOutcome {
  const c = state.character;
  if (!c) return { attempted: false, message: '命格未定。' };
  const gate = breakthroughGate(state);
  if (!gate.ok) return { attempted: false, message: gate.reason ?? '不可破境。' };

  const next = nextRealmId(c.realm.realm);
  if (!next) return { attempted: false, message: '汝已在最后一境。' };

  const terms = breakthroughChance(state);
  const from = formatRealm(c.realm);
  say(
    state,
    '汝把棋子一颗一颗收进罐里,而后盘膝坐下。这一次,枰上没有对手,只有汝自己。',
    'moon',
  );
  note(
    state,
    `破境成算 ${terms.total}%(境 ${terms.base} · 棋道 ${signed(terms.chessDaoBonus)} · 心境 ${signed(terms.composureBonus)} · 心尘 ${signed(terms.dustPenalty)} · 积怨 ${signed(terms.pity)}${terms.itemBonus ? ` · 加持 ${signed(terms.itemBonus)}` : ''})`,
  );

  addSpirit(c, -BREAKTHROUGH_SPIRIT_COST);
  c.flags['破境加持'] = 0;

  const d100 = roll(state, 'D100', `破境·${getRealm(next).name}`);
  const success = d100 <= terms.total;

  if (success) {
    const def = getRealm(next);
    c.realm = { realm: next, stage: '初境', exp: 0, expNeeded: def.expPerStage[0] };
    c.lifespan = def.lifespan;
    c.maxSpirit = deriveMaxSpirit(next, c.attributes);
    c.spirit = c.maxSpirit;
    addDust(c, -14);
    addChessDao(c, 2);
    c.flags['破境积怨'] = 0;
    c.flags['圆融待破'] = false;
    state.stats.peakRealmLabel = formatRealm(c.realm);
    if (c.chessDao > state.stats.peakChessDao) state.stats.peakChessDao = c.chessDao;

    say(state, `${from} → ${formatRealm(c.realm)}。`, 'jade');
    say(state, def.desc, 'moon');

    if (next === 'tianren') {
      return {
        attempted: true, message: '天人合一。', d100, chance: terms.total,
        success: true, newRealm: next, ending: 'end_tianren',
      };
    }
    return { attempted: true, message: `已入${def.name}。`, d100, chance: terms.total, success: true, newRealm: next };
  }

  // ---- failure --------------------------------------------------------
  state.stats.breakthroughsFailed += 1;
  c.flags['破境积怨'] = Number(c.flags['破境积怨'] ?? 0) + 1;
  const backlash = d100 >= 97;

  const expLoss = Math.round(c.realm.expNeeded * (backlash ? 0.5 : 0.25));
  addExp(c, -expLoss);
  addSpirit(c, -Math.round(c.maxSpirit * (backlash ? 0.5 : 0.25)));
  const dustGain = backlash ? 26 : 12;
  addDust(c, dustGain);

  if (backlash) {
    say(
      state,
      '气血逆行。汝一口血喷在枰上,黑白子被染成一片,再也分不清哪边是自己。',
      'dusk',
    );
    applyMood(state, {
      id: 'mood_zoehuo',
      name: '走火',
      kind: 'burden',
      turnsLeft: 5,
      speedMult: 0.7,
      boardMod: -3,
      dustPerTurn: 2,
      desc: '心口那处伤,一想棋就疼。',
    });
    addChessDao(c, -3);
  } else {
    say(state, '差一线。汝睁开眼,窗外天已经亮了,而汝还在原处。', 'dusk');
    applyMood(state, {
      id: 'mood_xinmo',
      name: '心魔',
      kind: 'burden',
      turnsLeft: 4,
      speedMult: 0.85,
      breakthroughMod: -2,
      dustPerTurn: 1,
      desc: '一个声音开始反复问汝:是不是到此为止了?',
    });
  }
  note(state, `修为 −${expLoss},心尘 +${dustGain}。下次破境积怨 +${PITY_PER_FAILURE}%。`, 'dusk');

  if (c.dust >= MAX_DUST) {
    return {
      attempted: true, message: '心尘满溢。', d100, chance: terms.total,
      success: false, backlash, ending: 'end_chenman',
    };
  }
  return { attempted: true, message: '破境未成。', d100, chance: terms.total, success: false, backlash };
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
