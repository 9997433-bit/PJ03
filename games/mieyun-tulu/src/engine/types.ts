/**
 * types.ts — 《灭运图录·人生模拟器》data model
 *
 * The whole game is a pure reducer over `GameState`. Nothing in `engine/` or
 * `data/` may import React or touch browser APIs; every rule is a function
 * `(state, input) → (state', logs[])` so the simulation stays replayable and
 * unit-testable.
 *
 * Two resources drive the fiction and the maths alike:
 *   气运 (fortune)  — everything good scales with it;
 *   劫运 (calamity) — everything good *feeds* it, and it kills you.
 */

// ============================================================================
// Dice & audit
// ============================================================================

export type Die = 'D100' | 'D20' | 'D6';

export interface DiceRoll {
  /** Monotonic sequence number across the whole run. */
  id: number;
  turn: number;
  die: Die;
  value: number;
  /** Human-readable cause, e.g. "突破·窥命" or "劫运降临判定". */
  reason: string;
  /** PRNG state *before* the roll — lets any single roll be replayed. */
  seedState: string;
}

/** Ring-buffer caps so a long run cannot grow the save without bound. */
export const ROLL_CAP = 500;
export const LOG_CAP = 320;

export interface AuditChainEntry {
  turn: number;
  command: string;
  rollValues: number[];
  hash: string;
}

// ============================================================================
// Attributes (五维)
// ============================================================================

export interface Attributes {
  /** 神魂 — divination reach, spell power, 心魔 resistance. */
  shenHun: number;
  /** 体魄 — hit points, physical strike damage. */
  tiPo: number;
  /** 悟性 — cultivation speed, technique learning. */
  wuXing: number;
  /** 定力 — breakthrough steadiness, calamity resistance. */
  dingLi: number;
  /** 机变 — flight, haggling, extra event options. */
  jiBian: number;
}

export type AttributeKey = keyof Attributes;

export const ATTRIBUTE_KEYS: readonly AttributeKey[] = [
  'shenHun',
  'tiPo',
  'wuXing',
  'dingLi',
  'jiBian',
];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  shenHun: '神魂',
  tiPo: '体魄',
  wuXing: '悟性',
  dingLi: '定力',
  jiBian: '机变',
};

export const ATTRIBUTE_HINTS: Record<AttributeKey, string> = {
  shenHun: '推演之力、术法威能、抗心魔',
  tiPo: '气血上限、近身斗法',
  wuXing: '修炼速率、习法成算',
  dingLi: '突破稳度、抗劫运侵蚀',
  jiBian: '遁走、议价、多一条抉择',
};

// ============================================================================
// 灵根 & 命格
// ============================================================================

export type Element = '金' | '木' | '水' | '火' | '土' | '雷' | '冥';

export type SpiritRootGrade =
  | '五行杂灵根'
  | '四灵根'
  | '三灵根'
  | '双灵根'
  | '真灵根'
  | '变异灵根'
  | '先天道体';

export interface SpiritRoot {
  grade: SpiritRootGrade;
  elements: Element[];
  /** Multiplier on cultivation exp per turn. */
  speedMultiplier: number;
  /** Multiplier on passive 劫运 accrual — sharper roots draw more heaven's eye. */
  calamityAffinity: number;
  rollValue: number;
}

export interface SpiritRootDef {
  grade: SpiritRootGrade;
  rollMin: number;
  rollMax: number;
  elementCount: number;
  speedMultiplier: number;
  calamityAffinity: number;
  pool: readonly Element[];
  desc: string;
}

/**
 * Flags are the game's long-term memory: chain progress, wards, scripted
 * deaths. Strings are allowed so a flag can name an ending or an enemy.
 */
export type FlagValue = number | boolean | string;

export interface OriginDef {
  id: string;
  name: string;
  desc: string;
  attributeMods: Partial<Attributes>;
  startStones: number;
  startItems: readonly ItemStack[];
  startFortune: number;
  startCalamity: number;
  startMerit: number;
  startFlags?: Record<string, FlagValue>;
  special: string;
}

/** 命格 — the star-chart pattern a life is cast under. Visible, unlike G1's sealed roll. */
export interface FateDef {
  id: string;
  name: string;
  rollMin: number;
  rollMax: number;
  desc: string;
  attributeMods: Partial<Attributes>;
  /** Multiplier on passive 劫运 accrual. */
  calamityRate: number;
  /** Multiplier on 气运 gains. */
  fortuneRate: number;
  startFortune: number;
  startMerit: number;
  special: string;
}

// ============================================================================
// 境界 (realms)
// ============================================================================

export type RealmId =
  | 'mortal'
  | 'yinqi'
  | 'tongxuan'
  | 'xuanguang'
  | 'yuanshen'
  | 'dongzhen'
  | 'changsheng';

export type Stage = '初期' | '中期' | '后期' | '圆满';

export interface RealmState {
  realm: RealmId;
  /** 引气 1–9; 0 outside 引气. */
  layer: number;
  stage: Stage;
  exp: number;
  expNeeded: number;
}

export interface RealmDef {
  id: RealmId;
  name: string;
  order: number;
  /** 引气 only. */
  layers?: number;
  stages?: readonly Stage[];
  baseExp: number;
  /** Geometric growth of `expNeeded` across layers/stages. */
  expGrowth: number;
  /** Exp a plain 修炼 turn yields at this realm before every modifier. */
  cultivationBase: number;
  powerBase: number;
  lifespan: number;
  /** Base D100 target for the 突破 into this realm. */
  breakthroughBase: number;
  /** 劫运 added by successfully entering this realm. */
  calamityOnEntry: number;
  failure: { expLoss: number; injuryChance: number; deathChance: number };
  desc: string;
}

// ============================================================================
// 劫运 (calamity) — the signature system
// ============================================================================

export type CalamityTier = '安泰' | '微澜' | '阴云' | '雷动' | '天诛';

export interface CalamityState {
  /** 0–100. At 100 the heavens execute. */
  value: number;
  /** Highest value ever reached — feeds endings and the audit. */
  peak: number;
  /** How many 劫 the character has survived. */
  survived: number;
  /** How many were dissolved before they landed. */
  dissolved: number;
  /** Consecutive turns spent above 雷动. */
  streak: number;
}

export type CalamityKind = '心魔' | '血光' | '天雷' | '业火' | '天诛';

export interface CalamityStrike {
  id: string;
  kind: CalamityKind;
  name: string;
  tier: CalamityTier;
  narrative: string;
  /** Raw severity 1–5, scaled by 定力 and 功德 before it lands. */
  severity: number;
  /** Enemy id when the 劫 must be fought rather than endured. */
  enemyId?: string;
  hpLossPct?: number;
  expLossPct?: number;
  stoneLossPct?: number;
  fortuneLoss?: number;
  reputationLoss?: number;
  injuryId?: string;
  /** 劫运 discharged once the strike has resolved — the storm passes. */
  vent: number;
}

export interface InjuryDef {
  id: string;
  name: string;
  severity: 1 | 2 | 3;
  turns: number;
  desc: string;
  effect: { cultivation?: number; power?: number; breakthrough?: number; calamity?: number };
}

export type MitigationId = 'sanGongDe' | 'sheCai' | 'yinNi' | 'buZhen' | 'yingJie';

export interface MitigationDef {
  id: MitigationId;
  name: string;
  desc: string;
  /** Cost in 功德 / 玄晶 / 气运 — all optional. */
  cost: { merit?: number; stones?: number; fortune?: number; itemId?: string };
  /** 劫运 removed on success. */
  relief: number;
  /** Base D100 success target before 定力/神魂. */
  baseChance: number;
  /** Whether the attempt consumes the turn. */
  costsTurn: boolean;
}

// ============================================================================
// 功法路线 (technique routes)
// ============================================================================

export type RouteId = 'dao' | 'fo' | 'mo' | 'ru' | 'tulu';

export interface RouteEffects {
  /** Multiplicative on cultivation exp. */
  cultivationMult?: number;
  /** Flat addition to combat power. */
  powerBonus?: number;
  /** Multiplicative on passive 劫运 accrual (0.8 = −20%). */
  calamityRateMult?: number;
  /** Multiplicative on 气运 gained from 灭运 and events. */
  fortuneGainMult?: number;
  /** 功德 gained per turn. */
  meritPerTurn?: number;
  /** Flat addition to breakthrough D100 target. */
  breakthroughBonus?: number;
  /** Fraction off divination cost. */
  divinationDiscount?: number;
  /** Flat addition to 化解劫运 success target. */
  mitigationBonus?: number;
  /** Fraction off market prices. */
  marketDiscount?: number;
  /** Multiplicative on 声望 gains. */
  reputationMult?: number;
  /** Flat addition to max 法力. */
  manaBonus?: number;
  /** Flat addition to max 气血. */
  hpBonus?: number;
}

export interface RouteDef {
  id: RouteId;
  name: string;
  motto: string;
  desc: string;
  /** Sect whose teachings match — joining it discounts the route. */
  affinitySectId: string | null;
  /** Hidden routes are only offered once their unlock flag is set. */
  hidden?: boolean;
  unlockFlag?: string;
}

export interface TechniqueNode {
  id: string;
  name: string;
  route: RouteId;
  tier: 1 | 2 | 3;
  /** Parent node id — this is what makes the tree branch. */
  requires: string | null;
  minRealm: RealmId;
  costStones: number;
  /** Higher = harder; the 悟性 check is D100 ≤ 45 + 悟性×4 − difficulty. */
  difficulty: number;
  desc: string;
  effects: RouteEffects;
}

// ============================================================================
// 门派 (sects)
// ============================================================================

export interface SectDef {
  id: string;
  name: string;
  route: RouteId;
  desc: string;
  /** Minimum realm order to be accepted. */
  minRealmOrder: number;
  /** Entry donation in 玄晶. */
  tuition: number;
  /** 玄晶 per turn while a member. */
  stipend: number;
  /** Fraction off the market. */
  discount: number;
  /** Reputation thresholds and what they unlock. */
  ranks: readonly SectRank[];
  /** Sects that refuse a character carrying this much 劫运. */
  maxCalamity: number;
  /** Sects that refuse a character below this 功德. */
  minMerit: number;
  /** What this sect actually pays 声望 for. See `SectCreed`. */
  creed: SectCreed;
}

/**
 * 门规 — the deeds a sect counts, in 声望 per occurrence.
 *
 * Ranks are the only thing gating 道统之主, and before this existed the ledger
 * had no repeatable income at all: 声望 arrived solely from a handful of random
 * events worth ~10 each, against a 320 requirement for the top rank. Members
 * now earn it by doing the sect's kind of work, which is also the only reading
 * of 「声望」 the descriptions ever supported.
 *
 * A negative entry is a sect that holds the deed against you — 大梵寺 does not
 * want its 沙弥 out extinguishing people's 气运.
 */
export interface SectCreed {
  /** Winning a duel, scaled by the opponent's realm order. */
  duel: number;
  /** Sparing a beaten opponent. */
  spare: number;
  /** Extinguishing one. */
  extinguish: number;
  /** Coming through a 劫 alive, by either surviving or dissolving it. */
  calamity: number;
}

export interface SectRank {
  reputation: number;
  title: string;
  reward: { stones?: number; itemId?: string; merit?: number; techniqueId?: string };
}

// ============================================================================
// Items & inventory
// ============================================================================

export type ItemKind = 'pill' | 'talisman' | 'weapon' | 'robe' | 'charm' | 'material' | 'relic';

export interface ItemEffect {
  hp?: number;
  mana?: number;
  exp?: number;
  fortune?: number;
  calamity?: number;
  merit?: number;
  stones?: number;
  /** Consumed on the next 突破. */
  breakthroughBonus?: number;
  attribute?: [AttributeKey, number];
  cureInjury?: boolean;
  /** Grants a permanent flag (relics, 图录残卷 …). */
  flag?: [string, FlagValue];
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  grade: 1 | 2 | 3 | 4 | 5;
  price: number;
  desc: string;
  effect?: ItemEffect;
  /** Equipment stats. */
  power?: number;
  defense?: number;
  /** Passive route-style effects while equipped. */
  passive?: RouteEffects;
  /** Only stocked in the market from this realm order upward. */
  minRealmOrder?: number;
  /** Never sold — quest/relic only. */
  noTrade?: boolean;
}

export interface ItemStack {
  itemId: string;
  count: number;
}

export interface Injury {
  id: string;
  name: string;
  severity: 1 | 2 | 3;
  turnsLeft: number;
  effect: { cultivation?: number; power?: number; breakthrough?: number; calamity?: number };
}

// ============================================================================
// Events — 理性决策 (choices publish their own odds)
// ============================================================================

export type EventKind = 'fortune' | 'neutral' | 'danger' | 'encounter' | 'combat' | 'destiny';

/**
 * The five omen buckets a D100 + 气运 offset lands in. `destiny` events sit
 * outside the wheel entirely: they are drawn only when their flag chain is
 * already satisfied.
 */
export type EventBucket = '大凶' | '小凶' | '平' | '小吉' | '大吉';

export const EVENT_BUCKETS: readonly EventBucket[] = ['大凶', '小凶', '平', '小吉', '大吉'];

/** Each bucket is served by exactly one event kind, so the mapping is total. */
export const BUCKET_KIND: Record<EventBucket, EventKind> = {
  大凶: 'danger',
  小凶: 'combat',
  平: 'neutral',
  小吉: 'encounter',
  大吉: 'fortune',
};

export interface EventEffect {
  narrative?: string;
  exp?: number;
  hp?: number;
  mana?: number;
  stones?: number;
  fortune?: number;
  calamity?: number;
  merit?: number;
  reputation?: number;
  items?: ItemStack[];
  injury?: string;
  combat?: string;
  flag?: [string, FlagValue];
  attribute?: [AttributeKey, number];
  death?: string;
}

export interface EventChoice {
  id: string;
  text: string;
  /** D20 + attr vs dc. Omit for a certain outcome. */
  check?: { attr: AttributeKey; dc: number };
  /** Gate on resources — hidden when unaffordable. */
  requires?: { stones?: number; merit?: number; fortune?: number; itemId?: string; flag?: string };
  /** Paid regardless of the check result. */
  pay?: { stones?: number; merit?: number; fortune?: number; itemId?: string };
  /** One-line summary of the upside, shown next to the computed odds. */
  upside: string;
  /** One-line summary of the risk. */
  downside: string;
  success: EventEffect;
  failure?: EventEffect;
}

export interface GameEvent {
  id: string;
  name: string;
  kind: EventKind;
  /** Realm orders the event can fire in. */
  realmOrders: readonly number[];
  weight: number;
  narrative: string;
  /** Only offered when 劫运 sits in this window. */
  calamityRange?: [number, number];
  /** Only offered when 气运 sits in this window. */
  fortuneRange?: [number, number];
  requiresFlag?: string;
  forbidsFlag?: string;
  requiresRoute?: RouteId;
  /** Gate on the sealed 道缘 roll. Never surfaced to the player. */
  minDaoYuan?: number;
  once?: boolean;
  choices?: readonly EventChoice[];
  autoEffect?: EventEffect;
}

export interface PendingEvent {
  eventId: string;
  /** Snapshot of the odds shown to the player, so the UI never recomputes. */
  options: ResolvedChoice[];
}

/** A choice with its odds already computed — the "rational decision" surface. */
export interface ResolvedChoice {
  id: string;
  text: string;
  /** 0–100, or null for a certain outcome. */
  chance: number | null;
  checkLabel: string | null;
  upside: string;
  downside: string;
  costLabel: string | null;
  affordable: boolean;
}

// ============================================================================
// Combat 斗法
// ============================================================================

export interface EnemyDef {
  id: string;
  name: string;
  identity: string;
  realmOrder: number;
  power: number;
  defense: number;
  hp: number;
  /** 气运 available to 灭运 on victory. */
  fortune: number;
  /** Sparing this foe grants merit; hunting it costs merit. */
  merit: number;
  stones: [number, number];
  loot: readonly { itemId: string; chance: number }[];
  fleeable: boolean;
  /** Tribulation manifestations are not people — 灭运/饶恕 do not apply. */
  isCalamity?: boolean;
  taunt: string;
}

export type CombatAction = '出手' | '术法' | '用符' | '遁走';
export type CombatResolution = 'win' | 'lose' | 'fled' | 'dead';
export type SpoilsChoice = '灭运' | '饶恕' | '搜刮';

export interface CombatState {
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  round: number;
  log: string[];
  over: boolean;
  result?: CombatResolution;
  /** After a win the player must choose what to do with the fallen. */
  awaitingSpoils: boolean;
  /** Where the fight came from, so the resolver can return there. */
  source: 'event' | 'explore' | 'calamity' | 'duel';
  /** 劫运 discharged by winning — non-zero only for tribulation fights. */
  vent: number;
}

// ============================================================================
// 命运推演 (divination) — deterministic look-ahead
// ============================================================================

export type DivinationDepth = 'shallow' | 'deep' | 'heavenly';

export interface DivinationCost {
  stones: number;
  calamity: number;
  mana: number;
  costsTurn: boolean;
}

export interface ForecastLine {
  label: string;
  /** Probability 0–100 where meaningful. */
  chance: number | null;
  detail: string;
  /** Only filled at depths that may peek at the actual future roll. */
  peek?: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface Forecast {
  turn: number;
  depth: DivinationDepth;
  lines: ForecastLine[];
  /** 天机反噬 — the calamity actually paid for the peek. */
  backlash: number;
  summary: string;
}

// ============================================================================
// Narrative & endings
// ============================================================================

export type Speaker = '天机' | '图录' | '系统' | '斗法' | '劫';
export type Tone = 'normal' | 'violet' | 'gold' | 'danger' | 'calm';

export interface LogEntry {
  turn: number;
  speaker: Speaker;
  text: string;
  tone: Tone;
}

export interface EndingDef {
  id: string;
  title: string;
  kind: 'victory' | 'transcend' | 'death' | 'retire' | 'fall';
  summary: string;
  closing: string;
}

export interface EndingResult {
  id: string;
  title: string;
  kind: EndingDef['kind'];
  summary: string;
  closing: string;
  stats: RunStats;
}

export interface RunStats {
  turns: number;
  years: number;
  peakRealm: RealmId;
  peakRealmLabel: string;
  totalRolls: number;
  stonesEarned: number;
  battlesWon: number;
  extinguished: number;
  calamitiesSurvived: number;
  calamitiesDissolved: number;
  peakCalamity: number;
  peakFortune: number;
  merit: number;
  divinations: number;
}

// ============================================================================
// Character & game state
// ============================================================================

export interface Character {
  name: string;
  gender: '男' | '女';
  originId: string;
  fateId: string;
  attributes: Attributes;
  spiritRoot: SpiritRoot;
  realm: RealmState;
  age: number;
  lifespan: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  /** 气运 0–100. */
  fortune: number;
  calamity: CalamityState;
  /** 功德 −300…600. */
  merit: number;
  spiritStones: number;
  routeId: RouteId | null;
  learned: string[];
  inventory: ItemStack[];
  equipped: { weapon?: string; robe?: string; charm?: string };
  sectId: string | null;
  reputation: number;
  sectRankIndex: number;
  injuries: Injury[];
  /** Pending 突破 bonus from pills, consumed on the next attempt. */
  breakthroughBuff: number;
  flags: Record<string, FlagValue>;
  extinguishCount: number;
  sparedCount: number;
  seenEvents: string[];
  /**
   * 道缘 — the sealed roll. Produced by a hidden D100 at creation, it gates
   * destiny-chain events and nudges 图录 discoveries. It must never appear in
   * any UI string; `engine/seal.ts` owns the only sanctioned readers.
   */
  daoYuan: number;
}

export interface CreationDraft {
  name: string;
  gender: '男' | '女';
  originId: string | null;
  /** Points assigned on top of the base, before origin mods. */
  allocation: Attributes;
  spiritRoot: SpiritRoot | null;
  fateId: string | null;
}

export type Phase = 'title' | 'creation' | 'playing' | 'combat' | 'event' | 'ended';

export interface GameState {
  version: number;
  seed: string;
  rngState: string;
  phase: Phase;
  /** 0 = name, 1 = 出身, 2 = 属性, 3 = 灵根/命格, 4 = done. */
  creationStep: 0 | 1 | 2 | 3 | 4;
  draft: CreationDraft | null;
  turn: number;
  character: Character | null;
  combat: CombatState | null;
  pendingEvent: PendingEvent | null;
  /** Latest 推演 result, cleared when the turn it describes elapses. */
  forecast: Forecast | null;
  log: LogEntry[];
  rolls: DiceRoll[];
  rollSeq: number;
  auditHash: string;
  chain: AuditChainEntry[];
  /**
   * Hash the chain's first surviving link was built on. Equal to the genesis
   * hash until the chain is trimmed, after which it is the hash of the last
   * dropped link — so verification still replays an unbroken run.
   */
  chainBase: string;
  stats: RunStats;
  ending: EndingResult | null;
}

/** Result of any engine mutation: the new state plus what to narrate. */
export interface TurnResult {
  state: GameState;
  entries: LogEntry[];
  /** Set when the command was rejected — the state is unchanged. */
  rejected?: string;
}

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'mieyun_save_v1';
export const SAVE_MAGIC = 'mieyun-tulu';

export interface SaveEnvelope {
  magic: string;
  version: number;
  checksum: string;
  savedAt: number;
  state: GameState;
}
