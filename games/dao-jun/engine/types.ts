export const DAO_PATHS = ['剑', '法', '体', '神'] as const;
export type DaoPath = (typeof DAO_PATHS)[number];

export const ACTIONS = ['悟道', '凝纹', '斗法', '占地', '突破'] as const;
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
  engraved?: number;
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
