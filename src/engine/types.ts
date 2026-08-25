/**
 * 《凡人修仙传·人生模拟器》 — 核心数据模型
 *
 * PURE TypeScript. This file (and everything under src/engine/) must never
 * import React or touch browser APIs. Every game rule is a pure function
 * `(state, input) → state'`; all randomness flows through the audited dice
 * engine (rng.ts + audit.ts).
 */

// ============================================================================
// Dice & Audit
// ============================================================================

export type Die = 'D100' | 'D20' | 'D6';

export interface DiceRoll {
  /** monotonic sequence id */
  id: number;
  turn: number;
  die: Die;
  value: number;
  /** e.g. "灵根抽取", "突破·筑基", "遭遇事件" */
  reason: string;
  /** PRNG state snapshot BEFORE the roll (audit/replay) */
  seedState: string;
  /**
   * Sealed rolls (天机暗掷) happened — the audit view must show the roll
   * occurred but never display its value or mapping.
   */
  sealed?: boolean;
}

// ============================================================================
// Attributes (五维)
// ============================================================================

export interface Attributes {
  /** 根骨 constitution — HP, breakthrough success */
  genGu: number;
  /** 悟性 comprehension — cultivation speed, technique learning, alchemy */
  wuXing: number;
  /** 心性 temperament — heart-demon resistance, event options */
  xinXing: number;
  /** 机缘 fortune — HIDDEN. Never shown on any panel or serialized into UI text. */
  jiYuan: number;
  /** 气运 luck — event table shift, loot quality, flee chance */
  qiYun: number;
}

export type VisibleAttribute = Exclude<keyof Attributes, 'jiYuan'>;

// ============================================================================
// Spirit Root (灵根)
// ============================================================================

export type Element = '金' | '木' | '水' | '火' | '土';
export type MutantElement = '雷' | '冰' | '风';
export type AnyElement = Element | MutantElement;

export type SpiritRootGrade =
  | '天灵根'
  | '异灵根'
  | '真灵根'
  | '双灵根'
  | '三灵根'
  | '四灵根'
  | '五灵根';

export interface SpiritRoot {
  grade: SpiritRootGrade;
  elements: AnyElement[];
  /** 天灵根 3.0 … 五灵根(伪灵根) 0.5 */
  speedMultiplier: number;
  /** the D100 that produced it */
  rollValue: number;
}

export interface SpiritRootTableEntry {
  min: number;
  max: number;
  grade: SpiritRootGrade;
  elementCount: number;
  speedMultiplier: number;
  /** mutant grades draw from 雷/冰/风 instead of the five elements */
  mutant?: boolean;
  /** short flavor shown at reveal */
  blurb: string;
}

// ============================================================================
// Realm (境界)
// ============================================================================

export type RealmId = 'mortal' | 'qi' | 'foundation' | 'core' | 'nascent' | 'deity';
export type Stage = '初期' | '中期' | '后期' | '大圆满';

export const STAGES: readonly Stage[] = ['初期', '中期', '后期', '大圆满'];

export interface RealmState {
  realm: RealmId;
  /** 炼气 1–13 (0 outside qi refining) */
  qiLayer: number;
  /** for 筑基 and above */
  stage: Stage;
  /** progress toward next layer/stage */
  exp: number;
  expNeeded: number;
}

export interface RealmDef {
  id: RealmId;
  name: string;
  /** absolute lifespan granted upon entering this realm (years) */
  lifespan: number;
  /** qi refining: 13 */
  layers?: number;
  stages?: Stage[];
  /**
   * exp needed per level-up. For qi: index 0 = exp to go 1层→2层 …
   * For staged realms: index 0 = 初期→中期, 1 = 中期→后期, 2 = 后期→大圆满,
   * 3 = exp wall of 大圆满 (must fill before 突破 is allowed).
   */
  baseExpPerLevel: number[];
  /** base combat power of the realm */
  powerBase: number;
  /** base max-HP of the realm */
  hpBase: number;
  /** base 修炼 exp gained per turn at this realm */
  cultivateExpBase: number;
  /** base D100 chance for the MAJOR breakthrough INTO the NEXT realm */
  breakthroughBaseChance: number;
  /** DC of the 心魔 trial guarding the major breakthrough out of this realm */
  heartDemonDC: number;
  failurePenalty: {
    /** fraction of current exp lost, rolled between min and max */
    expLossMin: number;
    expLossMax: number;
    /** D100 ≤ chance ⇒ injured */
    injuryChance: number;
    /** D100 ≤ chance ⇒ 身死道消 (金丹 and above) */
    deathChance: number;
  };
}

// ============================================================================
// Status Effects (状态) — buffs, debuffs, insights, curses
// ============================================================================

export interface StatusEffect {
  id: string;
  name: string;
  kind: 'buff' | 'debuff';
  /** -1 = permanent until cured */
  turnsLeft: number;
  /** multiplies cultivation exp gain (1 = neutral) */
  speedMult?: number;
  /** flat combat power modifier */
  powerMod?: number;
  /** flat modifier to breakthrough chance */
  breakthroughMod?: number;
  /** hp change applied every turn */
  hpPerTurn?: number;
  desc: string;
}

export interface Injury {
  id: string;
  name: string;
  severity: 1 | 2 | 3;
  /** -1 = permanent until cured (e.g. 道基受损) */
  turnsLeft: number;
  effect: {
    /** multiplies cultivation speed (e.g. 0.7) */
    speedMult?: number;
    /** flat power penalty */
    powerMod?: number;
    /** flat breakthrough chance penalty */
    breakthroughMod?: number;
  };
}

// ============================================================================
// Character
// ============================================================================

export interface EquippedGear {
  weapon?: string;
  armor?: string;
  accessory?: string;
}

export interface Character {
  name: string;
  gender: '男' | '女';
  originId: string;
  attributes: Attributes;
  spiritRoot: SpiritRoot;
  realm: RealmState;
  age: number;
  /** 寿元 grows with realm */
  lifespan: number;
  hp: number;
  maxHp: number;
  injuries: Injury[];
  statusEffects: StatusEffect[];
  /** equipped 功法 */
  techniqueId: string | null;
  /** learned 战斗术法 (item/technique ids) */
  combatArts: string[];
  /** 灵石 */
  spiritStones: number;
  inventory: ItemStack[];
  equipped: EquippedGear;
  /** 宗门 membership */
  sectId: string | null;
  /**
   * one-shot bonus to the next 突破 attempt (from pills such as 筑基丹);
   * consumed whether the attempt succeeds or fails.
   */
  breakthroughBonus: number;
  /** story/event flags — includes per-gate failure pity counters */
  flags: Record<string, boolean | number>;
}

// ============================================================================
// Content types (src/data/**)
// ============================================================================

export interface Origin {
  id: string;
  name: string;
  desc: string;
  attributeMods: Partial<Attributes>;
  startSpiritStones: number;
  startItems: string[];
  startFlags?: Record<string, boolean | number>;
  /** machine-readable perk key, e.g. 'alchemyBonus' */
  perk:
    | 'injuryRecovery'   // 耐苦: injury turns −1
    | 'learnBonus'       // 过目不忘: technique learning / insight bonus
    | 'merchant'         // 市侩: 坊市 sell 60%
    | 'alchemyBonus'     // 识药: alchemy +10%
    | 'combatBonus'      // 搏杀: combat power +5%
    | 'clanTechnique';   // 家学: starts with 黄阶功法
  /** human-readable perk name + description */
  perkName: string;
  perkDesc: string;
}

export type TechniqueGrade = '黄阶' | '玄阶' | '地阶' | '天阶';

export interface Technique {
  id: string;
  name: string;
  grade: TechniqueGrade;
  /** null = universal */
  elementAffinity: AnyElement[] | null;
  /** multiplies cultivation speed (1.1 = +10%) */
  speedBonus: number;
  /** flat power bonus */
  powerBonus: number;
  minRealm: RealmId;
  desc: string;
}

export interface CombatArt {
  id: string;
  name: string;
  element: AnyElement | null;
  /** flat power added when cast via 术法 */
  power: number;
  minRealm: RealmId;
  desc: string;
}

export type ItemKind = 'pill' | 'weapon' | 'armor' | 'talisman' | 'material' | 'manual' | 'misc';

export interface ItemEffect {
  hp?: number;
  exp?: number;
  /** one-shot bonus to the next breakthrough attempt */
  breakthroughBonus?: number;
  attribute?: [keyof Attributes, number];
  cureInjury?: boolean;
  /** cures heart-demon / debuff statuses */
  cureStatus?: boolean;
  /** grants a timed status effect */
  status?: StatusEffect;
  /** manuals teach a technique */
  teachTechnique?: string;
  /** manuals teach a combat art */
  teachArt?: string;
  /** talisman: guaranteed flee from current combat */
  escape?: boolean;
  /** talisman: direct damage in combat */
  damage?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  grade: 1 | 2 | 3 | 4 | 5;
  price: number;
  desc: string;
  effect?: ItemEffect;
  power?: number;
  defense?: number;
  /** market availability gate */
  minRealm?: RealmId;
}

export interface ItemStack {
  itemId: string;
  count: number;
}

export interface Recipe {
  id: string;
  resultItemId: string;
  name: string;
  materials: ItemStack[];
  baseSuccess: number;
  minRealm: RealmId;
  /** 灵石 furnace fee per attempt */
  fee: number;
}

// ============================================================================
// Events
// ============================================================================

export type EventBucket = '大凶' | '小凶' | '平' | '小吉' | '大吉';

export interface EventCheck {
  attr: keyof Attributes;
  /** D20 + attr vs DC */
  dc: number;
}

export interface EventEffect {
  narrative: string;
  exp?: number;
  hp?: number;
  spiritStones?: number;
  items?: ItemStack[];
  favor?: [npcId: string, delta: number];
  /** injury id from data */
  injury?: string;
  status?: StatusEffect;
  /** enemyId — start combat */
  combat?: string;
  flag?: [string, boolean | number];
  teachTechnique?: string;
  teachArt?: string;
  death?: boolean;
}

export interface EventChoice {
  text: string;
  check?: EventCheck;
  success: EventEffect;
  failure?: EventEffect;
}

export interface GameEvent {
  id: string;
  name: string;
  /** realms in which the event may fire */
  realmTier: RealmId[];
  /** relative weight within its bucket */
  weight: number;
  /** which fortune bucket it belongs to */
  bucket: EventBucket;
  /** 天道 prose */
  narrative: string;
  kind: 'fortune' | 'neutral' | 'danger' | 'encounter' | 'combat';
  /** hidden 机缘 gate — event only eligible when 机缘 ≥ minJiYuan */
  minJiYuan?: number;
  /** flag requirements: [flagName, requiredValue] */
  requiresFlag?: [string, boolean | number];
  /** set automatically to prevent repeats of unique events */
  once?: boolean;
  /** 0 choices = auto-resolve */
  choices?: EventChoice[];
  autoEffect?: EventEffect;
}

/** an event waiting for the player to pick a choice */
export interface PendingEvent {
  eventId: string;
}

// ============================================================================
// Combat
// ============================================================================

export interface Enemy {
  id: string;
  name: string;
  realm: RealmId;
  /** flavor tier label, e.g. 炼气四层 / 二阶妖兽 */
  rank: string;
  power: number;
  defense: number;
  hp: number;
  loot: { itemId: string; chance: number }[];
  spiritStones: [min: number, max: number];
  fleeable: boolean;
  /** if true, losing ⇒ death (身死道消); otherwise robbed/injured */
  lethal: boolean;
  intro: string;
}

/** tactical choices — 强攻 aggressive / 游斗 probing / 设伏 feint-trap / 遁走 flee */
export type CombatTactic = '强攻' | '游斗' | '设伏' | '术法' | '服药' | '遁走';

export interface CombatState {
  enemyId: string;
  /** snapshot so data changes can't alter a running fight */
  enemy: Enemy;
  enemyHp: number;
  round: number;
  /**
   * 破绽 — earned by successful 游斗 probing; the next 强攻 strikes true
   * (damage ×1.6) and consumes it.
   */
  opening: boolean;
  /** 伏势 — successful 设伏: next round enemy damage halved, your strike ×1.8 */
  trapArmed: boolean;
  /** consecutive failed flee attempts embolden the enemy (+10% dmg each) */
  fleeFailures: number;
  over: boolean;
  result?: 'win' | 'lose' | 'fled' | 'dead';
}

// ============================================================================
// NPC / Quests
// ============================================================================

export interface NpcThreshold {
  at: number;
  /** flag set when crossed */
  unlockFlag: string;
  narrative: string;
}

export interface Npc {
  id: string;
  name: string;
  identity: string;
  /** -100…100 */
  favor: number;
  thresholds: NpcThreshold[];
  desc: string;
}

export type QuestStatus = 'locked' | 'active' | 'done' | 'failed';

export interface QuestObjective {
  type: 'reachRealm' | 'killEnemy' | 'obtainItem' | 'favor';
  target: string;
  n?: number;
}

export interface QuestChoice {
  text: string;
  /** id of quest unlocked by this choice */
  outcomeQuestId?: string;
  effect?: EventEffect;
}

export interface Quest {
  id: string;
  kind: 'main' | 'side';
  chapter?: number;
  title: string;
  narrative: string;
  /** main-story nodes: exactly 3 choices */
  choices?: QuestChoice[];
  objective?: QuestObjective;
  reward: EventEffect;
  status: QuestStatus;
}

// ============================================================================
// Locations (探索)
// ============================================================================

export interface DiscoveryEntry {
  /** inclusive D100 bucket */
  min: number;
  max: number;
  kind: 'item' | 'stones' | 'exp' | 'combat' | 'nothing' | 'insight' | 'injury';
  narrative: string;
  itemId?: string;
  count?: number;
  stones?: [min: number, max: number];
  exp?: number;
  enemyId?: string;
  injuryId?: string;
}

export interface LocationDef {
  id: string;
  name: string;
  minRealm: RealmId;
  desc: string;
  /** D100 table, buckets must cover 1..100 */
  discoveries: DiscoveryEntry[];
}

// ============================================================================
// Endings
// ============================================================================

export interface EndingDef {
  id: string;
  title: string;
  /** 天道's closing line */
  closing: string;
}

export interface EndingResult {
  id: string;
  title: string;
  summary: string;
  closing: string;
}

// ============================================================================
// Narrative Log
// ============================================================================

export type LogTone = 'normal' | 'gold' | 'danger' | 'jade' | 'muted';

export interface LogEntry {
  /** monotonic id for stable rendering keys */
  id: number;
  turn: number;
  speaker: '天道' | '系统' | '战斗';
  text: string;
  tone?: LogTone;
}

// ============================================================================
// Character creation
// ============================================================================

/** 4-step gate: 0 identity → 1 origin → 2 attributes → 3 spirit root → 4 hidden roll → play */
export type CreationStep = 0 | 1 | 2 | 3 | 4;

export interface CreationDraft {
  name: string;
  gender: '男' | '女';
  originId: string | null;
  /** allocated visible attributes (each 5–10, total 30) */
  attributes: Pick<Attributes, 'genGu' | 'wuXing' | 'xinXing' | 'qiYun'> | null;
  spiritRoot: SpiritRoot | null;
  hiddenRolled: boolean;
}

// ============================================================================
// Commands
// ============================================================================

export type Command =
  | { kind: 'cultivate' }                                   // 修炼
  | { kind: 'breakthrough' }                                // 突破
  | { kind: 'explore'; locationId?: string }                // 探索
  | { kind: 'market' }                                      // 坊市 (travel — costs a turn)
  | { kind: 'buy'; itemId: string; count: number }
  | { kind: 'sell'; itemId: string; count: number }
  | { kind: 'alchemy' }                                     // 炼丹 (open — free)
  | { kind: 'craft'; recipeId: string }                     // 炼丹 (attempt — costs a turn)
  | { kind: 'use'; item: string }                           // 使用 <物品> — name or id
  | { kind: 'equip'; item: string }                         // 装备 <物品>
  | { kind: 'gift'; npc: string; item?: string }            // 赠礼 <NPC>
  | { kind: 'panel' }                                       // 面板
  | { kind: 'inventory' }                                   // 背包
  | { kind: 'quests' }                                      // 任务
  | { kind: 'questChoice'; questId: string; choiceIndex: number }
  | { kind: 'eventChoice'; choiceIndex: number }
  | { kind: 'audit' }                                       // 审计
  | { kind: 'save' }                                        // 保存
  | { kind: 'combat'; tactic: CombatTactic; item?: string } // 强攻/游斗/设伏/术法/服药/遁走
  | { kind: 'rest' }                                        // 静养 — heal, costs a turn
  | { kind: 'unknown'; raw: string };                       // rejected by whitelist

// ============================================================================
// Top-level GameState
// ============================================================================

export const SAVE_VERSION = 1;
export const LOG_CAP = 300;
export const ROLL_CAP = 500;
/** 1 turn ≈ 3 months */
export const TURNS_PER_YEAR = 4;
export const STARTING_AGE = 16;

export interface GameState {
  /** save schema version */
  version: number;
  /** dice authority */
  seed: string;
  rngState: string;
  phase: 'title' | 'creation' | 'playing' | 'combat' | 'ended';
  /** mandatory 4-step creation gate */
  creationStep: CreationStep;
  creationDraft: CreationDraft | null;
  /** 1 turn ≈ 3 months in-world */
  turn: number;
  character: Character | null;
  npcs: Record<string, Npc>;
  quests: Quest[];
  combat: CombatState | null;
  pendingEvent: PendingEvent | null;
  /** capped ring buffer */
  narrativeLog: LogEntry[];
  /** audit trail (capped, hash-chained) */
  rolls: DiceRoll[];
  /** chained checksum */
  auditHash: string;
  /** monotonic counters that survive log/roll capping */
  nextRollId: number;
  nextLogId: number;
  /** lifetime stats for the ending screen */
  stats: {
    totalRolls: number;
    stonesEarned: number;
    enemiesSlain: number;
    breakthroughsFailed: number;
    pillsConsumed: number;
    peakRealmLabel: string;
  };
  ending: EndingResult | null;
}
