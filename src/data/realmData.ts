/**
 * realmData.ts — 境界数据
 * 凡人 → 炼气一至十三层(层内自动升) → 筑基 → 金丹 → 元婴 → 化神。
 * 筑基起分 初期/中期/后期/大圆满 四阶;大境界突破需「突破」指令 + D100。
 * 数值目标(PLAN §8):正常游玩 30–50 回合摸到筑基;金丹起突破失败有死劫。
 */
import type { RealmDef, RealmId, Stage } from './types';

export const STAGES: Stage[] = ['初期', '中期', '后期', '大圆满'];

export const REALM_ORDER: RealmId[] = ['mortal', 'qi', 'foundation', 'core', 'nascent', 'deity'];

export const REALMS: RealmDef[] = [
  {
    id: 'mortal',
    name: '凡人',
    title: '凡夫俗子',
    lifespan: 80,
    baseExpPerLevel: [100],
    powerBase: 5,
    breakthroughBaseChance: 100, // 有灵根即可引气入体(创建流程内完成)
    failurePenalty: { expLossPct: [0, 0], injuryChance: 0, deathChance: 0 },
    breakthroughNarrative: {
      success: '一缕天地灵气顺汝百会而入,游走四肢百骸。凡俗之躯,自此开了一道缝。',
      failure: '灵气过体而不入。汝仍是凡人。',
    },
    desc: '未曾引气入体者。寿不过八十,病来如山倒,蝼蚁尚且偷生,人亦如是。',
  },
  {
    id: 'qi',
    name: '炼气',
    title: '炼气士',
    lifespan: 120,
    layers: 13,
    baseExpPerLevel: [100, 130, 170, 220, 290, 370, 470, 590, 730, 900, 1100, 1330, 1600],
    powerBase: 12,
    perLayerPower: 8,
    breakthroughBaseChance: 100, // 引气入体视为必成;层内满修为自动升层
    failurePenalty: { expLossPct: [10, 20], injuryChance: 10, deathChance: 0 },
    breakthroughNarrative: {
      success: '丹田之内,气感初成,如一星萤火落于荒原。自此汝与凡人,殊途。',
      failure: '气息散乱,功亏一篑。',
    },
    desc: '吐纳天地灵气,凝于丹田。一至十三层,层层如登阶——阶上有人回头看汝,阶下有人再也上不来。',
  },
  {
    id: 'foundation',
    name: '筑基',
    title: '筑基真修',
    lifespan: 200,
    stages: STAGES,
    baseExpPerLevel: [2400, 3600, 5200, 7200],
    powerBase: 160,
    stagePowerMult: [1, 1.3, 1.7, 2.2],
    breakthroughBaseChance: 40,
    failurePenalty: { expLossPct: [30, 50], injuryChance: 40, deathChance: 0 },
    breakthroughNarrative: {
      success:
        '灵气如潮,自四方汇入丹田,虚浮之气尽数凝实,道基铸成。' +
        '汝闭目七日,睁眼时,看见了从前看不见的东西——风里的灵机,人身后的气数。世人自此称汝一声:真修。',
      failure:
        '气机行至紫府,轰然溃散。经脉如遭鞭笞,汝呕血三升,道基未成,修为倒卷。' +
        '天道不语,只留一问:汝之道,止步于此乎?',
    },
    desc: '筑道之基,凡胎初蜕。寿至两百,辟谷不食,已算半只脚踏出红尘。修仙界真正的门槛,在此。',
  },
  {
    id: 'core',
    name: '金丹',
    title: '金丹老祖',
    lifespan: 500,
    stages: STAGES,
    baseExpPerLevel: [12000, 18000, 26000, 36000],
    powerBase: 600,
    stagePowerMult: [1, 1.3, 1.7, 2.2],
    breakthroughBaseChance: 25,
    failurePenalty: { expLossPct: [30, 50], injuryChance: 50, deathChance: 5 },
    breakthroughNarrative: {
      success:
        '丹田之中,百炼灵液收束、旋转、凝实——铮然一声轻鸣,金丹初成,宝光内蕴。' +
        '方圆百里灵气为之一空。此后五百年寿数,一方之地,汝可称老祖。',
      failure:
        '结丹半途,灵液崩散,反噬如决堤之洪。汝气海翻覆,道行大损。' +
        '古往今来,卡死在这一步的惊才绝艳之辈,尸骨可以铺成一条路。今日,路上未添新石。',
      death:
        '丹毁人亡。灵液炸开的那一瞬,汝听见了自己经脉寸断的声音。' +
        '天道收回了借予汝的一切。结丹失败而死者,不入轮回记名——它见得太多了。',
    },
    desc: '灵液凝丹,寿增五百。金丹一成,便是一方老祖;金丹不成,便是一抔黄土。此界大能,十之八九,止步于此。',
  },
  {
    id: 'nascent',
    name: '元婴',
    title: '元婴真君',
    lifespan: 1000,
    stages: STAGES,
    baseExpPerLevel: [60000, 90000, 130000, 180000],
    powerBase: 2200,
    stagePowerMult: [1, 1.3, 1.7, 2.2],
    breakthroughBaseChance: 15,
    failurePenalty: { expLossPct: [35, 50], injuryChance: 60, deathChance: 10 },
    breakthroughNarrative: {
      success:
        '金丹碎,元婴生。一寸大小的婴孩盘坐于汝丹田,眉目与汝一般无二,睁眼一笑,天地皆惊。' +
        '自此神识千里,夺舍重生,御空而行。千年寿数,真君之名,响彻一域。',
      failure:
        '碎丹化婴,婴未成而丹已碎。汝抱着空荡荡的丹田枯坐三月,如守一座空坟。' +
        '道行倒退,心魔滋生。碎丹重结,难于登天——但登天这条路,本也没人说过容易。',
      death:
        '丹碎,婴亡,神魂俱灭。汝一生积攒的道行,在这一夜散还天地。' +
        '天道记曰:又一人,倒在了化婴关前。语气与记录一场秋雨,并无不同。',
    },
    desc: '碎丹化婴,神游太虚。元婴真君之下,皆为蝼蚁——这话是元婴真君说的,蝼蚁们没有异议的资格。',
  },
  {
    id: 'deity',
    name: '化神',
    title: '化神大能',
    lifespan: 1500,
    stages: STAGES,
    baseExpPerLevel: [300000, 450000, 650000, 900000],
    powerBase: 7000,
    stagePowerMult: [1, 1.3, 1.7, 2.2],
    breakthroughBaseChance: 8,
    failurePenalty: { expLossPct: [40, 60], injuryChance: 70, deathChance: 15 },
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
];

export const REALM_BY_ID: Record<RealmId, RealmDef> = Object.fromEntries(
  REALMS.map((r) => [r.id, r]),
) as Record<RealmId, RealmDef>;

/** 下一个大境界(化神之后为 null → 飞升结局) */
export function nextRealm(id: RealmId): RealmId | null {
  const i = REALM_ORDER.indexOf(id);
  return i >= 0 && i < REALM_ORDER.length - 1 ? REALM_ORDER[i + 1] : null;
}

/** 展示用境界全称,如「炼气七层」「金丹中期」 */
export function realmLabel(id: RealmId, qiLayer?: number, stage?: Stage): string {
  const def = REALM_BY_ID[id];
  if (id === 'mortal') return def.name;
  if (id === 'qi') return `${def.name}${CN_NUMS[qiLayer ?? 1] ?? qiLayer}层`;
  return `${def.name}${stage ?? '初期'}`;
}

const CN_NUMS: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七',
  8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三',
};
