/**
 * cultivation.ts — 修炼 / 观棋 / 坐忘.
 *
 * The three quiet actions. None of them can kill you and none of them can
 * fail outright; what varies is how much of the season you get back.
 *
 *   修炼 fills 修为 and costs 心神. Speed is the product of five factors:
 *         realm base × 棋缘 × 悟性 × 棋道 × 棋谱, then moods and 心尘.
 *   观棋 is the 棋道 engine: watching other people play is the only reliable
 *         way to raise it, and it is nearly free.
 *   坐忘 is the release valve: it restores 心神 and sheds 心尘, and at deep
 *         realms it can produce insight on its own.
 */

import type { Character, GameState } from './types';
import { roll } from './rng';
import {
  CULTIVATE_LINES,
  SIT_FORGET_LINES,
  SPECTATE_LINES,
  addChessDao,
  addDust,
  addExp,
  addInsight,
  addSpirit,
  note,
  pickBy,
  say,
} from './prose';
import { getRealm, realmTier } from '@/data/realms';
import { getManual } from '@/data/manuals';
import { getOrigin } from '@/data/origins';

/** Cost of one season of 修炼, before moods. */
export const CULTIVATE_SPIRIT_COST = 12;
export const SPECTATE_SPIRIT_COST = 4;

/** The product of every multiplier that touches 修为 gain. */
export function cultivationSpeed(c: Character): number {
  const manual = c.studyingId ? getManual(c.studyingId) : null;
  const moodMult = c.moods.reduce((m, mood) => m * (mood.speedMult ?? 1), 1);
  // 心尘 bites hardest in the last quarter: at 100 dust you learn at 40%.
  const dustMult = 1 - (c.dust / 100) * 0.6;
  const insightMult = 1 + c.attributes.wuXing * 0.045;
  const daoMult = 1 + c.chessDao * 0.008;
  return (
    c.chessAffinity.speedMultiplier *
    insightMult *
    daoMult *
    (manual?.speedBonus ?? 1) *
    moodMult *
    dustMult
  );
}

/** 修炼 — one season at the board, alone. */
export function cultivate(state: GameState): void {
  const c = state.character;
  if (!c) return;

  const realm = getRealm(c.realm.realm);
  say(state, pickBy(CULTIVATE_LINES, roll(state, 'D6', '修炼·景')));

  if (c.spirit < CULTIVATE_SPIRIT_COST) {
    say(state, '汝坐下了,却一个字也看不进去。神思散得像窗外的雪。', 'dusk');
    note(state, '心神不足,此季空过。宜先坐忘。', 'dusk');
    addDust(c, 4, getOrigin(c.originId)?.perk === 'quietMind');
    return;
  }

  const variance = roll(state, 'D20', '修炼·所得');
  const base = realm.cultivateBase * (0.7 + variance / 40);
  const gained = Math.max(1, Math.round(base * cultivationSpeed(c)));
  const actual = addExp(c, gained);
  addSpirit(c, -CULTIVATE_SPIRIT_COST);

  const manual = c.studyingId ? getManual(c.studyingId) : null;
  if (manual) {
    note(
      state,
      `参${manual.name} · 修为 +${actual}(${c.realm.exp}/${c.realm.expNeeded})`,
      'bamboo',
    );
  } else {
    note(state, `修为 +${actual}(${c.realm.exp}/${c.realm.expNeeded})`, 'bamboo');
  }

  // Long study without company slowly clouds the mind.
  const dust = addDust(c, 2, getOrigin(c.originId)?.perk === 'quietMind');
  if (dust > 0 && c.dust >= 60) note(state, `久坐生尘。心尘 ${c.dust}。`, 'dusk');

  if (c.realm.exp >= c.realm.expNeeded) {
    note(state, `${realm.name}·${c.realm.stage} 已至圆满,可试破境。`, 'jade');
  }
}

// ============================================================================
// 观棋 — the 棋道 engine
// ============================================================================

export interface SpectateOutcome {
  d20: number;
  chessDao: number;
  insight: number;
  exp: number;
}

/** 观棋 — stand at the edge of somebody else's game and say nothing. */
export function spectate(state: GameState): SpectateOutcome {
  const c = state.character;
  if (!c) return { d20: 0, chessDao: 0, insight: 0, exp: 0 };

  say(state, pickBy(SPECTATE_LINES, roll(state, 'D6', '观棋·所遇')));

  const origin = getOrigin(c.originId);
  const d20 = roll(state, 'D20', '观棋·所见');
  // Comprehension decides how much of what you saw you actually keep.
  const quality = d20 + Math.floor(c.attributes.wuXing / 2) - Math.floor(c.dust / 30);

  let daoGain = 1;
  if (quality >= 26) daoGain = 4;
  else if (quality >= 20) daoGain = 3;
  else if (quality >= 14) daoGain = 2;
  if (origin?.perk === 'stoneEar') daoGain = Math.round(daoGain * 1.5);

  // Diminishing returns: the higher your 棋道, the less a street game teaches.
  const tier = Math.floor(c.chessDao / 25);
  daoGain = Math.max(1, daoGain - tier);

  const applied = addChessDao(c, daoGain);
  const exp = Math.round(
    getRealm(c.realm.realm).cultivateBase * 0.35 * (1 + c.attributes.wuXing * 0.03),
  );
  const expApplied = addExp(c, exp);
  addSpirit(c, -SPECTATE_SPIRIT_COST);
  // Watching without playing is the cleanest thing you can do with a season.
  addDust(c, -3);

  let insight = 0;
  if (quality >= 24) {
    insight = 1;
    addInsight(c, 1);
  }

  state.stats.gamesWatched += 1;
  state.stats.peakChessDao = Math.max(state.stats.peakChessDao, c.chessDao);

  if (quality >= 26) {
    say(state, '有一手汝原以为是废棋。回过神来,那是整局的骨。', 'moon');
  } else if (quality >= 20) {
    say(state, '汝看懂了那个转身。心里像有什么东西轻轻挪了一格。');
  } else if (quality >= 14) {
    say(state, '棋不算高明,可有一处收官很干净。');
  } else {
    say(state, '两人下得乱七八糟。汝看了半日,只学到了不该怎么下。');
  }
  note(
    state,
    [
      `棋道 +${applied}(${c.chessDao}/100)`,
      `修为 +${expApplied}`,
      insight > 0 ? `悟 +${insight}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    'bamboo',
  );

  return { d20, chessDao: applied, insight, exp: expApplied };
}

// ============================================================================
// 坐忘 — rest, and at depth, something more
// ============================================================================

/** 坐忘 — sit until you forget that you are sitting. */
export function sitForget(state: GameState): void {
  const c = state.character;
  if (!c) return;

  say(state, pickBy(SIT_FORGET_LINES, roll(state, 'D6', '坐忘·入')));

  const d20 = roll(state, 'D20', '坐忘·深浅');
  const depth = d20 + c.attributes.xinJing + realmTier(c.realm.realm) * 2;

  const spiritGain = Math.round(c.maxSpirit * (0.3 + depth / 120));
  const applied = addSpirit(c, spiritGain);
  const dustShed = -(6 + Math.floor(depth / 3));
  const dust = addDust(c, dustShed);

  // Burdens burn off first; boons are left alone.
  const burdens = c.moods.filter((m) => m.kind === 'burden');
  if (burdens.length > 0 && depth >= 22) {
    const shed = burdens[0]!;
    c.moods = c.moods.filter((m) => m.id !== shed.id);
    note(state, `【${shed.name}】散了。`, 'jade');
  }

  let insight = 0;
  if (depth >= 30 && realmTier(c.realm.realm) >= 2) {
    insight = 1;
    addInsight(c, 1);
    say(state, '在最深处,汝看见了一张空枰。上面没有子,却已是一局。', 'moon');
  } else if (depth >= 24) {
    say(state, '汝坐到日影移过整个屋子,才想起自己坐着。');
  } else {
    say(state, '坐得不算深。杂念来了又走,像门口过路的人。');
  }

  note(
    state,
    [
      `心神 +${applied}(${c.spirit}/${c.maxSpirit})`,
      dust !== 0 ? `心尘 ${dust}(${c.dust})` : '',
      insight > 0 ? `悟 +${insight}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    'jade',
  );
}
