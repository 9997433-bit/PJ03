/**
 * realms.ts — 境界阶梯
 *
 * 凡尘 → 引气(九层) → 通玄 → 玄光 → 元神 → 洞真 → 长生
 *
 * Layers inside 引气 and stages inside 通玄 and above fill automatically; only
 * crossing from one realm to the next needs the 突破 command, and every such
 * crossing draws 劫运 — the higher you climb, the harder heaven looks at you.
 */

import type { RealmDef, RealmId, Stage } from '@/engine/types';

export const STAGES: readonly Stage[] = ['初期', '中期', '后期', '圆满'];

export const REALMS: Record<RealmId, RealmDef> = {
  mortal: {
    id: 'mortal',
    name: '凡尘',
    order: 0,
    baseExp: 40,
    expGrowth: 1,
    cultivationBase: 14,
    powerBase: 5,
    lifespan: 70,
    breakthroughBase: 100,
    calamityOnEntry: 0,
    failure: { expLoss: 0, injuryChance: 0, deathChance: 0 },
    desc: '未曾引气入体,与草木同朽。',
  },
  yinqi: {
    id: 'yinqi',
    name: '引气',
    order: 1,
    layers: 9,
    baseExp: 70,
    expGrowth: 1.22,
    cultivationBase: 26,
    powerBase: 14,
    lifespan: 110,
    breakthroughBase: 85,
    calamityOnEntry: 2,
    failure: { expLoss: 0.2, injuryChance: 20, deathChance: 0 },
    desc: '天地之气入经络,始知寒暑之外另有一世界。',
  },
  tongxuan: {
    id: 'tongxuan',
    name: '通玄',
    order: 2,
    stages: STAGES,
    baseExp: 760,
    expGrowth: 1.34,
    cultivationBase: 170,
    powerBase: 46,
    lifespan: 190,
    breakthroughBase: 46,
    calamityOnEntry: 7,
    failure: { expLoss: 0.35, injuryChance: 45, deathChance: 0 },
    desc: '窍穴既通,可御物、可辨气运之色。自此入了天机的账。',
  },
  xuanguang: {
    id: 'xuanguang',
    name: '玄光',
    order: 3,
    stages: STAGES,
    baseExp: 3200,
    expGrowth: 1.38,
    cultivationBase: 620,
    powerBase: 130,
    lifespan: 330,
    breakthroughBase: 32,
    calamityOnEntry: 13,
    failure: { expLoss: 0.4, injuryChance: 55, deathChance: 3 },
    desc: '一线玄光自眉心而出,照见他人身后气运之柱。',
  },
  yuanshen: {
    id: 'yuanshen',
    name: '元神',
    order: 4,
    stages: STAGES,
    baseExp: 12000,
    expGrowth: 1.42,
    cultivationBase: 2100,
    powerBase: 330,
    lifespan: 640,
    breakthroughBase: 21,
    calamityOnEntry: 20,
    failure: { expLoss: 0.45, injuryChance: 65, deathChance: 8 },
    desc: '神凝为形,离体亦存。劫数自此不再是譬喻。',
  },
  dongzhen: {
    id: 'dongzhen',
    name: '洞真',
    order: 5,
    stages: STAGES,
    baseExp: 44000,
    expGrowth: 1.46,
    cultivationBase: 7200,
    powerBase: 820,
    lifespan: 1300,
    breakthroughBase: 13,
    calamityOnEntry: 28,
    failure: { expLoss: 0.5, injuryChance: 70, deathChance: 15 },
    desc: '洞见真实,一念之间可夺一域气运。天诛已在门外。',
  },
  changsheng: {
    id: 'changsheng',
    name: '长生',
    order: 6,
    stages: STAGES,
    baseExp: 160000,
    expGrowth: 1.5,
    cultivationBase: 24000,
    powerBase: 1900,
    lifespan: 3000,
    breakthroughBase: 6,
    calamityOnEntry: 40,
    failure: { expLoss: 0.6, injuryChance: 80, deathChance: 25 },
    desc: '出图录之外,不为气运所载,亦不为劫数所录。',
  },
};

export const REALM_ORDER: readonly RealmId[] = [
  'mortal',
  'yinqi',
  'tongxuan',
  'xuanguang',
  'yuanshen',
  'dongzhen',
  'changsheng',
];

export function realmDef(id: RealmId): RealmDef {
  return REALMS[id];
}

export function realmOrder(id: RealmId): number {
  return REALMS[id].order;
}

export function realmById(order: number): RealmDef | null {
  const id = REALM_ORDER[order];
  return id ? REALMS[id] : null;
}

export function nextRealm(id: RealmId): RealmDef | null {
  return realmById(realmOrder(id) + 1);
}

export function stageIndex(stage: Stage): number {
  const i = STAGES.indexOf(stage);
  return i < 0 ? 0 : i;
}
