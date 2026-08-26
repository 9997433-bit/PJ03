export const DAO_PATHS = ['剑', '法', '体', '神'] as const;
export type DaoPath = (typeof DAO_PATHS)[number];

export const ACTIONS = ['悟道', '凝纹', '斗法', '占地', '突破', '调息'] as const;
export type CoreAction = (typeof ACTIONS)[number];

export const REALMS = ['观纹', '铭纹', '织络', '凝魂', '御土', '合道', '道君'] as const;

export type OriginId = 'mountain' | 'clan' | 'wanderer' | 'fallen';
export type VowId = 'guard' | 'freedom' | 'supreme' | 'mercy';

export interface DaoPatternState {
  insight: number;
  engraved: number;
  harmony: number;
  namedPatterns: string[];
}

export interface SoulState {
  power: number;
  maxPower: number;
  stability: number;
}

export interface TerritoryState {
  nodes: number;
  control: number;
  food: number;
  spiritStones: number;
  influence: number;
}

export interface Character {
  name: string;
  origin: OriginId;
  path: DaoPath;
  vow: VowId;
  age: number;
  lifespan: number;
  realm: number;
  health: number;
  maxHealth: number;
  qi: number;
  maxQi: number;
  reputation: number;
  karma: number;
}

export interface Effect {
  health?: number;
  qi?: number;
  insight?: number;
  harmony?: number;
  soul?: number;
  maxSoul?: number;
  stability?: number;
  nodes?: number;
  control?: number;
  food?: number;
  spiritStones?: number;
  influence?: number;
  reputation?: number;
  karma?: number;
  item?: string;
}

export interface EventChoice {
  label: string;
  result: string;
  effect: Effect;
}

export interface GameEvent {
  id: string;
  title: string;
  text: string;
  actions: CoreAction[];
  paths?: DaoPath[];
  minRealm?: number;
  choices: [EventChoice, EventChoice];
}

export interface GameItem {
  id: string;
  name: string;
  category: '丹药' | '法器' | '道材' | '秘宝';
  rarity: '凡' | '玄' | '地' | '天';
  description: string;
  consumable: boolean;
  effect: Effect;
}

export type EndingKey =
  | 'death'
  | 'oldAge'
  | 'swordSupreme'
  | 'spellSupreme'
  | 'bodySupreme'
  | 'soulSupreme'
  | 'conqueror'
  | 'patternSage'
  | 'soulAscendant'
  | 'magnate'
  | 'benevolent'
  | 'wanderer';

export interface Ending {
  id: EndingKey;
  title: string;
  rank: '凡' | '玄' | '地' | '天';
  description: string;
}

export interface LogEntry {
  turn: number;
  tone: 'normal' | 'good' | 'danger' | 'thunder';
  text: string;
}

/**
 * One audited roll. The reason and the pre-roll PRNG state travel with the
 * value so any 命途 can be replayed and checked die by die.
 */
export interface DiceRoll {
  id: number;
  turn: number;
  /** Face-count label, e.g. `D8`, `D100`. */
  die: string;
  value: number;
  reason: string;
  seedBefore: number;
  sealed?: boolean;
}

/** One link of the per-command hash chain. */
export interface AuditChainEntry {
  turn: number;
  command: string;
  rollValues: number[];
  /** sha256(prevHash | turn | command | rollValues) */
  hash: string;
}

export const COMBAT_TACTICS = ['力破', '周旋', '布纹', '摄神', '吞丹', '遁土'] as const;
export type CombatTactic = (typeof COMBAT_TACTICS)[number];

/** 胜 / 劫财 / 夺命 / 遁 — the four ways a 斗法 can end. */
export type CombatResult = 'win' | 'robbed' | 'slain' | 'fled';

export interface Foe {
  id: string;
  name: string;
  /** Lowest realm index at which this foe appears. */
  tier: number;
  power: number;
  hp: number;
  guard: number;
  stones: [number, number];
  loot?: string;
  /** 夺命之敌: defeat is death, not merely robbery. */
  lethal: boolean;
  fleeable: boolean;
  intro: string;
}

export interface CombatState {
  foeId: string;
  foeHp: number;
  foeMaxHp: number;
  round: number;
  /** 破绽: the next 力破 strikes true. */
  opening: boolean;
  /** 蓄势: a charged strike is banked. */
  charged: boolean;
  fleeFailures: number;
  log: string[];
  over: boolean;
  result: CombatResult | null;
}

export interface GameState {
  version: 1;
  seed: number;
  turn: number;
  character: Character;
  daoPattern: DaoPatternState;
  soul: SoulState;
  territory: TerritoryState;
  inventory: string[];
  seenEvents: string[];
  pendingEvent: string | null;
  /** A milestone ending offered but not yet answered (opt-in endings). */
  pendingMilestone: EndingKey | null;
  /** Milestones waved away — never offered again. */
  declinedEndings: EndingKey[];
  combat: CombatState | null;
  rolls: DiceRoll[];
  /** Monotonic roll counter; survives trimming of the roll trail. */
  rollCount: number;
  auditChain: AuditChainEntry[];
  /** Hash preceding the first retained chain entry (genesis until trimmed). */
  chainStart: string;
  /** Head of the hash chain — mirrored into the save envelope. */
  auditHash: string;
  logs: LogEntry[];
  ending: EndingKey | null;
}

export interface CreationOptions {
  name: string;
  origin: OriginId;
  path: DaoPath;
  vow: VowId;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  state: GameState;
}
