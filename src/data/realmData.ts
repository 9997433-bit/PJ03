// ============================================================================
// realmData.ts — 境界数据与推演助手
// 凡人 → 炼气一至十三层 → 筑基 → 金丹 → 元婴 → 化神(各分初期/中期/后期/大圆满)。
// 本文件是境界规则的唯一事实来源:REALMS 记录 + 纯函数助手,供 engine/realms.ts
// 与各模块直接取用。导出为兼容超集(REALMS/REALM_BY_ID、realmLabel/realmDisplayName
// 等同义导出并存),以稳住引擎各处的既有引用。
// ============================================================================

import type { RealmId, RealmState, Stage } from '@/engine/types';

export const STAGES: readonly Stage[] = ['初期', '中期', '后期', '大圆满'];

export const REALM_ORDER: readonly RealmId[] = [
  'mortal', 'qi', 'foundation', 'core', 'nascent', 'deity',
];

/** 数据侧境界定义 — 引擎 RealmDef 的超集(expLoss 元组与 expLossMin/Max 并存)。 */
export interface RealmDataDef {
  id: RealmId;
  name: string;
  /** 世人称谓 */
  title: string;
  /** 该境界总寿元(年) */
  lifespan: number;
  layers?: number;
  stages?: readonly Stage[];
  /**
   * 每小级所需修为。炼气:下标 0 = 一层→二层 … 下标 12 = 十三层修满(叩关之墙)。
   * 分阶境界:下标 0-2 = 初/中/后期升阶,下标 3 = 大圆满之墙(修满方可【突破】)。
   * 凡人:引气入体所需。
   */
  baseExpPerLevel: number[];
  /** 战力基数(×阶段系数) */
  powerBase: number;
  /** 气血基数(类型兼容,引擎 deriveMaxHp 另有公式) */
  hpBase: number;
  /** 每回合修炼基础修为(类型兼容,引擎另有 BASE_GAIN) */
  cultivateExpBase: number;
  /** 突破进入【本境界】的基础成功率(%) */
  breakthroughBaseChance: number;
  /** 心魔劫难度(D20 心性检定 DC) */
  heartDemonDC: number;
  failurePenalty: {
    /** 修为折损百分比区间(元组形式,breakthrough.ts 使用) */
    expLoss: [number, number];
    expLossMin: number;
    expLossMax: number;
    /** 受伤概率 % */
    injuryChance: number;
    /** 陨落概率 %(金丹起) */
    deathChance: number;
  };
  /** 突破叙事(天道口吻) */
  breakthroughNarrative: { success: string; failure: string; death?: string };
  desc: string;
}

function penalty(
  lossMin: number, lossMax: number, injuryChance: number, deathChance: number,
): RealmDataDef['failurePenalty'] {
  return { expLoss: [lossMin, lossMax], expLossMin: lossMin, expLossMax: lossMax, injuryChance, deathChance };
}

export const REALMS: Record<RealmId, RealmDataDef> = {
  mortal: {
    id: 'mortal',
    name: '凡人',
    title: '凡夫俗子',
    lifespan: 80,
    baseExpPerLevel: [30],
    powerBase: 5,
    hpBase: 40,
    cultivateExpBase: 15,
    breakthroughBaseChance: 100,
    heartDemonDC: 8,
    failurePenalty: penalty(0, 0, 0, 0),
    breakthroughNarrative: {
      success: '一缕天地灵气顺百会而入,游走四肢百骸。凡俗之躯,自此开了一道缝。',
      failure: '灵气过体而不入。汝仍是凡人。',
    },
    desc: '未曾引气入体者。寿不过八十,病来如山倒。蝼蚁尚且偷生,人亦如是。',
  },
  qi: {
    id: 'qi',
    name: '炼气',
    title: '炼气士',
    lifespan: 120,
    layers: 13,
    baseExpPerLevel: [25, 35, 45, 60, 75, 90, 110, 130, 155, 180, 210, 245, 285],
    powerBase: 30,
    hpBase: 60,
    cultivateExpBase: 22,
    breakthroughBaseChance: 100,
    heartDemonDC: 10,
    failurePenalty: penalty(10, 20, 10, 0),
    breakthroughNarrative: {
      success: '丹田之内,气感初成,如一星萤火落于荒原。自此汝与凡人,殊途。',
      failure: '气息散乱,功亏一篑。',
    },
    desc: '吐纳天地灵气,凝于丹田。一至十三层,层层如登阶——阶上有人回头看汝,阶下有人再也上不来。',
  },
  foundation: {
    id: 'foundation',
    name: '筑基',
    title: '筑基真修',
    lifespan: 200,
    stages: STAGES,
    baseExpPerLevel: [1200, 1800, 2600, 3600],
    powerBase: 130,
    hpBase: 120,
    cultivateExpBase: 60,
    breakthroughBaseChance: 40,
    heartDemonDC: 12,
    failurePenalty: penalty(30, 50, 40, 0),
    breakthroughNarrative: {
      success:
        '灵气如潮,自四方汇入丹田,虚浮之气尽数凝实,道基铸成。汝闭目七日,睁眼时,' +
        '看见了从前看不见的东西——风里的灵机,人身后的气数。世人自此称汝一声:真修。',
      failure:
        '气机行至紫府,轰然溃散。经脉如遭鞭笞,汝呕血不止,道基未成,修为倒卷。' +
        '天道不语,只留一问:汝之道,止步于此乎?',
    },
    desc: '筑道之基,凡胎初蜕。寿至两百,辟谷不食,已算半只脚踏出红尘。修仙界真正的门槛,在此。',
  },
  core: {
    id: 'core',
    name: '金丹',
    title: '金丹老祖',
    lifespan: 500,
    stages: STAGES,
    baseExpPerLevel: [6000, 9000, 13000, 18000],
    powerBase: 520,
    hpBase: 300,
    cultivateExpBase: 160,
    breakthroughBaseChance: 25,
    heartDemonDC: 14,
    failurePenalty: penalty(30, 50, 50, 5),
    breakthroughNarrative: {
      success:
        '丹田之中,百炼灵液收束、旋转、凝实——铮然一声轻鸣,金丹初成,宝光内蕴。' +
        '方圆百里灵气为之一空。此后五百年寿数,一方之地,汝可称老祖。',
      failure:
        '结丹半途,灵液崩散,反噬如决堤之洪。汝气海翻覆,道行大损。' +
        '古往今来,卡死在这一步的惊才绝艳之辈,尸骨可以铺成一条路。今日,路上未添新石。',
      death:
        '丹毁人亡。灵液炸开的那一瞬,汝听见了自己经脉寸断的声音。' +
        '天道收回了借予汝的一切,如收回一场雨。',
    },
    desc: '灵液凝丹,寿增五百。金丹一成,便是一方老祖;金丹不成,便是一抔黄土。此界大能,十之八九,止步于此。',
  },
  nascent: {
    id: 'nascent',
    name: '元婴',
    title: '元婴真君',
    lifespan: 1000,
    stages: STAGES,
    baseExpPerLevel: [24000, 36000, 52000, 72000],
    powerBase: 2000,
    hpBase: 800,
    cultivateExpBase: 420,
    breakthroughBaseChance: 15,
    heartDemonDC: 16,
    failurePenalty: penalty(35, 55, 60, 10),
    breakthroughNarrative: {
      success:
        '金丹碎,元婴生。一寸大小的婴孩盘坐于丹田,眉目与汝一般无二,睁眼一笑,天地皆惊。' +
        '自此神识千里,御空而行。千年寿数,真君之名,响彻一域。',
      failure:
        '碎丹化婴,婴未成而丹已碎。汝抱着空荡荡的丹田枯坐三月,如守一座空坟。' +
        '碎丹重结,难于登天——但登天这条路,本也没人说过容易。',
      death:
        '丹碎,婴亡,神魂俱灭。汝一生积攒的道行,在这一夜散还天地。' +
        '天道记曰:又一人,倒在化婴关前。语气与记录一场秋雨,并无不同。',
    },
    desc: '碎丹化婴,神游太虚。元婴真君之下,皆为蝼蚁——这话是元婴真君说的,蝼蚁们没有异议的资格。',
  },
  deity: {
    id: 'deity',
    name: '化神',
    title: '化神大能',
    lifespan: 1500,
    stages: STAGES,
    baseExpPerLevel: [90000, 140000, 200000, 280000],
    powerBase: 7000,
    hpBase: 2000,
    cultivateExpBase: 900,
    breakthroughBaseChance: 8,
    heartDemonDC: 18,
    failurePenalty: penalty(40, 60, 70, 15),
    breakthroughNarrative: {
      success:
        '元婴与神识交融,化虚为实,一念动而方圆千里风云从之。' +
        '汝立于云端,第一次听清了天地脉络的搏动——像心跳,又像倒计时。' +
        '此界之内,汝已无敌。此界之外,门扉初现。',
      failure:
        '神识撞上天地屏障,如飞蛾撞钟。汝跌回肉身,七窍流血,百年道行付诸东流。' +
        '天道在上,冷眼看汝——它不拦汝,也不扶汝。',
      death:
        '神魂撞碎于天地屏障之上,如雪沫溅于铁壁。' +
        '一千年道行,一千年隐忍,尽归于风。天道翻过这一页,不曾稍停。',
    },
    desc: '炼神返虚,通天彻地。化神大圆满者,可窥破碎虚空之机——此界的尽头,是下一界的开始。',
  },
};

/** 同义导出:旧代码以 REALM_BY_ID 相称 */
export const REALM_BY_ID = REALMS;

/** 数组视图(按境界升序) */
export const REALMS_LIST: RealmDataDef[] = REALM_ORDER.map((id) => REALMS[id]);

export function getRealmDef(id: RealmId): RealmDataDef {
  return REALMS[id];
}

/** 境界序数:凡人0 炼气1 筑基2 金丹3 元婴4 化神5 */
export function realmIndex(id: RealmId): number {
  return REALM_ORDER.indexOf(id);
}

/** 同义:realmTier === realmIndex */
export function realmTier(id: RealmId): number {
  return realmIndex(id);
}

export function nextRealmId(id: RealmId): RealmId | null {
  const i = REALM_ORDER.indexOf(id);
  return i >= 0 && i < REALM_ORDER.length - 1 ? (REALM_ORDER[i + 1] ?? null) : null;
}

/** 同义导出:旧代码以 nextRealm 相称 */
export const nextRealm = nextRealmId;

/** 是否已至大境界天堑(修满后须【突破】,不可自进) */
export function atMajorGate(rs: RealmState): boolean {
  if (rs.realm === 'mortal') return false;
  if (rs.realm === 'qi') return rs.qiLayer >= 13;
  return rs.stage === '大圆满';
}

/** 当前小级修满所需修为 */
export function expNeededFor(rs: RealmState): number {
  const def = REALMS[rs.realm];
  if (rs.realm === 'mortal') return def.baseExpPerLevel[0] ?? 100;
  if (rs.realm === 'qi') {
    const idx = Math.max(0, Math.min(12, rs.qiLayer - 1));
    return def.baseExpPerLevel[idx] ?? def.baseExpPerLevel[0] ?? 100;
  }
  const idx = Math.max(0, STAGES.indexOf(rs.stage));
  return def.baseExpPerLevel[idx] ?? def.baseExpPerLevel[0] ?? 100;
}

/** 阶段战力系数:炼气按层递增;筑基以上按初/中/后/大圆满 */
export function stagePowerMultiplier(rs: RealmState): number {
  if (rs.realm === 'mortal') return 1;
  if (rs.realm === 'qi') return 1 + Math.max(0, rs.qiLayer - 1) * 0.15;
  const mults = [1, 1.35, 1.8, 2.4];
  return mults[Math.max(0, STAGES.indexOf(rs.stage))] ?? 1;
}

const CN_NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'];

/** 展示用境界全称,如「炼气七层」「金丹中期」 */
export function realmDisplayName(rs: RealmState): string {
  const def = REALMS[rs.realm];
  if (rs.realm === 'mortal') return def.name;
  if (rs.realm === 'qi') return `${def.name}${CN_NUMS[rs.qiLayer] ?? rs.qiLayer}层`;
  return `${def.name}${rs.stage}`;
}

/** 同义导出:旧代码以 realmLabel 相称 */
export const realmLabel = realmDisplayName;

/** 该境界总寿元;接受境界 id 或完整 RealmState */
export function lifespanFor(realm: RealmId | RealmState): number {
  const id = typeof realm === 'string' ? realm : realm.realm;
  return REALMS[id].lifespan;
}
