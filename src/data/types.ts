/**
 * 《凡人修仙传·人生模拟器》— 游戏内容数据类型
 * =====================================================================
 * ⚠ INTEGRATION NOTE:
 * `src/engine/types.ts` did not exist when this file was written.
 * All shapes below follow PLAN.md §2 exactly where PLAN defines them,
 * with content-driven extensions marked `[ext]`.
 *
 * When the engine lands, either:
 *   (a) move these interfaces into `src/engine/types.ts` and re-export
 *       them from here (`export * from '../engine/types'`), or
 *   (b) have `src/engine/types.ts` import from `src/data/types.ts`.
 *
 * Nothing in src/data/** imports React or browser APIs — pure const data.
 * =====================================================================
 */

// ===== 五维属性 (PLAN §2) =====
export interface Attributes {
  genGu: number;   // 根骨 — HP、突破成功率
  wuXing: number;  // 悟性 — 修炼速度、功法参悟
  xinXing: number; // 心性 — 心魔抗性、事件选项
  jiYuan: number;  // 机缘 — 隐藏属性,永不显示于任何 UI
  qiYun: number;   // 气运 — 事件表偏移、掉落品质
}
export type AttributeKey = keyof Attributes;

// ===== 五行 & 变异灵根 =====
export type BaseElement = '金' | '木' | '水' | '火' | '土';
export type MutantElement = '雷' | '冰' | '风'; // [ext] 异灵根变异属性
export type Element = BaseElement | MutantElement;

// ===== 灵根 (PLAN §6.2) =====
export type SpiritRootGrade =
  | '天灵根' | '异灵根' | '真灵根' | '双灵根' | '三灵根' | '四灵根' | '五灵根';

export interface SpiritRootTier {
  grade: SpiritRootGrade;
  range: [number, number];       // D100 闭区间
  speedMultiplier: number;       // 修炼速度倍率
  elementCount: number;          // 属性数量(异灵根为 1 个变异属性)
  mutant?: boolean;              // 是否从变异属性池抽取
  /** [ext] 测灵碑揭示文案 — 分段渐次显示,营造抽卡张力 */
  revealLines: string[];
  /** [ext] 天道短评 — 揭示完毕后的落款一句 */
  verdict: string;
  /** [ext] 附带暗记 — 引擎按键名解释,如 五灵根 苦熬心志 */
  bonusFlags?: Record<string, boolean | number>;
  /** [ext] UI 色彩提示 */
  color: 'gold' | 'jade' | 'normal' | 'muted';
}

// ===== 境界 (PLAN §2 / §6.3) =====
export type RealmId = 'mortal' | 'qi' | 'foundation' | 'core' | 'nascent' | 'deity';
export type Stage = '初期' | '中期' | '后期' | '大圆满';

export interface RealmDef {
  id: RealmId;
  name: string;                  // 凡人 / 炼气 / 筑基 …
  title: string;                 // [ext] 世人称谓,如「筑基真修」
  lifespan: number;              // 该境界总寿元
  layers?: number;               // 炼气 13
  stages?: Stage[];
  baseExpPerLevel: number[];     // 每层/每阶所需修为
  powerBase: number;             // 战力基数
  perLayerPower?: number;        // [ext] 炼气每层战力增量
  stagePowerMult?: number[];     // [ext] 初/中/后/大圆满 战力乘数
  breakthroughBaseChance: number;// 突破进入该境界的基础成功率(%)
  failurePenalty: {
    expLossPct: [number, number];// 失败损失修为百分比区间
    injuryChance: number;        // 受伤(含心魔)概率 %
    deathChance: number;         // 身死概率 %(金丹起)
  };
  /** [ext] 突破叙事 — 天道口吻 */
  breakthroughNarrative: { success: string; failure: string; death?: string };
  desc: string;
}

// ===== 出身 (PLAN §6.1) =====
export interface OriginPerk {
  id: string;
  name: string;
  desc: string;
  /**
   * 引擎钩子(按键名解释):
   *  injuryTurnsDelta      伤势持续回合增减
   *  gatherDouble          采集灵草双倍概率(0-1)
   *  techniqueLearnBonus   功法参悟加成(%)
   *  marketSellRate        坊市卖出比例(默认 0.5)
   *  marketBuyRate         坊市买入比例(默认 1.0)
   *  alchemyBonus          炼丹成功率加成(%)
   *  sectStart             开局即为宗门杂役
   *  deathSaveOnce         一世一次,免死留 1 HP
   *  insightEventBonus     顿悟类事件检定加值
   */
  hooks: Record<string, number | boolean | string>;
}

export interface OriginDef {
  id: string;
  name: string;
  tagline: string;               // [ext] 一句话点题
  story: string;                 // [ext] 天道口吻的出身长文
  attributeMods: Partial<Attributes>;
  startSpiritStones: number;
  startItems: ItemStack[];
  startFlags?: Record<string, boolean | number>;
  startTechniqueId?: string;     // [ext] 开局功法(修仙世家)
  perk: OriginPerk;
  /** [ext] 埋线钩子 — 后续以专属事件/支线回收 */
  hookLines: string[];
  hookEventIds: string[];
}

// ===== 功法 & 战斗术法 (PLAN §6.4) =====
export type TechniqueGrade = '黄阶' | '玄阶' | '地阶' | '天阶';

export interface TechniqueDef {
  id: string;
  name: string;
  grade: TechniqueGrade;
  elementAffinity: Element[] | null; // 灵根匹配 ×1.2 修炼速度(引擎实现)
  speedBonus: number;            // 修炼速度乘数,如 1.15
  powerBonus: number;            // 战力加成(平添)
  minRealm: RealmId;
  price: number | null;          // null = 非卖品(事件/任务限定)
  source: string;                // [ext] 获取途径说明
  desc: string;                  // [ext] 功法品鉴文
}

export interface CombatArtDef {
  id: string;
  name: string;
  element: Element | null;
  powerBonus: number;            // 战斗中释放的附加战力
  minRealm: RealmId;
  price: number | null;
  source: string;
  desc: string;
}

// ===== 物品 (PLAN §6.5) =====
export type ItemKind =
  | 'pill' | 'weapon' | 'armor' | 'accessory'
  | 'talisman' | 'material' | 'manual' | 'treasure' | 'misc';

export interface ItemEffect {
  hp?: number;                   // 回复生命
  hpPct?: number;                // 按比例回复(0-1)
  exp?: number;                  // 增加修为
  breakthroughBonus?: number;    // 下一次突破成功率加成(服用后挂 buff)
  attribute?: [AttributeKey, number]; // 永久属性增减
  cureInjury?: boolean;
  cureHeartDemon?: boolean;
  lifespan?: number;             // 寿元增减
  rootWash?: number;             // [ext] 洗髓:灵根速率 +N(引擎限制叠加次数)
  teachTechniqueId?: string;     // [ext] 玉简类:习得功法
  teachCombatArtId?: string;     // [ext] 符卷类:习得术法
  grantFlag?: [string, boolean | number];
  special?: string;              // [ext] 引擎特判键,如 'mystic_vial'
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  grade: 1 | 2 | 3 | 4 | 5;
  price: number;                 // 0 = 无市价
  sellable: boolean;
  desc: string;
  effect?: ItemEffect;
  power?: number;                // 武器
  defense?: number;              // 防具
  slot?: 'weapon' | 'armor' | 'accessory';
  hidden?: boolean;              // [ext] 永不出现于坊市/鉴定文案(神秘小瓶)
  unique?: boolean;              // [ext] 一世仅得一件
}

export interface ItemStack { itemId: string; count: number }

// ===== 丹方 (PLAN §6.5) =====
export interface RecipeDef {
  id: string;
  name: string;
  resultItemId: string;
  resultCount: number;
  materials: ItemStack[];
  baseSuccess: number;           // 基础成功率 %(+悟性×2,+出身加成)
  minRealm: RealmId;
  fee: number;                   // 丹炉损耗灵石
  desc: string;
}

// ===== 事件 (PLAN §6.6) =====
export type EventBucket = '大凶' | '小凶' | '平' | '小吉' | '大吉';
export type EventCategory =
  | 'village'    // 村落市井
  | 'sect'       // 宗门
  | 'wilderness' // 荒野历练
  | 'market'     // 坊市
  | 'seclusion'  // 闭关静修
  | 'destiny'    // 机缘(隐藏池)
  | 'origin';    // 出身专属埋线

export interface EventCondition {
  realms?: RealmId[];            // 限定境界
  minQiLayer?: number;
  requireFlags?: Record<string, boolean | number>;
  forbidFlags?: string[];
  minJiYuan?: number;            // 隐藏机缘门槛 — 永不向玩家展示
  originId?: string;             // 出身专属
  sectRequired?: boolean;        // 需已入宗门
  once?: boolean;                // 一世一次
}

export interface EventEffect {
  narrative: string;             // 结果叙事(天道口吻)
  exp?: number;
  hp?: number;
  spiritStones?: number;
  items?: ItemStack[];
  removeItems?: ItemStack[];
  attribute?: [AttributeKey, number];
  favor?: [string, number];      // [npcId, delta]
  injury?: string;               // 伤势 id:'light'|'heavy'|'heartDemon' 或自定义
  combat?: string;               // enemyId — 转入战斗
  setFlags?: Record<string, boolean | number>;
  lifespan?: number;
  teachTechniqueId?: string;
  teachCombatArtId?: string;
  questUnlock?: string;          // 解锁支线
  death?: { endingId: string };  // 直接身死 → 指定结局
}

export interface EventChoice {
  text: string;
  check?: { attr: AttributeKey; dc: number };  // D20 + 属性 vs DC
  requireItem?: string;          // 需消耗指定物品方可选(如 遁地符)
  consumeItem?: boolean;         // 选择后是否消耗 requireItem(默认 true)
  success: EventEffect;
  failure?: EventEffect;
}

export interface GameEvent {
  id: string;
  name: string;
  bucket: EventBucket;
  category: EventCategory;
  weight: number;                // 同桶内加权
  condition?: EventCondition;
  narrative: string;             // 天道旁白,冷峻克制,约 200–400 字
  choices?: EventChoice[];       // 无选项 = autoEffect 自动结算
  autoEffect?: EventEffect;
  /**
   * [ext] 特例机制:
   *  independentChancePct — 不走 D100 桶,每回合独立判定(神秘小瓶 2%)
   *  secret — 审计只记「天机」二字,不记事件名(保密机制)
   */
  special?: { independentChancePct?: number; secret?: boolean };
}

// ===== 地点 (PLAN §3.5 探索) =====
export interface LocationDiscovery {
  weight: number;
  desc: string;                  // 探索所见(天道口吻)
  effect: EventEffect;
}

export interface LocationDef {
  id: string;
  name: string;
  region: string;                // 所属地域,如「青牛镇左近」「落霞宗山门」
  desc: string;
  minRealm: RealmId;
  minQiLayer?: number;
  dangerLevel: 0 | 1 | 2 | 3 | 4 | 5;
  unlockFlag?: string;           // 需事件/任务解锁
  enemyPool: string[];           // 可能遭遇的敌人 id
  encounterChancePct: number;    // 遇敌概率 %
  discoveries: LocationDiscovery[];
}

// ===== NPC (PLAN §3.7) =====
export interface NpcThreshold { at: number; unlock: string; desc: string }

export interface NpcDef {
  id: string;
  name: string;
  identity: string;              // 身份,如「万宝楼掌柜」
  personality: string;           // 性情
  motive: string;                // 表层动机(可展示)
  hiddenMotive?: string;         // [ext] 暗线动机 — 永不直接展示,由事件揭露
  location: string;              // 常驻地点 id
  initialFavor: number;          // -100…100
  gifts: { loves: string[]; likes: string[]; hates: string[] }; // item ids
  giftNotes: string;             // 赠礼线索(NPC 台词侧写)
  thresholds: NpcThreshold[];
  hostileTrack?: boolean;        // 敌意线 NPC(好感为负向下解锁袭杀)
  lines: { greeting: string; highFavor: string; lowFavor: string };
}

// ===== 任务 (PLAN §3.7) =====
export type QuestStatus = 'locked' | 'active' | 'done' | 'failed';

export interface QuestChoice {
  text: string;
  check?: { attr: AttributeKey; dc: number };
  effect: EventEffect;
  failure?: EventEffect;
  nextQuestId?: string;          // 主线:选择通向的下一节点
}

export interface QuestDef {
  id: string;
  kind: 'main' | 'side';
  arc?: number;                  // 主线卷数 1/2/3
  title: string;
  giver?: string;                // npc id
  narrative: string;
  unlockCondition?: EventCondition;
  objective?: {
    type: 'reachRealm' | 'killEnemy' | 'obtainItem' | 'favor' | 'visitLocation' | 'flag';
    target: string;
    n?: number;
    desc: string;
  };
  choices?: QuestChoice[];
  reward: EventEffect;
}

// ===== 结局 (PLAN §6.7) =====
export interface EndingDef {
  id: string;
  title: string;
  category: 'death' | 'retire' | 'victory' | 'special';
  condition: string;             // 触发说明(引擎按 id 匹配,此处仅文档)
  narrative: string;             // 天道终语
  epitaph: string;               // 墓志铭 — 诗化短句,刻于结局画面
  tone: 'gold' | 'jade' | 'danger' | 'normal';
}

// ===== 敌人 (PLAN §2 Enemy) =====
export interface LootEntry { itemId: string; chancePct: number; count?: number }

export interface EnemyDef {
  id: string;
  name: string;
  species: string;               // 妖兽/散修/魔修/傀儡/邪祟…
  realmLabel: string;            // 展示用,如「炼气四层」「一阶妖兽」
  tier: number;                  // 0–6 匹配用粗略战力档
  power: number;
  hp: number;
  defense: number;
  loot: LootEntry[];
  spiritStones: [number, number];
  fleeable: boolean;
  lethal?: boolean;              // 败北即死(否则被劫/负伤)
  desc: string;
  taunt?: string;                // 遭遇台词(妖兽则为天道侧写)
}
