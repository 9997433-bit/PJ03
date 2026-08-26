/**
 * endings.ts — 终章判定
 *
 * Every ending id in `data/endings.ts` is awarded from exactly one place in
 * this file. There are no data-only endings: `ENDING_TRIGGERS` below is the
 * machine-readable proof, and `dataIntegrity.test.ts` fails the build if the
 * two lists ever drift apart.
 *
 * Order matters. Scripted deaths outrank ordinary ones, ordinary deaths outrank
 * 天诛, and the voluntary exits are only consulted when the character asked to
 * leave — which is why 归隐 can produce four different endings depending on
 * what the ledger says about the life being closed.
 */

import { endingById, ENDINGS } from '@/data/endings';
import { enemyById } from '@/data/enemies';
import { realmDef } from '@/data/realms';
import { realmLabel } from './cultivation';
import type { EndingResult, GameState, RunStats } from './types';

/** id → the condition that awards it. Kept beside the code that checks it. */
export const ENDING_TRIGGERS: Record<string, string> = {
  changsheng: '踏入长生境',
  tulu_chushi: '三卷合一且习得《灭运真解》后踏入长生',
  daotong: '元神以上且门派声望登顶',
  shouyuan: '年岁逾寿数',
  zhanwang: '斗法气血归零',
  posui: '突破失手,气机崩于关中',
  tianzhu: '劫运满盈,或败于任一劫相',
  zouhuo: '修炼走火,气血归零',
  xinmo: '败于心魔虚影',
  duoyun_mo: '灭运十二次以上且功德低于 −150',
  gongde_yuanman: '归隐时功德 ≥ 400',
  guiyin: '归隐时无其他条件命中',
  wulu: '气运与劫运俱近于零',
  jieyu_daoshi: '归隐时历劫(渡过+化解)≥ 10',
};

export function buildStats(state: GameState): RunStats {
  const c = state.character!;
  return {
    ...state.stats,
    turns: state.turn,
    years: c.age - 16,
    peakRealm: state.stats.peakRealm,
    peakRealmLabel:
      realmDef(c.realm.realm).order >= realmDef(state.stats.peakRealm).order
        ? realmLabel(c.realm)
        : state.stats.peakRealmLabel,
    peakCalamity: Math.max(state.stats.peakCalamity, c.calamity.peak),
    peakFortune: Math.max(state.stats.peakFortune, c.fortune),
    merit: c.merit,
    calamitiesSurvived: c.calamity.survived,
    calamitiesDissolved: c.calamity.dissolved,
    extinguished: c.extinguishCount,
  };
}

export function makeEnding(state: GameState, id: string): EndingResult {
  const def = endingById(id) ?? endingById('shouyuan')!;
  return {
    id: def.id,
    title: def.title,
    kind: def.kind,
    summary: def.summary,
    closing: def.closing,
    stats: buildStats(state),
  };
}

/**
 * The one place a run can end. Returns `null` when the story continues.
 * `retiring` is set only by the 归隐 command.
 */
export function checkEndings(state: GameState, retiring = false): EndingResult | null {
  const c = state.character;
  if (!c || state.ending) return null;
  const order = realmDef(c.realm.realm).order;
  const trials = c.calamity.survived + c.calamity.dissolved;

  if (typeof c.flags.scriptedDeath === 'string') {
    return makeEnding(state, c.flags.scriptedDeath);
  }

  if (c.hp <= 0) {
    if (c.flags.zouhuoFatal) return makeEnding(state, 'zouhuo');
    if (c.flags.breakFatal) return makeEnding(state, 'posui');
    if (c.flags.slainBy === 'xinmo') return makeEnding(state, 'xinmo');
    // 天雷法相 and 业火魔相 are 劫数所化 no less than 天诛神使 is. Naming only the
    // last of them made a death under the lightning read as 陨于斗法 — "someone
    // out-calculated you" — when nobody was there at all.
    const slayer = enemyById(String(c.flags.slainBy ?? ''));
    if (slayer?.isCalamity) return makeEnding(state, 'tianzhu');
    return makeEnding(state, 'zhanwang');
  }

  if (c.calamity.value >= 100) return makeEnding(state, 'tianzhu');

  if (c.realm.realm === 'changsheng') {
    const awakened = Boolean(c.flags.tuluAwake) && c.learned.includes('tulu3n');
    return makeEnding(state, awakened ? 'tulu_chushi' : 'changsheng');
  }

  if (order >= 4 && c.sectRankIndex >= 3) return makeEnding(state, 'daotong');

  if (c.extinguishCount >= 12 && c.merit <= -150) return makeEnding(state, 'duoyun_mo');

  if (c.age > c.lifespan) return makeEnding(state, 'shouyuan');

  if (order >= 2 && c.fortune <= 2 && c.calamity.value <= 3 && state.turn >= 25) {
    return makeEnding(state, 'wulu');
  }

  if (retiring) {
    if (c.merit >= 400) return makeEnding(state, 'gongde_yuanman');
    if (trials >= 10) return makeEnding(state, 'jieyu_daoshi');
    if (c.fortune <= 8 && c.calamity.value <= 10) return makeEnding(state, 'wulu');
    return makeEnding(state, 'guiyin');
  }

  return null;
}

/** Is the voluntary exit available yet? */
export function canRetire(state: GameState): string | null {
  const c = state.character;
  if (!c) return '尚未入世。';
  if (realmDef(c.realm.realm).order < 2) return '未通玄者,归隐与凡人无异。';
  if (state.turn < 15) return '入世未久,言归太早。';
  return null;
}

export const ALL_ENDING_IDS: readonly string[] = ENDINGS.map((e) => e.id);
