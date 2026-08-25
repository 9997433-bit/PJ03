import type { RealmDef, RealmId, RealmState, Stage } from '@/engine/types';

export const STAGES: Stage[] = ['初期', '中期', '后期', '大圆满'];

export const REALMS: RealmDef[] = [
  {
    id: 'mortal',
    name: '凡人',
    lifespan: 80,
    baseExp: 4,
    expPerLevel: 30,
    powerBase: 5,
    breakthroughBaseChance: 100,
    failurePenalty: { expLossPct: [0, 0], injuryChance: 0, deathChance: 0 },
  },
  {
    id: 'qi',
    name: '炼气',
    lifespan: 120,
    layers: 13,
    baseExp: 10,
    expPerLevel: 60,
    powerBase: 20,
    breakthroughBaseChance: 85, // 凡人 → 炼气 (引气入体)
    failurePenalty: { expLossPct: [10, 20], injuryChance: 10, deathChance: 0 },
  },
  {
    id: 'foundation',
    name: '筑基',
    lifespan: 200,
    stages: STAGES,
    baseExp: 16,
    expPerLevel: 400,
    powerBase: 120,
    breakthroughBaseChance: 40, // 炼气13 → 筑基
    failurePenalty: { expLossPct: [30, 50], injuryChance: 50, deathChance: 0 },
  },
  {
    id: 'core',
    name: '金丹',
    lifespan: 500,
    stages: STAGES,
    baseExp: 22,
    expPerLevel: 1500,
    powerBase: 500,
    breakthroughBaseChance: 25, // 筑基大圆满 → 金丹
    failurePenalty: { expLossPct: [30, 50], injuryChance: 60, deathChance: 5 },
  },
  {
    id: 'nascent',
    name: '元婴',
    lifespan: 1000,
    stages: STAGES,
    baseExp: 30,
    expPerLevel: 5000,
    powerBase: 2000,
    breakthroughBaseChance: 15,
    failurePenalty: { expLossPct: [35, 55], injuryChance: 70, deathChance: 10 },
  },
  {
    id: 'deity',
    name: '化神',
    lifespan: 1500,
    stages: STAGES,
    baseExp: 40,
    expPerLevel: 15000,
    powerBase: 8000,
    breakthroughBaseChance: 8,
    failurePenalty: { expLossPct: [40, 60], injuryChance: 80, deathChance: 20 },
  },
];

export const REALM_ORDER: RealmId[] = ['mortal', 'qi', 'foundation', 'core', 'nascent', 'deity'];

export function getRealmDef(id: RealmId): RealmDef {
  const r = REALMS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown realm: ${id}`);
  return r;
}

export function realmTier(id: RealmId): number {
  return REALM_ORDER.indexOf(id);
}

export function nextRealm(id: RealmId): RealmId | null {
  const i = REALM_ORDER.indexOf(id);
  return i >= 0 && i < REALM_ORDER.length - 1 ? REALM_ORDER[i + 1] : null;
}

/** Human-readable realm label, e.g. 炼气七层 / 筑基中期 / 凡人. */
export function realmLabel(rs: RealmState): string {
  const def = getRealmDef(rs.realm);
  if (rs.realm === 'mortal') return def.name;
  if (rs.realm === 'qi') return `${def.name}${CN_NUM[rs.qiLayer] ?? rs.qiLayer}层`;
  return `${def.name}${rs.stage}`;
}

export const CN_NUM: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七',
  8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三',
};

/** Exp needed for the CURRENT level (layer within qi, stage within higher realms). */
export function expNeededFor(realm: RealmId, levelIndex: number): number {
  const def = getRealmDef(realm);
  return Math.round(def.expPerLevel * Math.pow(1.25, levelIndex));
}

/** Combat stage multiplier for 筑基+ (初期 1 … 大圆满 1.9), qi scales by layer. */
export function stageMultiplier(rs: RealmState): number {
  if (rs.realm === 'qi') return 1 + (rs.qiLayer - 1) * 0.15;
  const i = STAGES.indexOf(rs.stage);
  return 1 + Math.max(0, i) * 0.3;
}
