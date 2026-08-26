/**
 * techniques.ts — 功法路线 (the branching technique tree)
 *
 * Five routes, each a small tree: one 入门 trunk, two 精修 branches, and a
 * 大成 capstone hanging off each branch. Learning any trunk commits the
 * character to that route — the other four trunks close forever, so the choice
 * made around 引气 decides what kind of cultivator you end up being.
 *
 * 图录 is the exception: it is hidden until the three 残卷 wake, and it can be
 * taken *alongside* an existing route.
 */

import type { RealmId, RouteDef, RouteId, TechniqueNode } from '@/engine/types';
import { realmOrder } from './realms';

export const ROUTES: readonly RouteDef[] = [
  {
    id: 'dao',
    name: '太一清静道',
    motto: '不争,故天下莫能与之争。',
    desc: '修得慢些,活得久些。清静者气运不盛,劫数亦不盛。',
    affinitySectId: 'taiyi',
  },
  {
    id: 'fo',
    name: '大梵舍身道',
    motto: '我不入地狱,谁入地狱。',
    desc: '以功德抵劫数,以肉身抗雷火。走这条路的人,后半程最稳。',
    affinitySectId: 'dafan',
  },
  {
    id: 'mo',
    name: '血蕴夺运道',
    motto: '天既不予,便自取之。',
    desc: '夺人气运以补己身。最快的路,也是账单来得最快的路。',
    affinitySectId: 'xueyun',
  },
  {
    id: 'ru',
    name: '稷下经世道',
    motto: '善弈者谋势,不谋子。',
    desc: '以世事为局,以推演为刃。不擅斗法,却极少输。',
    affinitySectId: 'jixia',
  },
  {
    id: 'tulu',
    name: '灭运图录道',
    motto: '运可灭,劫不可欺。',
    desc: '图录既醒,可于他人气运之柱上落笔。此道无师,只有卷。',
    affinitySectId: 'yinyang',
    hidden: true,
    unlockFlag: 'tuluAwake',
  },
];

export const ROUTE_BY_ID: Record<RouteId, RouteDef> = Object.fromEntries(
  ROUTES.map((r) => [r.id, r]),
) as Record<RouteId, RouteDef>;

export const TECHNIQUES: readonly TechniqueNode[] = [
  // ---- 太一清静道 ---------------------------------------------------------
  {
    id: 'dao1',
    name: '太一清静经',
    route: 'dao',
    tier: 1,
    requires: null,
    minRealm: 'yinqi',
    costStones: 300,
    difficulty: 10,
    desc: '心如止水,则气自匀。',
    effects: { cultivationMult: 1.15, calamityRateMult: 0.9 },
  },
  {
    id: 'dao2a',
    name: '坐忘篇',
    route: 'dao',
    tier: 2,
    requires: 'dao1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 30,
    desc: '忘身、忘物、忘我。忘得越干净,天机越难寻你。',
    effects: { cultivationMult: 1.16, calamityRateMult: 0.85, breakthroughBonus: 5 },
  },
  {
    id: 'dao2b',
    name: '御剑术·青冥',
    route: 'dao',
    tier: 2,
    requires: 'dao1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 32,
    desc: '清静非无锋。一剑既出,不留余地。',
    effects: { powerBonus: 42, cultivationMult: 1.05 },
  },
  {
    id: 'dao3a',
    name: '无为大法',
    route: 'dao',
    tier: 3,
    requires: 'dao2a',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 55,
    desc: '不为者,天亦无从加之以劫。',
    effects: { cultivationMult: 1.1, calamityRateMult: 0.72, mitigationBonus: 14 },
  },
  {
    id: 'dao3b',
    name: '天罡剑罡',
    route: 'dao',
    tier: 3,
    requires: 'dao2b',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 58,
    desc: '三十六道剑罡绕身,雷来亦斩。',
    effects: { powerBonus: 150, breakthroughBonus: 4 },
  },

  // ---- 大梵舍身道 ---------------------------------------------------------
  {
    id: 'fo1',
    name: '大梵金身诀',
    route: 'fo',
    tier: 1,
    requires: null,
    minRealm: 'yinqi',
    costStones: 300,
    difficulty: 12,
    desc: '先炼此身,再谈度人。',
    effects: { hpBonus: 60, meritPerTurn: 1 },
  },
  {
    id: 'fo2a',
    name: '舍身度厄经',
    route: 'fo',
    tier: 2,
    requires: 'fo1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 30,
    desc: '代人受过,以功德折劫数。',
    effects: { mitigationBonus: 16, meritPerTurn: 2, calamityRateMult: 0.85 },
  },
  {
    id: 'fo2b',
    name: '金刚伏魔印',
    route: 'fo',
    tier: 2,
    requires: 'fo1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 33,
    desc: '慈悲不碍雷霆手段。',
    effects: { powerBonus: 56, hpBonus: 80 },
  },
  {
    id: 'fo3a',
    name: '涅槃寂静经',
    route: 'fo',
    tier: 3,
    requires: 'fo2a',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 56,
    desc: '寂灭为乐。劫数临身,如风过耳。',
    effects: {
      mitigationBonus: 26,
      meritPerTurn: 3,
      calamityRateMult: 0.7,
      cultivationMult: 0.95,
    },
  },
  {
    id: 'fo3b',
    name: '不动明王身',
    route: 'fo',
    tier: 3,
    requires: 'fo2b',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 58,
    desc: '不动如山,雷火加身而眉不动。',
    effects: { powerBonus: 155, hpBonus: 240, breakthroughBonus: 6 },
  },

  // ---- 血蕴夺运道 ---------------------------------------------------------
  {
    id: 'mo1',
    name: '血蕴夺运功',
    route: 'mo',
    tier: 1,
    requires: null,
    minRealm: 'yinqi',
    costStones: 300,
    difficulty: 14,
    desc: '取他人气运如取囊中物。代价记在你自己的账上。',
    effects: { fortuneGainMult: 1.35, calamityRateMult: 1.3, powerBonus: 22 },
  },
  {
    id: 'mo2a',
    name: '噬运魔诀',
    route: 'mo',
    tier: 2,
    requires: 'mo1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 34,
    desc: '一口吞尽,连渣也不剩。',
    effects: { fortuneGainMult: 1.6, calamityRateMult: 1.5, meritPerTurn: -1 },
  },
  {
    id: 'mo2b',
    name: '血影遁法',
    route: 'mo',
    tier: 2,
    requires: 'mo1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 32,
    desc: '化血为影,来去无形。',
    effects: { powerBonus: 72, calamityRateMult: 1.15 },
  },
  {
    id: 'mo3a',
    name: '万运归一',
    route: 'mo',
    tier: 3,
    requires: 'mo2a',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 62,
    desc: '万人之运,归于一身。一身之劫,亦当万人之数。',
    effects: {
      fortuneGainMult: 2,
      calamityRateMult: 1.8,
      cultivationMult: 1.25,
      meritPerTurn: -2,
    },
  },
  {
    id: 'mo3b',
    name: '血海无量',
    route: 'mo',
    tier: 3,
    requires: 'mo2b',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 60,
    desc: '血海翻涌处,无生亦无死。',
    effects: { powerBonus: 205, hpBonus: 160, calamityRateMult: 1.3 },
  },

  // ---- 稷下经世道 ---------------------------------------------------------
  {
    id: 'ru1',
    name: '经世策',
    route: 'ru',
    tier: 1,
    requires: null,
    minRealm: 'yinqi',
    costStones: 300,
    difficulty: 11,
    desc: '修行亦是治世。先算清账,再谈长生。',
    effects: { marketDiscount: 0.1, reputationMult: 1.3, cultivationMult: 1.05 },
  },
  {
    id: 'ru2a',
    name: '浩然正气歌',
    route: 'ru',
    tier: 2,
    requires: 'ru1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 29,
    desc: '气之浩然者,劫数亦须让路。',
    effects: { mitigationBonus: 11, meritPerTurn: 1, breakthroughBonus: 6 },
  },
  {
    id: 'ru2b',
    name: '纵横筹算',
    route: 'ru',
    tier: 2,
    requires: 'ru1',
    minRealm: 'tongxuan',
    costStones: 1800,
    difficulty: 31,
    desc: '不斗法,只算人。算准了,法自不必斗。',
    effects: { marketDiscount: 0.2, divinationDiscount: 0.35, reputationMult: 1.6 },
  },
  {
    id: 'ru3a',
    name: '春秋笔法',
    route: 'ru',
    tier: 3,
    requires: 'ru2a',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 55,
    desc: '一字之褒贬,可移人身后之运。',
    effects: {
      mitigationBonus: 19,
      meritPerTurn: 2,
      calamityRateMult: 0.85,
      breakthroughBonus: 8,
    },
  },
  {
    id: 'ru3b',
    name: '庙算天下',
    route: 'ru',
    tier: 3,
    requires: 'ru2b',
    minRealm: 'xuanguang',
    costStones: 9000,
    difficulty: 57,
    desc: '未战而庙算胜者,得算多也。',
    effects: {
      divinationDiscount: 0.5,
      reputationMult: 2,
      cultivationMult: 1.15,
      marketDiscount: 0.28,
    },
  },

  // ---- 灭运图录道 (hidden) -------------------------------------------------
  {
    id: 'tulu1n',
    name: '灭运图录·启卷',
    route: 'tulu',
    tier: 1,
    requires: null,
    minRealm: 'tongxuan',
    costStones: 0,
    difficulty: 25,
    desc: '卷开无字,读者自见其名。',
    effects: { fortuneGainMult: 1.4, powerBonus: 40 },
  },
  {
    id: 'tulu2n',
    name: '观运篇',
    route: 'tulu',
    tier: 2,
    requires: 'tulu1n',
    minRealm: 'xuanguang',
    costStones: 0,
    difficulty: 45,
    desc: '见人如见柱,见柱如见价。',
    effects: { divinationDiscount: 0.4, fortuneGainMult: 1.3 },
  },
  {
    id: 'tulu3n',
    name: '灭运真解',
    route: 'tulu',
    tier: 3,
    requires: 'tulu2n',
    minRealm: 'yuanshen',
    costStones: 0,
    difficulty: 70,
    desc: '落笔即灭。图录之上,从无涂改。',
    effects: {
      fortuneGainMult: 1.8,
      powerBonus: 185,
      calamityRateMult: 1.4,
      cultivationMult: 1.3,
    },
  },
];

export const TECHNIQUE_BY_ID: Record<string, TechniqueNode> = Object.fromEntries(
  TECHNIQUES.map((t) => [t.id, t]),
);

export function techniqueById(id: string): TechniqueNode | null {
  return TECHNIQUE_BY_ID[id] ?? null;
}

export function routeTrunk(route: RouteId): TechniqueNode | null {
  return TECHNIQUES.find((t) => t.route === route && t.tier === 1) ?? null;
}

export function techniquesOfRoute(route: RouteId): TechniqueNode[] {
  return TECHNIQUES.filter((t) => t.route === route);
}

/** Children of a node — what the tree branches into. */
export function childrenOf(id: string): TechniqueNode[] {
  return TECHNIQUES.filter((t) => t.requires === id);
}

export function meetsRealm(node: TechniqueNode, realm: RealmId): boolean {
  return realmOrder(realm) >= realmOrder(node.minRealm);
}
