import type { RealmDef, RealmId } from '@/engine/types';

/**
 * 七境 — the ladder of a quiet cultivator.
 *
 * Progress is gated on two axes at once: 修为 fills the stage bar, but the
 * 突破 into the next realm also demands 棋道 (chessDaoGate) and a mind clear
 * enough of 心尘 (dustCeiling). Grinding alone never gets you up the ladder.
 */
export const REALMS: readonly RealmDef[] = [
  {
    id: 'chen',
    name: '凡尘',
    lifespan: 72,
    expPerStage: [40, 60, 90],
    spiritBase: 60,
    cultivateBase: 12,
    breakthroughBase: 62,
    chessDaoGate: 12,
    dustCeiling: 70,
    desc: '尚是俗世一枚闲子。落子有声,不闻天地之音。',
  },
  {
    id: 'mingxin',
    name: '明心',
    lifespan: 110,
    expPerStage: [80, 120, 170],
    spiritBase: 90,
    cultivateBase: 18,
    breakthroughBase: 54,
    chessDaoGate: 26,
    dustCeiling: 62,
    desc: '心镜初拭。风过竹梢,始知那不只是风。',
  },
  {
    id: 'yangqi',
    name: '养气',
    lifespan: 180,
    expPerStage: [150, 210, 300],
    spiritBase: 130,
    cultivateBase: 26,
    breakthroughBase: 46,
    chessDaoGate: 42,
    dustCeiling: 54,
    desc: '一呼一吸,与落子同律。气自养,不必强求。',
  },
  {
    id: 'tongxuan',
    name: '通玄',
    lifespan: 320,
    expPerStage: [260, 360, 500],
    spiritBase: 180,
    cultivateBase: 36,
    breakthroughBase: 38,
    chessDaoGate: 58,
    dustCeiling: 46,
    desc: '幽明之隔,薄如棋纸。呼其名者,其应之。',
  },
  {
    id: 'zuowang',
    name: '坐忘',
    lifespan: 600,
    expPerStage: [420, 580, 800],
    spiritBase: 250,
    cultivateBase: 48,
    breakthroughBase: 30,
    chessDaoGate: 74,
    dustCeiling: 38,
    desc: '堕肢体,黜聪明,离形去知。棋自行,人不在。',
  },
  {
    id: 'xiaoyao',
    name: '逍遥',
    lifespan: 1200,
    expPerStage: [700, 950, 1300],
    spiritBase: 340,
    cultivateBase: 64,
    breakthroughBase: 22,
    chessDaoGate: 90,
    dustCeiling: 30,
    desc: '无枰,无子,无对手。行于世间而世间不留痕。',
  },
  {
    id: 'tianren',
    name: '天人',
    lifespan: 3000,
    expPerStage: [1200, 1600, 2200],
    spiritBase: 500,
    cultivateBase: 88,
    breakthroughBase: 0,
    chessDaoGate: 100,
    dustCeiling: 20,
    desc: '天人合一。执白执黑皆无谓,汝已是枰上的纹路。',
  },
];

export const REALM_BY_ID: Record<RealmId, RealmDef> = Object.fromEntries(
  REALMS.map((r) => [r.id, r]),
) as Record<RealmId, RealmDef>;

export const REALM_IDS: readonly RealmId[] = REALMS.map((r) => r.id);

export function getRealm(id: RealmId): RealmDef {
  const def = REALM_BY_ID[id];
  if (!def) throw new Error(`未知境界: ${id}`);
  return def;
}

/** The next realm up, or null at the top of the ladder. */
export function nextRealmId(id: RealmId): RealmId | null {
  const at = REALM_IDS.indexOf(id);
  if (at < 0 || at >= REALM_IDS.length - 1) return null;
  return REALM_IDS[at + 1] ?? null;
}

export function realmTier(id: RealmId): number {
  return REALM_IDS.indexOf(id);
}
