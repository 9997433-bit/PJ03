/**
 * breakthrough.ts — 破境.
 *
 * Advancing a stage inside a realm is quiet bookkeeping. Advancing to the
 * NEXT realm is the only genuinely dangerous thing in the game, and even
 * then it does not kill: failure costs 修为, 心神 and a load of 心尘.
 *
 * Three gates guard the realm jump, and the UI shows all three:
 *   ① 修为 must be full at 圆融;
 *   ② 棋道 must reach the realm's `chessDaoGate`;
 *   ③ 心尘 must sit below the realm's `dustCeiling`.
 * A pity counter softens repeated failures so no run is ever truly stuck.
 */

import type { GameState, RealmId } from './types';
import { STAGES } from './types';
import { roll } from './rng';
import { addDust, addExp, addSpirit, formatRealm, note, say } from './prose';
import { deriveMaxSpirit } from './attributes';
import { getRealm, nextRealmId } from '@/data/realms';

export interface GateStatus {
  expReady: boolean;
  daoReady: boolean;
  dustReady: boolean;
  ready: boolean;
  /** null when advancing a stage rather than a realm */
  nextRealm: RealmId | null;
  chessDaoNeeded: number;
  dustCeiling: number;
  /** the D100 threshold, if an attempt were made right now */
  chance: number;
}

const PITY_FLAG = '破境屡挫';
const BONUS_FLAG = '破境加成';

/** Everything the 破境 panel needs, with no side effects. */
export function breakthroughGates(state: GameState): GateStatus | null {
  const c = state.character;
  if (!c) return null;
  const realm = getRealm(c.realm.realm);
  const next = nextRealmId(c.realm.realm);
  const atFinalStage = c.realm.stage === '圆融';
  const expReady = c.realm.exp >= c.realm.expNeeded;

  if (!atFinalStage) {
    return {
      expReady,
      daoReady: true,
      dustReady: true,
      ready: expReady,
      nextRealm: null,
      chessDaoNeeded: 0,
      dustCeiling: 100,
      chance: 100,
    };
  }

  const daoReady = c.chessDao >= realm.chessDaoGate;
  const dustReady = c.dust <= realm.dustCeiling;
  return {
    expReady,
    daoReady,
    dustReady,
    ready: expReady && daoReady && dustReady && next !== null,
    nextRealm: next,
    chessDaoNeeded: realm.chessDaoGate,
    dustCeiling: realm.dustCeiling,
    chance: breakthroughChance(state),
  };
}

/** The D100 threshold for the realm jump: roll at or under this to pass. */
export function breakthroughChance(state: GameState): number {
  const c = state.character;
  if (!c) return 0;
  const realm = getRealm(c.realm.realm);
  const pity = typeof c.flags[PITY_FLAG] === 'number' ? (c.flags[PITY_FLAG] as number) : 0;
  const bonus = typeof c.flags[BONUS_FLAG] === 'number' ? (c.flags[BONUS_FLAG] as number) : 0;
  const moodMod = c.moods.reduce((sum, m) => sum + (m.breakthroughMod ?? 0), 0);

  let chance = realm.breakthroughBase;
  chance += Math.floor((c.chessDao - realm.chessDaoGate) * 0.35);
  chance += Math.floor(c.attributes.xinJing * 1.2);
  chance += Math.floor(c.attributes.wuXing * 0.8);
  chance -= Math.floor(c.dust * 0.4);
  chance += pity * 8;
  chance += bonus;
  chance += moodMod;
  return Math.max(5, Math.min(95, Math.round(chance)));
}

/** Move up one stage inside the current realm. */
function advanceStage(state: GameState): void {
  const c = state.character!;
  const realm = getRealm(c.realm.realm);
  const at = STAGES.indexOf(c.realm.stage);
  const nextStage = STAGES[at + 1]!;
  c.realm.stage = nextStage;
  c.realm.exp = 0;
  c.realm.expNeeded = realm.expPerStage[at + 1] ?? realm.expPerStage[2];
  state.stats.peakRealmLabel = formatRealm(c.realm);
  say(state, `心中一处松了。${realm.name}·${nextStage}。`, 'jade');
  note(state, `境界:${formatRealm(c.realm)} · 修为 0/${c.realm.expNeeded}`, 'jade');
}

/** 破境 — the single entry point for both kinds of advancement. */
export function attemptBreakthrough(state: GameState): void {
  const c = state.character;
  if (!c) return;

  const realm = getRealm(c.realm.realm);
  const gates = breakthroughGates(state)!;

  if (!gates.expReady) {
    note(state, `修为未满(${c.realm.exp}/${c.realm.expNeeded}),不可强求。`, 'dusk');
    return;
  }

  if (gates.nextRealm === null && c.realm.stage !== '圆融') {
    advanceStage(state);
    return;
  }

  const next = gates.nextRealm;
  if (!next) {
    say(state, '汝已在此道尽头。再往上,便不是「境界」二字管得着的了。', 'moon');
    return;
  }
  if (!gates.daoReady) {
    note(state, `棋道未足(${c.chessDao}/${gates.chessDaoNeeded})。多去观棋、对弈。`, 'dusk');
    return;
  }
  if (!gates.dustReady) {
    note(state, `心尘过重(${c.dust} > ${gates.dustCeiling})。先坐忘几季罢。`, 'dusk');
    return;
  }

  const nextDef = getRealm(next);
  say(state, `汝铺开棋枰,却不落子。这一局,对手是${realm.name}的自己。`, 'moon');

  const chance = breakthroughChance(state);
  const d100 = roll(state, 'D100', `破境·${realm.name}→${nextDef.name}`);
  note(state, `掷骰:D100 = ${d100} / 门限 ${chance}`, 'muted');

  if (d100 <= chance) {
    c.realm.realm = next;
    c.realm.stage = '初境';
    c.realm.exp = 0;
    c.realm.expNeeded = nextDef.expPerStage[0];
    c.lifespan = nextDef.lifespan;
    c.maxSpirit = deriveMaxSpirit(next, c.attributes);
    addSpirit(c, c.maxSpirit);
    c.flags[PITY_FLAG] = 0;
    c.flags[BONUS_FLAG] = 0;
    state.stats.peakRealmLabel = formatRealm(c.realm);
    say(state, `枰上无声,心里落了一子。${nextDef.name}。`, 'moon');
    say(state, nextDef.desc, 'jade');
    note(
      state,
      `境界:${formatRealm(c.realm)} · 寿元 ${c.lifespan} · 心神上限 ${c.maxSpirit}`,
      'jade',
    );
    return;
  }

  // Failure: expensive, never fatal.
  const pity = typeof c.flags[PITY_FLAG] === 'number' ? (c.flags[PITY_FLAG] as number) : 0;
  c.flags[PITY_FLAG] = pity + 1;
  c.flags[BONUS_FLAG] = 0;
  state.stats.breakthroughsFailed += 1;

  const expLoss = -Math.round(c.realm.expNeeded * (0.2 + roll(state, 'D20', '破境·退') / 100));
  const lost = addExp(c, expLoss);
  const spiritLoss = addSpirit(c, -Math.round(c.maxSpirit * 0.35));
  const dustGain = addDust(c, 14);

  say(state, '差了一手。就那一手,汝这些年一直没算清。', 'dusk');
  note(state, `修为 ${lost} · 心神 ${spiritLoss} · 心尘 +${dustGain} · 下次门限 +8`, 'dusk');
}
