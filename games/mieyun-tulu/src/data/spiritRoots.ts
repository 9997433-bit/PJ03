/**
 * spiritRoots.ts — 灵根 D100 lottery
 *
 * A sharper root cultivates faster and burns brighter — and a brighter light
 * is easier for heaven to aim at, hence `calamityAffinity`. There is no reroll.
 */

import type { Element, SpiritRootDef, SpiritRootGrade } from '@/engine/types';

const WU_XING: readonly Element[] = ['金', '木', '水', '火', '土'];
const MUTANT: readonly Element[] = ['雷', '冥'];

export const SPIRIT_ROOT_TABLE: readonly SpiritRootDef[] = [
  {
    grade: '五行杂灵根',
    rollMin: 1,
    rollMax: 38,
    elementCount: 5,
    speedMultiplier: 0.55,
    calamityAffinity: 0.85,
    pool: WU_XING,
    desc: '五气俱全而俱浊,如五马分车。世间十之四五皆如此。',
  },
  {
    grade: '四灵根',
    rollMin: 39,
    rollMax: 62,
    elementCount: 4,
    speedMultiplier: 0.75,
    calamityAffinity: 0.9,
    pool: WU_XING,
    desc: '四气杂驳,勤能补拙,勤不能补天。',
  },
  {
    grade: '三灵根',
    rollMin: 63,
    rollMax: 79,
    elementCount: 3,
    speedMultiplier: 0.95,
    calamityAffinity: 1,
    pool: WU_XING,
    desc: '三气相济,中人之资,可入门派外门。',
  },
  {
    grade: '双灵根',
    rollMin: 80,
    rollMax: 90,
    elementCount: 2,
    speedMultiplier: 1.2,
    calamityAffinity: 1.05,
    pool: WU_XING,
    desc: '两气相生,已属良材,足堪内门。',
  },
  {
    grade: '真灵根',
    rollMin: 91,
    rollMax: 96,
    elementCount: 1,
    speedMultiplier: 1.6,
    calamityAffinity: 1.15,
    pool: WU_XING,
    desc: '一气独纯,百年可望窥命。',
  },
  {
    grade: '变异灵根',
    rollMin: 97,
    rollMax: 99,
    elementCount: 1,
    speedMultiplier: 2.2,
    calamityAffinity: 1.35,
    pool: MUTANT,
    desc: '雷者破法,冥者蚀运。天地异数,亦是天地眼中的钉子。',
  },
  {
    grade: '先天道体',
    rollMin: 100,
    rollMax: 100,
    elementCount: 5,
    speedMultiplier: 3,
    calamityAffinity: 1.6,
    pool: WU_XING,
    desc: '身自为炉,气自为薪。三千年不出一个,出一个便折一个。',
  },
];

export function spiritRootDefForRoll(value: number): SpiritRootDef {
  const clamped = Math.max(1, Math.min(100, Math.round(value)));
  for (const def of SPIRIT_ROOT_TABLE) {
    if (clamped >= def.rollMin && clamped <= def.rollMax) return def;
  }
  return SPIRIT_ROOT_TABLE[0]!;
}

export function spiritRootDefByGrade(grade: SpiritRootGrade): SpiritRootDef {
  return SPIRIT_ROOT_TABLE.find((d) => d.grade === grade) ?? SPIRIT_ROOT_TABLE[0]!;
}
