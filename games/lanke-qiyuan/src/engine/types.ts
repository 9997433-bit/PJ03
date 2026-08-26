/**
 * 《烂柯棋缘·人生模拟器》 — 核心数据模型
 *
 * PURE TypeScript. Nothing under src/engine/ may import React or touch a
 * browser API. Every rule is a pure function `(state, input) → state'`, and
 * every random outcome flows through the audited dice gateway (rng.ts).
 *
 * The world model differs from a combat xianxia sim on purpose: there is no
 * hit-point attrition loop. A life here is measured in 心神 (composure),
 * 心尘 (accumulated worldly dust) and 棋道 (insight won over the board).
 */

// ============================================================================
// Dice & audit
// ============================================================================

export type Die = 'D100' | 'D20' | 'D6';

export interface DiceRoll {
  /** monotonic sequence id */
  id: number;
  turn: number;
  die: Die;
  value: number;
  /** e.g. "棋缘抽取", "弈道·第三手", "游历遇事" */
  reason: string;
  /** PRNG state snapshot BEFORE the roll (audit / replay) */
  seedState: string;
  /** 暗掷 — the audit shows the roll happened, never its value */
  sealed?: boolean;
}

// ============================================================================
// 五心 — the attribute model
// ============================================================================

export interface Attributes {
  /** 心境 composure — resists 心尘, gates 坐忘 depth */
  xinJing: number;
  /** 悟性 comprehension — cultivation speed, insight from watching */
  wuXing: number;
  /** 才学 scholarship — reading manuals, calligraphy, talking to spirits */
  caiXue: number;
  /** 气韵 bearing — how spirits and people take to you */
  qiYun: number;
  /** 缘法 affinity — HIDDEN. Never rendered on any panel. */
  yuanFa: number;
}

export type VisibleAttribute = Exclude<keyof Attributes, 'yuanFa'>;

export const VISIBLE_ATTRIBUTES: readonly VisibleAttribute[] = [
  'xinJing',
  'wuXing',
  'caiXue',
  'qiYun',
];

export const ATTRIBUTE_LABELS: Record<keyof Attributes, string> = {
  xinJing: '心境',
  wuXing: '悟性',
  caiXue: '才学',
  qiYun: '气韵',
  yuanFa: '缘法',
};

// ============================================================================
// 棋缘 — this game's spirit-root analogue, drawn once with a D100
// ============================================================================

/** 灵机 — the seven affinities a 棋缘 may carry */
export type Affinity = '松' | '竹' | '云' | '水' | '石' | '月' | '风';

export const ALL_AFFINITIES: readonly Affinity[] = ['松', '竹', '云', '水', '石', '月', '风'];

export type QiYuanGrade =
  | '顽石之缘'
  | '蒲柳之缘'
  | '疏竹之缘'
  | '苍松之缘'
  | '流云之缘'
  | '明月之缘'
  | '太虚棋缘';

export interface ChessAffinity {
  grade: QiYuanGrade;
  affinities: Affinity[];
  /** multiplies 修为 gain — 顽石 0.6 … 太虚 3.0 */
  speedMultiplier: number;
  /** flat bonus to 弈道 rolls */
  boardBonus: number;
  /** the D100 that produced it */
  rollValue: number;
}

export interface QiYuanRow {
  min: number;
  max: number;
  grade: QiYuanGrade;
  affinityCount: number;
  speedMultiplier: number;
  boardBonus: number;
  blurb: string;
}

// ============================================================================
// 境界 — the ladder is contemplative, not martial
// ============================================================================

export type RealmId =
  | 'chen'      // 凡尘 — an ordinary person who merely plays well
  | 'mingxin'   // 明心 — the mind quiets; qi becomes perceptible
  | 'yangqi'    // 养气 — breath and board move as one
  | 'tongxuan'  // 通玄 — the unseen world answers when addressed
  | 'zuowang'   // 坐忘 — self forgotten, the game plays itself
  | 'xiaoyao'   // 逍遥 — no board, no stones, no opponent
  | 'tianren';  // 天人 — 天人合一, the last rung

export type Stage = '初境' | '中境' | '圆融';

export const STAGES: readonly Stage[] = ['初境', '中境', '圆融'];

export interface RealmState {
  realm: RealmId;
  stage: Stage;
  /** progress toward the next stage */
  exp: number;
  expNeeded: number;
}

export interface RealmDef {
  id: RealmId;
  name: string;
  /** 寿元 granted on entering this realm (years) */
  lifespan: number;
  /** exp wall per stage: [初境→中境, 中境→圆融, 圆融 wall before 突破] */
  expPerStage: [number, number, number];
  /** 心神 ceiling at this realm */
  spiritBase: number;
  /** base 修为 per 修炼 turn */
  cultivateBase: number;
  /** base D100 chance for the 突破 INTO the next realm */
  breakthroughBase: number;
  /** 棋道 required before the 突破 is even permitted */
  chessDaoGate: number;
  /** 心尘 above this poisons the attempt */
  dustCeiling: number;
  desc: string;
}

// ============================================================================
// 心境状态 — buffs and burdens, all reversible
// ============================================================================

export interface Mood {
  id: string;
  name: string;
  kind: 'boon' | 'burden';
  /** -1 = lasts until dispelled */
  turnsLeft: number;
  /** multiplies 修为 gain (1 = neutral) */
  speedMult?: number;
  /** flat modifier on 弈道 rolls */
  boardMod?: number;
  /** flat modifier on 突破 rolls */
  breakthroughMod?: number;
  /** 心神 change applied every turn */
  spiritPerTurn?: number;
  /** 心尘 change applied every turn */
  dustPerTurn?: number;
  desc: string;
}

// ============================================================================
// Character
// ============================================================================

export interface ItemStack {
  itemId: string;
  count: number;
}

export interface Character {
  name: string;
  /** 道号 — chosen at creation, used by spirits */
  courtesy: string;
  originId: string;
  attributes: Attributes;
  chessAffinity: ChessAffinity;
  realm: RealmState;
  age: number;
  lifespan: number;
  /** 心神 — composure. Never lethal on its own; 0 forces 坐忘. */
  spirit: number;
  maxSpirit: number;
  /** 心尘 0–100 — worldly dust. High dust blocks 突破 and sours events. */
  dust: number;
  /** 棋道 0–100 — the through-line of the whole game */
  chessDao: number;
  /** 悟 — spendable insight, earned by 观棋 and 弈道 */
  insight: number;
  /** 银钱 */
  coin: number;
  moods: Mood[];
  inventory: ItemStack[];
  /** learned 棋谱 ids */
  manuals: string[];
  /** the 棋谱 currently being studied (drives cultivation flavour + bonus) */
  studyingId: string | null;
  /** locations already visited at least once */
  visited: string[];
  /** free-form story flags */
  flags: Record<string, boolean | number>;
}

// ============================================================================
// 山精鬼怪 — the spirit register
// ============================================================================

export interface SpiritThreshold {
  at: number;
  /** what crossing this favour mark unlocks */
  unlock: string;
  /** granted once, when the mark is first crossed */
  gift?: { itemId?: string; insight?: number; chessDao?: number; coin?: number };
}

export interface SpiritBeing {
  id: string;
  name: string;
  /** 山精 / 鬼 / 灵 / 神 */
  kind: '山精' | '鬼魅' | '器灵' | '水族' | '狐仙' | '神祇';
  title: string;
  /** -50 … 100 */
  favor: number;
  /** the location where the being may be met */
  home: string;
  /** which realm you must reach before they will show themselves */
  minRealm: RealmId;
  thresholds: SpiritThreshold[];
  desc: string;
  /** set at runtime once first met */
  met?: boolean;
  /** thresholds already announced */
  crossed?: number[];
}

// ============================================================================
// Content — items, manuals, places
// ============================================================================

export type ItemKind = 'tea' | 'brush' | 'manual' | 'charm' | 'curio' | 'food' | 'stone' | 'gift';

export interface ItemEffect {
  spirit?: number;
  dust?: number;
  exp?: number;
  chessDao?: number;
  insight?: number;
  coin?: number;
  /** one-shot bonus applied to the next 突破 */
  breakthroughBonus?: number;
  attribute?: [keyof Attributes, number];
  mood?: Mood;
  /** clears all 'burden' moods */
  clearBurdens?: boolean;
  lifespan?: number;
  teachManual?: string;
  flag?: [string, boolean | number];
  /** favour granted to a named spirit when gifted */
  giftFavor?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** 1 常品 … 5 神品 */
  grade: 1 | 2 | 3 | 4 | 5;
  price: number;
  desc: string;
  effect?: ItemEffect;
  /** consumables vanish on use; curios stay in the satchel */
  consumable?: boolean;
  /** market stock gate */
  minRealm?: RealmId;
  /** never appears in the market */
  hidden?: boolean;
}

export interface ManualDef {
  id: string;
  name: string;
  /** 残谱 / 古谱 / 名谱 / 天谱 */
  tier: '残谱' | '古谱' | '名谱' | '天谱';
  /** insight cost to comprehend */
  insightCost: number;
  minChessDao: number;
  /** multiplies 修为 gain while studied */
  speedBonus: number;
  /** flat 弈道 bonus while studied */
  boardBonus: number;
  desc: string;
}

export interface PlaceDef {
  id: string;
  name: string;
  minRealm: RealmId;
  /** travel cost in 银钱 */
  fare: number;
  desc: string;
  /** event ids weighted toward this place */
  eventTags: string[];
}

// ============================================================================
// 游历事件
// ============================================================================

export type EventBucket = '波折' | '寻常' | '际遇' | '奇遇';

export interface EventCheck {
  attr: keyof Attributes;
  /** D20 + attr vs DC */
  dc: number;
}

export interface EventEffect {
  narrative: string;
  exp?: number;
  spirit?: number;
  dust?: number;
  chessDao?: number;
  insight?: number;
  coin?: number;
  items?: ItemStack[];
  /** [spiritId, delta] */
  favor?: [string, number];
  mood?: Mood;
  flag?: [string, boolean | number];
  attribute?: [keyof Attributes, number];
  teachManual?: string;
  /** opens a 弈道 match against the named opponent */
  match?: string;
  /** the life closes here */
  ending?: string;
}

export interface EventChoice {
  text: string;
  check?: EventCheck;
  /** shown under the option, e.g. "才学 · 难度 14" */
  hint?: string;
  success: EventEffect;
  failure?: EventEffect;
}

export interface GameEvent {
  id: string;
  name: string;
  bucket: EventBucket;
  /** realms in which the event may fire */
  realms: RealmId[];
  weight: number;
  /** place ids; empty = anywhere */
  places: string[];
  tags: string[];
  narrative: string;
  /** hidden 缘法 gate */
  minYuanFa?: number;
  minChessDao?: number;
  requiresFlag?: string;
  once?: boolean;
  choices?: EventChoice[];
  autoEffect?: EventEffect;
}

export interface PendingEvent {
  eventId: string;
  name: string;
  narrative: string;
  choices: { text: string; hint?: string }[];
}

// ============================================================================
// 弈道 — the game's conflict system. No blood, only 目数.
// ============================================================================

/** 棋风 — the five ways to answer a move */
export type BoardStyle = '稳守' | '急攻' | '弃子' | '试探' | '封盘';

export interface OpponentDef {
  id: string;
  name: string;
  title: string;
  /** difficulty of each exchange */
  strength: number;
  /** how many exchanges the match runs */
  hands: number;
  /** the style this opponent punishes hardest */
  counters: BoardStyle;
  /** the style this opponent handles poorly */
  weakTo: BoardStyle;
  stake: number;
  minRealm: RealmId;
  /** spirit id whose favour rises on a good game */
  spiritId?: string;
  intro: string;
  /** said when they resign */
  onLoss: string;
  /** said when you resign */
  onWin: string;
  /** rewards on a win, beyond the stake */
  reward?: { chessDao?: number; insight?: number; exp?: number; itemId?: string };
}

export interface MatchState {
  opponentId: string;
  /** current hand (1-based) */
  hand: number;
  hands: number;
  /** 目数 differential; positive means you lead */
  margin: number;
  /** 先手 — earned by 试探, spent by the next 急攻 */
  initiative: boolean;
  /** 劫争 — a running ko fight doubles the next exchange */
  ko: boolean;
  log: string[];
  over: boolean;
  result?: 'win' | 'loss' | 'draw' | 'resigned';
}

// ============================================================================
// Endings
// ============================================================================

export interface EndingDef {
  id: string;
  title: string;
  /** rank shown on the scroll */
  rank: '天' | '地' | '玄' | '黄';
  closing: string;
  /** narrative epitaph */
  epitaph: string;
}

export interface EndingResult {
  id: string;
  title: string;
  rank: '天' | '地' | '玄' | '黄';
  closing: string;
  epitaph: string;
  summary: string[];
}

// ============================================================================
// Narrative log
// ============================================================================

export type LogTone = 'normal' | 'jade' | 'bamboo' | 'dusk' | 'muted' | 'moon';

export type Speaker = '天道' | '棋录' | '弈' | '汝';

export interface LogEntry {
  id: number;
  turn: number;
  speaker: Speaker;
  text: string;
  tone?: LogTone;
}

// ============================================================================
// Creation
// ============================================================================

/** 0 名号 → 1 出身 → 2 心性分配 → 3 棋缘抽取 → 4 (done, playing) */
export type CreationStep = 0 | 1 | 2 | 3 | 4;

export interface CreationDraft {
  name: string;
  courtesy: string;
  originId: string | null;
  attributes: Pick<Attributes, VisibleAttribute> | null;
  chessAffinity: ChessAffinity | null;
}

export interface OriginDef {
  id: string;
  name: string;
  desc: string;
  /** the line 天道 speaks when the origin is chosen */
  flavor: string;
  attributeMods: Partial<Record<VisibleAttribute, number>>;
  startCoin: number;
  startItems: string[];
  startManualId?: string;
  startChessDao: number;
  startFlags?: Record<string, boolean | number>;
  perk:
    | 'quietMind'    // 静者: 心尘 accrues 25% slower
    | 'wideRead'     // 博览: 棋谱 insight costs −30%
    | 'openHand'     // 疏财: spirits warm to you faster
    | 'roadWise'     // 行脚: travel fares halved, one extra travel event roll
    | 'brushBorn'    // 笔生: 才学 checks +2
    | 'stoneEar';    // 听子: 观棋 yields more 棋道
  perkName: string;
  perkDesc: string;
}

// ============================================================================
// Commands
// ============================================================================

export type Command =
  | { kind: 'cultivate' }                                  // 修炼
  | { kind: 'travel'; placeId?: string }                   // 游历
  | { kind: 'spectate' }                                   // 观棋
  | { kind: 'sitForget' }                                  // 坐忘
  | { kind: 'match'; opponentId?: string }                 // 弈道 (open the board)
  | { kind: 'play'; style: BoardStyle }                    // one exchange
  | { kind: 'resign' }                                     // 投子
  | { kind: 'market' }                                     // 坊市
  | { kind: 'buy'; itemId: string; count?: number }
  | { kind: 'sell'; itemId: string; count?: number }
  | { kind: 'use'; itemId: string }
  | { kind: 'gift'; spiritId: string; itemId: string }
  | { kind: 'study'; manualId: string }                    // 参谱
  | { kind: 'learn'; manualId: string }                    // 悟谱 (spend 悟)
  | { kind: 'breakthrough' }                               // 破境
  | { kind: 'eventChoice'; choiceIndex: number }
  | { kind: 'panel' }
  | { kind: 'satchel' }
  | { kind: 'register' }                                   // 精怪录
  | { kind: 'audit' }                                      // 审计
  | { kind: 'unknown'; raw: string };

// ============================================================================
// Top-level state
// ============================================================================

export const SAVE_VERSION = 1;
export const LOG_CAP = 300;
export const ROLL_CAP = 500;
/** one turn is a season */
export const TURNS_PER_YEAR = 4;
export const START_AGE = 19;
export const MAX_DUST = 100;
export const MAX_CHESS_DAO = 100;

export type Phase = 'creation' | 'playing' | 'match' | 'ended';

export interface LifeStats {
  totalRolls: number;
  matchesPlayed: number;
  matchesWon: number;
  gamesWatched: number;
  placesSeen: number;
  spiritsBefriended: number;
  manualsLearned: number;
  breakthroughsFailed: number;
  coinEarned: number;
  peakRealmLabel: string;
  peakChessDao: number;
}

export interface GameState {
  version: number;
  seed: string;
  rngState: string;
  phase: Phase;
  creationStep: CreationStep;
  creationDraft: CreationDraft | null;
  turn: number;
  /** where you currently stand */
  placeId: string;
  character: Character | null;
  spirits: Record<string, SpiritBeing>;
  match: MatchState | null;
  pendingEvent: PendingEvent | null;
  narrativeLog: LogEntry[];
  rolls: DiceRoll[];
  auditHash: string;
  nextRollId: number;
  nextLogId: number;
  rollSeq: number;
  /** events already fired (for `once`) */
  seenEvents: string[];
  /**
   * An ending named by an event effect. The single writer consumes this once
   * the command has fully resolved, so a closing screen never lands mid-turn.
   */
  pendingEnding?: string;
  stats: LifeStats;
  ending: EndingResult | null;
}
