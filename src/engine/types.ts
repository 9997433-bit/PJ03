// ============================================================================
// 《凡人修仙传·人生模拟器》 — 核心数据模型
// PURE TypeScript — zero React / browser imports. Everything here is the
// single source of truth for the whole game engine.
// ============================================================================

// ===== Dice & Audit =====
export type Die = 'D100' | 'D20' | 'D6';

export interface DiceRoll {
  id: number; // monotonic sequence
  turn: number;
  die: Die;
  value: number;
  reason: string; // e.g. "灵根抽取", "突破·筑基", "遭遇事件"
  seedState: string; // PRNG state snapshot (audit/replay)
}

// ===== Attributes (五维) =====
export interface Attributes {
  genGu: number; // 根骨 constitution — HP, breakthrough success
  wuXing: number; // 悟性 comprehension — cultivation speed, technique learning
  xinXing: number; // 心性 temperament — heart-demon resistance, event options
  jiYuan: number; // 机缘 fortune (HIDDEN — never shown on panel)
  qiYun: number; // 气运 luck — event table shift, loot quality
}

export type VisibleAttribute = 'genGu' | 'wuXing' | 'xinXing' | 'qiYun';

// ===== Spirit Root (灵根) =====
export type Element = '金' | '木' | '水' | '火' | '土' | '雷' | '冰' | '风';

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
  elements: Element[];
  speedMultiplier: number; // 天灵根 3.0 … 五灵根(伪灵根) 0.5
  rollValue: number; // the D100 that produced it
}

// ===== Realm (境界) =====
export type RealmId = 'mortal' | 'qi' | 'foundation' | 'core' | 'nascent' | 'deity';
export type Stage = '初期' | '中期' | '后期' | '大圆满';

export interface RealmState {
  realm: RealmId;
  qiLayer: number; // 炼气 1–13 (0 outside qi refining)
  stage: Stage; // for 筑基 and above
  exp: number; // progress toward next layer/stage
  expNeeded: number;
}

export interface RealmDef {
  id: RealmId;
  name: string;
  lifespan: number; // total 寿元 once this realm is reached
  layers?: number; // qi: 13
  stages?: Stage[];
  baseExpPerLevel: number[]; // exp needed per layer/stage
  powerBase: number;
  breakthroughBaseChance: number; // chance to break INTO this realm (major gate)
  failurePenalty: { expLoss: [number, number]; injuryChance: number; deathChance: number };
}

// ===== Injuries =====
export interface Injury {
  id: string;
  name: string;
  severity: 1 | 2 | 3;
  turnsLeft: number;
  effect: Partial<Record<'speed' | 'power' | 'breakthrough', number>>;
}

// ===== Character =====
export interface Character {
  name: string;
  gender: '男' | '女';
  originId: string;
  attributes: Attributes;
  spiritRoot: SpiritRoot;
  realm: RealmState;
  age: number;
  lifespan: number; // 寿元 grows with realm
  hp: number;
  maxHp: number;
  injuries: Injury[]; // from failed breakthroughs / combat
  techniqueId: string | null; // equipped 功法
  combatArts: string[]; // learned 战斗术法
  spiritStones: number; // 灵石
  inventory: ItemStack[];
  equipped: { weapon?: string; armor?: string; accessory?: string };
  sectId: string | null; // 宗门 membership
  flags: Record<string, boolean | number>; // story/event flags
}

// ===== Content types =====
export interface Origin {
  id: string;
  name: string;
  desc: string;
  attributeMods: Partial<Attributes>;
  startSpiritStones: number;
  startItems: string[];
  startFlags?: Record<string, boolean>;
  special: string; // human-readable trait description
}

export type TechniqueGrade = '黄阶' | '玄阶' | '地阶' | '天阶';

export interface Technique {
  id: string;
  name: string;
  grade: TechniqueGrade;
  elementAffinity: Element[] | null;
  speedBonus: number; // multiplier, e.g. 1.1
  powerBonus: number; // flat power added
  minRealm: RealmId;
  desc: string;
}

export interface CombatArt {
  id: string;
  name: string;
  element: Element | null;
  powerBonus: number; // flat power added when cast (术法)
  desc: string;
}

export type ItemKind = 'pill' | 'weapon' | 'armor' | 'accessory' | 'talisman' | 'material' | 'manual' | 'misc';

export interface ItemEffect {
  hp?: number;
  exp?: number;
  breakthroughBonus?: number; // consumed by the next 突破 attempt
  attribute?: [keyof Attributes, number];
  cureInjury?: boolean;
  clearBottleneck?: boolean;
  teachTechnique?: string; // manuals
  teachArt?: string; // combat-art manuals
  expBuff?: { mult: number; turns: number }; // cultivation buff
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  grade: 1 | 2 | 3 | 4 | 5;
  price: number;
  desc: string;
  effect?: ItemEffect;
  power?: number; // weapons
  defense?: number; // armor
  minRealm?: RealmId; // market availability tier
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
  baseSuccess: number; // percent
  minRealm: RealmId;
  fee: number; // spirit stones consumed per attempt
}

// ===== Events =====
export type EventBucket = '大凶' | '小凶' | '平' | '小吉' | '大吉';

export interface EventEffect {
  narrative: string;
  exp?: number;
  hp?: number;
  spiritStones?: number;
  items?: ItemStack[];
  favor?: [npcId: string, delta: number];
  injury?: string; // injury def id
  combat?: string; // enemy id
  flag?: [string, boolean | number];
  teachTechnique?: string;
  teachArt?: string;
  attribute?: [keyof Attributes, number];
  clearBottleneck?: boolean;
  death?: boolean;
}

export interface EventChoice {
  text: string;
  check?: { attr: keyof Attributes; dc: number }; // D20 + attr vs DC
  success: EventEffect;
  failure?: EventEffect;
}

export interface GameEvent {
  id: string;
  name: string;
  bucket: EventBucket; // which D100 bucket selects it
  realmTier: RealmId[];
  weight: number;
  narrative: string; // 天道 prose, template vars
  kind: 'fortune' | 'neutral' | 'danger' | 'encounter' | 'combat';
  minJiYuan?: number; // hidden 机缘 gate for destiny events
  requiresFlag?: string;
  excludesFlag?: string;
  once?: boolean; // fires at most once per life
  choices?: EventChoice[]; // 0 choices = auto-resolve
  autoEffect?: EventEffect;
}

// ===== Combat =====
export interface Enemy {
  id: string;
  name: string;
  realm: Pick<RealmState, 'realm' | 'qiLayer' | 'stage'>;
  power: number;
  defense: number;
  hp: number;
  loot: { itemId: string; chance: number }[];
  spiritStones: [min: number, max: number];
  fleeable: boolean;
  lethal: boolean; // if true, losing means death (身死道消)
  desc: string;
}

export interface CombatState {
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  round: number;
  log: string[];
  over: boolean;
  result?: 'win' | 'lose' | 'fled' | 'dead';
}

// ===== NPC / Quests =====
export interface NpcThreshold {
  at: number;
  unlock: string; // human-readable description
  effect?: EventEffect; // granted when threshold crossed (once)
  flagKey: string; // marks the threshold as consumed
}

export interface Npc {
  id: string;
  name: string;
  identity: string;
  favor: number; // -100…100
  thresholds: NpcThreshold[];
}

export type QuestStatus = 'locked' | 'active' | 'done' | 'failed';

export interface QuestChoice {
  text: string;
  effect?: EventEffect;
}

export interface QuestObjective {
  type: 'reachRealm' | 'killEnemy' | 'obtainItem' | 'favor';
  target: string;
  n?: number;
  desc: string;
}

export interface Quest {
  id: string;
  kind: 'main' | 'side';
  chapter?: number;
  title: string;
  narrative: string;
  choices?: QuestChoice[]; // main quests: 3-choice nodes
  objective?: QuestObjective;
  reward?: EventEffect;
  unlockAfter?: string; // quest id that must be done first
  minRealm?: RealmId;
  status: QuestStatus;
}

// ===== Endings =====
export interface EndingDef {
  id: string;
  title: string;
  line: string; // 天道's closing one-liner
}

// ===== Narrative log =====
export interface LogEntry {
  turn: number;
  speaker: '天道' | '系统' | '战斗';
  text: string;
  tone?: 'normal' | 'gold' | 'danger' | 'jade';
}

// ===== Creation draft (progressive 4-step state) =====
export interface CreationDraft {
  name: string;
  gender: '男' | '女';
  originId: string | null;
  attributes: Attributes | null;
  spiritRoot: SpiritRoot | null;
}

export interface PendingEvent {
  eventId: string;
}

// ===== Top-level GameState =====
export interface GameState {
  version: number; // save schema version
  seed: string;
  rngState: string; // dice authority PRNG state
  rollSeq: number; // monotonic roll id counter
  phase: 'title' | 'creation' | 'playing' | 'combat' | 'ended';
  creationStep: 0 | 1 | 2 | 3 | 4; // mandatory 4-step gate
  creationDraft: CreationDraft | null;
  turn: number; // 1 turn ≈ 3 months in-world
  character: Character | null;
  npcs: Record<string, Npc>;
  quests: Quest[];
  combat: CombatState | null;
  pendingEvent: PendingEvent | null;
  firedOnceEvents: string[]; // ids of `once` events already fired
  narrativeLog: LogEntry[]; // capped ring buffer (last 300)
  rolls: DiceRoll[]; // audit trail (capped at 500, hash-chained)
  auditHash: string; // chained checksum
  ending: { id: string; title: string; summary: string } | null;
}

// ===== Engine result shape =====
export interface EngineResult {
  state: GameState;
  logs: LogEntry[];
}

export const SAVE_VERSION = 1;
export const NARRATIVE_LOG_CAP = 300;
export const ROLL_LOG_CAP = 500;
