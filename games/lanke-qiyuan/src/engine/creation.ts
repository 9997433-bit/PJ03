/**
 * creation.ts — 入世四步 (the mandatory 4-step creation gate)
 *
 *   step 0 → ① 名号 (name + 道号)
 *   step 1 → ② 出身 (one of six)
 *   step 2 → ③ 心性分配 (four attributes, 4–10 each, exactly 28)
 *   step 3 → ④ 棋缘抽取 (one D100 + one sealed D100 for the hidden 缘法)
 *   step 4 → playing
 *
 * Steps gate each other: no skipping, no re-rolling. Every public step takes
 * a GameState and returns a NEW GameState; invalid input produces a 棋录 line
 * and leaves the rest untouched. All randomness flows through the audited
 * PRNG, and the 缘法 roll is sealed so 审计 shows it happened but never what
 * it was.
 */

import type {
  Affinity,
  Attributes,
  ChessAffinity,
  Character,
  GameState,
  ItemStack,
  QiYuanGrade,
  QiYuanRow,
} from './types';
import { ALL_AFFINITIES, SAVE_VERSION, START_AGE } from './types';
import { createRngState, roll } from './rng';
import { GENESIS_HASH } from './audit';
import {
  buildAttributes,
  deriveMaxSpirit,
  mapHiddenRollToYuanFa,
  validateAllocation,
  type AllocationInput,
} from './attributes';
import { log, note, say } from './prose';
import { getRealm } from '@/data/realms';
import { ORIGINS, getOrigin } from '@/data/origins';
import { initialSpirits } from '@/data/spirits';
import { STARTING_PLACE } from '@/data/places';

export const DEFAULT_NAME = '无名';
export const DEFAULT_COURTESY = '闲子';

// ============================================================================
// 棋缘 lottery — one D100, drawn once, never again
// ============================================================================

export const QIYUAN_LOTTERY: readonly QiYuanRow[] = [
  {
    min: 1, max: 35, grade: '顽石之缘', affinityCount: 1, speedMultiplier: 0.6, boardBonus: 0,
    blurb: '汝按上枰面,枰无声息。顽石之缘——石亦有寿,只是极慢。这条路,汝要用一生走别人十年的距离。',
  },
  {
    min: 36, max: 60, grade: '蒲柳之缘', affinityCount: 2, speedMultiplier: 0.85, boardBonus: 1,
    blurb: '枰面微温。蒲柳之缘——先秋而落,却也年年再生。资质寻常,胜在不折。',
  },
  {
    min: 61, max: 80, grade: '疏竹之缘', affinityCount: 2, speedMultiplier: 1.05, boardBonus: 2,
    blurb: '指下有节。疏竹之缘——中空而直,能受风,亦能出声。中上之姿。',
  },
  {
    min: 81, max: 92, grade: '苍松之缘', affinityCount: 3, speedMultiplier: 1.3, boardBonus: 3,
    blurb: '一股沉气自枰底涌上。苍松之缘——立于崖上,雪压不弯。世间百人,得此者不过十一。',
  },
  {
    min: 93, max: 97, grade: '流云之缘', affinityCount: 3, speedMultiplier: 1.7, boardBonus: 5,
    blurb: '枰面浮起一层白气,聚而不散。流云之缘——无形无迹,来去自如。此等缘法,一郡难寻。',
  },
  {
    min: 98, max: 99, grade: '明月之缘', affinityCount: 4, speedMultiplier: 2.2, boardBonus: 7,
    blurb: '满室忽明。明月之缘——照见幽微,亦照见己身。百年一遇,诸山皆有耳闻。',
  },
  {
    min: 100, max: 100, grade: '太虚棋缘', affinityCount: 5, speedMultiplier: 3.0, boardBonus: 10,
    blurb: '枰上纵横十九道尽数亮起,自成星图。太虚棋缘——天地以汝为子,汝亦可以天地为枰。此界千年,唯汝一人。',
  },
];

export function lookupQiYuanRow(d100: number): QiYuanRow {
  const row = QIYUAN_LOTTERY.find((r) => d100 >= r.min && d100 <= r.max);
  if (!row) throw new Error(`棋缘天数溢出: ${d100}`);
  return row;
}

/**
 * Pure resolver: maps a D100 to a 棋缘. `draw(n)` must return an index in
 * 0…n−1 and is called once per affinity sub-pick. Exported for tests.
 */
export function resolveChessAffinity(
  d100: number,
  draw: (options: number) => number,
): ChessAffinity {
  const row = lookupQiYuanRow(d100);
  const pool: Affinity[] = [...ALL_AFFINITIES];
  const affinities: Affinity[] = [];
  const wanted = Math.min(row.affinityCount, pool.length);
  for (let i = 0; i < wanted; i++) {
    const at = ((draw(pool.length) % pool.length) + pool.length) % pool.length;
    const picked = pool[at];
    if (picked === undefined) break;
    affinities.push(picked);
    pool.splice(at, 1);
  }
  return {
    grade: row.grade,
    affinities,
    speedMultiplier: row.speedMultiplier,
    boardBonus: row.boardBonus,
    rollValue: d100,
  };
}

export function gradeTone(grade: QiYuanGrade): 'moon' | 'jade' | 'dusk' | 'normal' {
  if (grade === '太虚棋缘' || grade === '明月之缘') return 'moon';
  if (grade === '流云之缘' || grade === '苍松之缘') return 'jade';
  if (grade === '顽石之缘') return 'dusk';
  return 'normal';
}

// ============================================================================
// internal helpers
// ============================================================================

function clone(state: GameState): GameState {
  return typeof structuredClone === 'function'
    ? structuredClone(state)
    : (JSON.parse(JSON.stringify(state)) as GameState);
}

function deny(state: GameState, text: string): GameState {
  const s = clone(state);
  note(s, text);
  return s;
}

// ============================================================================
// entry — a brand-new state in the creation phase
// ============================================================================

export function newGame(seed: string): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: createRngState(seed),
    phase: 'creation',
    creationStep: 0,
    creationDraft: {
      name: DEFAULT_NAME,
      courtesy: DEFAULT_COURTESY,
      originId: null,
      attributes: null,
      chessAffinity: null,
    },
    turn: 0,
    placeId: STARTING_PLACE,
    character: null,
    spirits: initialSpirits(),
    match: null,
    pendingEvent: null,
    narrativeLog: [],
    rolls: [],
    auditHash: GENESIS_HASH,
    nextRollId: 1,
    nextLogId: 1,
    rollSeq: 0,
    seenEvents: [],
    stats: {
      totalRolls: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      gamesWatched: 0,
      placesSeen: 1,
      spiritsBefriended: 0,
      manualsLearned: 0,
      breakthroughsFailed: 0,
      coinEarned: 0,
      peakRealmLabel: '凡尘·初境',
      peakChessDao: 0,
    },
    ending: null,
  };
  say(state, '烂柯山上,两位老人对弈。樵夫在旁看了一局,回头时斧柄已朽。');
  say(state, '世人只记住了斧柄。没人问过,那一局究竟下的是什么。');
  say(state, '今有一人立于宁安县的青石街上,行囊空空。天道执笔,记汝一世。先报名号。');
  return state;
}

// ============================================================================
// step ① 名号
// ============================================================================

export function setIdentity(state: GameState, name: string, courtesy: string): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 0 || !state.creationDraft) {
    return deny(state, state.creationStep > 0 ? '此步已定,不可回溯。' : '此时不当报名。');
  }
  const s = clone(state);
  const draft = s.creationDraft!;
  const trimmedName = name.trim().slice(0, 8);
  const trimmedCourtesy = courtesy.trim().slice(0, 8);
  draft.name = trimmedName.length > 0 ? trimmedName : DEFAULT_NAME;
  draft.courtesy = trimmedCourtesy.length > 0 ? trimmedCourtesy : DEFAULT_COURTESY;
  s.creationStep = 1;
  say(s, `${draft.name},道号${draft.courtesy}。名既已报,便不可改。`);
  say(s, '次问出身。汝从何处来?');
  return s;
}

// ============================================================================
// step ② 出身
// ============================================================================

export function chooseOrigin(state: GameState, originId: string): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 1 || !state.creationDraft) {
    return deny(state, state.creationStep > 1 ? '此步已定,不可回溯。' : '顺序不可乱,先报名号。');
  }
  const origin = getOrigin(originId);
  if (!origin) {
    return deny(state, `无此出身。可选:${ORIGINS.map((o) => o.name).join('／')}`);
  }
  const s = clone(state);
  s.creationDraft!.originId = origin.id;
  s.creationStep = 2;
  say(s, origin.flavor);
  note(s, `出身【${origin.name}】· 禀赋【${origin.perkName}】${origin.perkDesc}`, 'bamboo');
  say(s, '再定心性。四项共二十八分,每项四至十。');
  return s;
}

// ============================================================================
// step ③ 心性分配
// ============================================================================

export function allocateAttributes(state: GameState, alloc: AllocationInput): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 2 || !state.creationDraft?.originId) {
    return deny(state, state.creationStep > 2 ? '此步已定,不可回溯。' : '顺序不可乱,先择出身。');
  }
  const err = validateAllocation(alloc);
  if (err) return deny(state, err);

  const origin = getOrigin(state.creationDraft.originId);
  const attrs = buildAttributes(alloc, origin?.attributeMods ?? {});

  const s = clone(state);
  s.creationDraft!.attributes = attrs;
  s.creationStep = 3;
  say(
    s,
    `心性既定:心境${attrs.xinJing},悟性${attrs.wuXing},才学${attrs.caiXue},气韵${attrs.qiYun}。`,
  );
  say(s, '最后一步。汝面前有一副空枰——按上去。');
  return s;
}

// ============================================================================
// step ④ 棋缘抽取 (+ the sealed 缘法 roll that finalizes the character)
// ============================================================================

export function rollChessAffinity(state: GameState): GameState {
  if (state.phase !== 'creation' || state.creationStep !== 3 || !state.creationDraft?.attributes) {
    return deny(state, state.creationStep > 3 ? '棋缘已定,天不改命。' : '顺序不可乱,先定心性。');
  }
  const s = clone(state);
  const draft = s.creationDraft!;

  say(s, '汝伸手按上枰面。指腹下的木纹忽然烫了一下——');
  const main = roll(s, 'D100', '棋缘抽取');
  const affinity = resolveChessAffinity(main, (options) => roll(s, 'D100', '灵机所钟') % options);
  draft.chessAffinity = affinity;
  say(s, `掷骰:D100 = ${main}。${lookupQiYuanRow(main).blurb}`, gradeTone(affinity.grade));
  note(
    s,
    `棋缘:${affinity.grade} · 灵机【${affinity.affinities.join('·')}】 · 参悟 ×${affinity.speedMultiplier} · 枰上 +${affinity.boardBonus}`,
    'bamboo',
  );

  // The hidden roll: recorded, sealed, never displayed.
  const hidden = roll(s, 'D100', '缘法暗掷', true);
  const yuanFa = mapHiddenRollToYuanFa(hidden);

  const origin = getOrigin(draft.originId!);
  const attributes: Attributes = { ...draft.attributes!, yuanFa };

  const inventory: ItemStack[] = [];
  for (const itemId of origin?.startItems ?? []) {
    const stack = inventory.find((st) => st.itemId === itemId);
    if (stack) stack.count += 1;
    else inventory.push({ itemId, count: 1 });
  }

  const realmDef = getRealm('chen');
  const maxSpirit = deriveMaxSpirit('chen', attributes);
  const character: Character = {
    name: draft.name,
    courtesy: draft.courtesy,
    originId: origin?.id ?? draft.originId!,
    attributes,
    chessAffinity: affinity,
    realm: { realm: 'chen', stage: '初境', exp: 0, expNeeded: realmDef.expPerStage[0] },
    age: START_AGE,
    lifespan: realmDef.lifespan,
    spirit: maxSpirit,
    maxSpirit,
    dust: 0,
    chessDao: origin?.startChessDao ?? 0,
    insight: 0,
    coin: origin?.startCoin ?? 0,
    moods: [],
    inventory,
    manuals: origin?.startManualId ? [origin.startManualId] : [],
    studyingId: origin?.startManualId ?? null,
    visited: [STARTING_PLACE],
    flags: { ...(origin?.startFlags ?? {}) },
  };

  s.creationDraft = null;
  s.creationStep = 4;
  s.phase = 'playing';
  s.turn = 1;
  s.character = character;
  s.stats.peakChessDao = character.chessDao;

  say(s, '而后天道于幕后掷了一枚骰子。汝听见了骰声,看不见点数。');
  say(s, '缘法已定。此后汝遇见谁、错过谁,皆在此一掷之中。');
  log(
    s,
    '天道',
    `${character.name},道号${character.courtesy}。汝的路,自宁安县的这条街上开始。`,
    'moon',
  );
  return s;
}
