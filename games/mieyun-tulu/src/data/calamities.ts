/**
 * calamities.ts — 劫运表 (the signature system's content layer)
 *
 * 劫运 is a meter, not an event: it accrues from every good thing that happens
 * to you, and when the heavens finally collect, *this* table decides what form
 * the bill takes. Five kinds, ordered by how much of you they want:
 *
 *   心魔 — costs you clarity (an injury, cultivation debuff)
 *   血光 — costs you blood (hp, sometimes an injury)
 *   天雷 — costs you progress (exp, and it must be fought at higher tiers)
 *   业火 — costs you your things (stones, 气运, reputation)
 *   天诛 — costs you everything
 *
 * `vent` is how much 劫运 the storm discharges once it has landed. Surviving a
 * strike is the *cheap* way down the meter; 化解劫运 is the expensive way, and
 * it is the only one that does not hurt.
 */

import type { CalamityStrike, CalamityTier, InjuryDef, MitigationDef } from '@/engine/types';

// ============================================================================
// 伤势
// ============================================================================

export const INJURIES: readonly InjuryDef[] = [
  {
    id: 'xinmoZhang',
    name: '心魔障',
    severity: 1,
    turns: 4,
    desc: '静坐时耳边多了一个声音。它说的每一句你都同意过。',
    effect: { cultivation: -0.2, breakthrough: -6, calamity: 0.15 },
  },
  {
    id: 'jingmaiSun',
    name: '经脉损',
    severity: 1,
    turns: 3,
    desc: '气行至第三个周天便滞住,像绳结。',
    effect: { cultivation: -0.25, power: -0.12 },
  },
  {
    id: 'xuekuiZheng',
    name: '血亏证',
    severity: 2,
    turns: 5,
    desc: '面白如纸,提剑的手抖得不像自己的。',
    effect: { power: -0.25, cultivation: -0.15 },
  },
  {
    id: 'leihuoShang',
    name: '雷火伤',
    severity: 2,
    turns: 6,
    desc: '皮肉焦处结出树状的纹,雨天会痒。',
    effect: { power: -0.2, breakthrough: -10, cultivation: -0.2 },
  },
  {
    id: 'daojiLie',
    name: '道基裂',
    severity: 3,
    turns: 9,
    desc: '根子上的一道缝。补得住是命,补不住也是命。',
    effect: { cultivation: -0.45, breakthrough: -20, power: -0.2, calamity: 0.25 },
  },
  {
    id: 'shenhunCan',
    name: '神魂残',
    severity: 3,
    turns: 8,
    desc: '推演之后忘了自己刚才在算什么。这种忘,一次比一次深。',
    effect: { cultivation: -0.3, breakthrough: -14, calamity: 0.3 },
  },
];

export const INJURY_BY_ID: Record<string, InjuryDef> = Object.fromEntries(
  INJURIES.map((i) => [i.id, i]),
);

export function injuryById(id: string): InjuryDef | null {
  return INJURY_BY_ID[id] ?? null;
}

// ============================================================================
// 劫数阶
// ============================================================================

export const CALAMITY_TIERS: readonly CalamityTier[] = ['安泰', '微澜', '阴云', '雷动', '天诛'];

/** Lower bound of each tier on the 0–100 meter. */
export const TIER_FLOOR: Record<CalamityTier, number> = {
  安泰: 0,
  微澜: 20,
  阴云: 40,
  雷动: 60,
  天诛: 80,
};

export const TIER_OMEN: Record<CalamityTier, string> = {
  安泰: '天光平和,身后无影。',
  微澜: '偶有风过,吹动了不该动的东西。',
  阴云: '云脚压低。有人抬头看你,你找不到那个人。',
  雷动: '雷在云里滚了三圈,还没落。它在等一个由头。',
  天诛: '名录已开,墨迹犹湿。',
};

export function tierOf(value: number): CalamityTier {
  if (value >= TIER_FLOOR.天诛) return '天诛';
  if (value >= TIER_FLOOR.雷动) return '雷动';
  if (value >= TIER_FLOOR.阴云) return '阴云';
  if (value >= TIER_FLOOR.微澜) return '微澜';
  return '安泰';
}

// ============================================================================
// 劫数
// ============================================================================

export const CALAMITY_STRIKES: readonly CalamityStrike[] = [
  // ---- 微澜 ----------------------------------------------------------------
  {
    id: 'jie_yiyu',
    kind: '心魔',
    name: '意郁',
    tier: '微澜',
    narrative: '夜里醒来,想不起自己为什么要修行。天亮后想起来了,但慢了半刻。',
    severity: 1,
    expLossPct: 0.04,
    fortuneLoss: 2,
    vent: 8,
  },
  {
    id: 'jie_pofa',
    kind: '血光',
    name: '破法之痛',
    tier: '微澜',
    narrative: '御气时经络里断了一根极细的丝。不致命,但从此那处总是空的。',
    severity: 1,
    hpLossPct: 0.12,
    injuryId: 'jingmaiSun',
    vent: 9,
  },
  {
    id: 'jie_shicai',
    kind: '业火',
    name: '失财',
    tier: '微澜',
    narrative: '储物袋的绳结自己松了。你回头找了三里路,只找到绳结。',
    severity: 1,
    stoneLossPct: 0.15,
    vent: 8,
  },

  // ---- 阴云 ----------------------------------------------------------------
  {
    id: 'jie_xinmoying',
    kind: '心魔',
    name: '心魔现影',
    tier: '阴云',
    narrative: '打坐至第七日,对面坐下一个人。你没有对面。',
    severity: 2,
    enemyId: 'xinmo',
    injuryId: 'xinmoZhang',
    vent: 16,
  },
  {
    id: 'jie_xueguang',
    kind: '血光',
    name: '血光之灾',
    tier: '阴云',
    narrative: '一支不知从哪射来的箭,穿过了你昨天还不会站的那个位置。',
    severity: 2,
    hpLossPct: 0.3,
    injuryId: 'xuekuiZheng',
    vent: 15,
  },
  {
    id: 'jie_liuhuo',
    kind: '业火',
    name: '流火焚箧',
    tier: '阴云',
    narrative: '洞府起火。火不烧墙,只烧箱笼里那些你舍不得的东西。',
    severity: 2,
    stoneLossPct: 0.28,
    reputationLoss: 6,
    vent: 15,
  },
  {
    id: 'jie_shengu',
    kind: '天雷',
    name: '声鼓之雷',
    tier: '阴云',
    narrative: '晴天里响了一记闷雷。周围三个人抬头,只有你听见它在念一个名字。',
    severity: 2,
    hpLossPct: 0.2,
    expLossPct: 0.12,
    vent: 17,
  },

  // ---- 雷动 ----------------------------------------------------------------
  {
    id: 'jie_tianlei',
    kind: '天雷',
    name: '天雷法相',
    tier: '雷动',
    narrative: '云层裂开。落下来的不是雷,是一个照着你形状长出来的东西。',
    severity: 3,
    enemyId: 'tianlei',
    vent: 26,
  },
  {
    id: 'jie_duomingjian',
    kind: '血光',
    name: '夺命一剑',
    tier: '雷动',
    narrative: '仇家来得比预期早,理由比预期充分。',
    severity: 3,
    hpLossPct: 0.45,
    injuryId: 'leihuoShang',
    stoneLossPct: 0.1,
    vent: 24,
  },
  {
    id: 'jie_daoxin',
    kind: '心魔',
    name: '道心动摇',
    tier: '雷动',
    narrative: '你重新算了一遍这些年的账。算完之后,有一会儿不想再算了。',
    severity: 3,
    expLossPct: 0.22,
    fortuneLoss: 8,
    injuryId: 'shenhunCan',
    vent: 25,
  },
  {
    id: 'jie_yehuo',
    kind: '业火',
    name: '业火焚身',
    tier: '雷动',
    narrative: '火从衣裳里面烧起来。它只烧你做过的事,所以别人看不见烟。',
    severity: 4,
    enemyId: 'yehuo',
    vent: 30,
  },

  // ---- 天诛 ----------------------------------------------------------------
  {
    id: 'jie_zhulu',
    kind: '天诛',
    name: '天诛神使',
    tier: '天诛',
    narrative: '它没有面孔,只有一份名录。你的名字在最上面,墨迹犹新。',
    severity: 5,
    enemyId: 'tianzhu',
    vent: 45,
  },
  {
    id: 'jie_duanji',
    kind: '天诛',
    name: '断基之罚',
    tier: '天诛',
    narrative: '不打不杀。只是把你脚下那一块地,从图录上抹掉了。',
    severity: 5,
    expLossPct: 0.6,
    hpLossPct: 0.5,
    injuryId: 'daojiLie',
    fortuneLoss: 25,
    stoneLossPct: 0.4,
    vent: 40,
  },
];

export const STRIKE_BY_ID: Record<string, CalamityStrike> = Object.fromEntries(
  CALAMITY_STRIKES.map((s) => [s.id, s]),
);

export function strikeById(id: string): CalamityStrike | null {
  return STRIKE_BY_ID[id] ?? null;
}

/** Strikes eligible at a tier — a 天诛 draw may also reach down one step. */
export function strikesForTier(tier: CalamityTier): CalamityStrike[] {
  const pool = CALAMITY_STRIKES.filter((s) => s.tier === tier);
  return pool.length > 0 ? pool : CALAMITY_STRIKES.filter((s) => s.tier === '微澜');
}

// ============================================================================
// 化解劫运
// ============================================================================

export const MITIGATIONS: readonly MitigationDef[] = [
  {
    id: 'sanGongDe',
    name: '散功德',
    desc: '把积下的功德散给该得的人。账平了,天也就少看你一眼。',
    cost: { merit: 40 },
    relief: 14,
    baseChance: 72,
    costsTurn: true,
  },
  {
    id: 'sheCai',
    name: '舍财消灾',
    desc: '灵石本就是别人的气运换来的。还回去一部分,不算亏。',
    cost: { stones: 400 },
    relief: 10,
    baseChance: 80,
    costsTurn: true,
  },
  {
    id: 'yinNi',
    name: '隐匿气机',
    desc: '收敛身后那根柱子。天看不见你,便暂时懒得管你——代价是别人也看不见。',
    cost: { fortune: 12 },
    relief: 16,
    baseChance: 66,
    costsTurn: true,
  },
  {
    id: 'buZhen',
    name: '布蔽运阵',
    desc: '以符为眼,以石为枢,替自己搭一座假的命盘让天去读。',
    cost: { stones: 260, itemId: 'bianyunfu' },
    relief: 22,
    baseChance: 58,
    costsTurn: true,
  },
  {
    id: 'yingJie',
    name: '主动应劫',
    desc: '不等它来,自己走过去。选好时辰的劫,总比半夜里的劫讲道理。',
    cost: {},
    relief: 0,
    baseChance: 100,
    costsTurn: true,
  },
];

export const MITIGATION_BY_ID: Record<string, MitigationDef> = Object.fromEntries(
  MITIGATIONS.map((m) => [m.id, m]),
);

export function mitigationById(id: string): MitigationDef | null {
  return MITIGATION_BY_ID[id] ?? null;
}
