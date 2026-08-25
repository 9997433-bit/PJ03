import type { Element, SpiritRootGrade } from '@/engine/types';

export interface SpiritRootRow {
  min: number;
  max: number;
  grade: SpiritRootGrade;
  elementCount: number;
  speedMultiplier: number;
  mutated?: boolean; // 异灵根 draws from 雷/冰/风
}

/** D100 lottery — like the novel, most players start with a bad root. */
export const SPIRIT_ROOT_TABLE: SpiritRootRow[] = [
  { min: 1, max: 40, grade: '五灵根', elementCount: 5, speedMultiplier: 0.5 },
  { min: 41, max: 65, grade: '四灵根', elementCount: 4, speedMultiplier: 0.7 },
  { min: 66, max: 82, grade: '三灵根', elementCount: 3, speedMultiplier: 0.9 },
  { min: 83, max: 93, grade: '双灵根', elementCount: 2, speedMultiplier: 1.2 },
  { min: 94, max: 97, grade: '真灵根', elementCount: 1, speedMultiplier: 1.6 },
  { min: 98, max: 99, grade: '异灵根', elementCount: 1, speedMultiplier: 2.2, mutated: true },
  { min: 100, max: 100, grade: '天灵根', elementCount: 1, speedMultiplier: 3.0 },
];

export const BASE_ELEMENTS: Element[] = ['金', '木', '水', '火', '土'];
export const MUTATED_ELEMENTS: Element[] = ['雷', '冰', '风'];

export function lookupSpiritRoot(d100: number): SpiritRootRow {
  const row = SPIRIT_ROOT_TABLE.find((r) => d100 >= r.min && d100 <= r.max);
  if (!row) throw new Error(`bad spirit root roll: ${d100}`);
  return row;
}

export const SPIRIT_ROOT_FLAVOR: Record<SpiritRootGrade, string> = {
  天灵根: '天地为之侧目。万年不遇之资，仙路于汝，如履平地。',
  异灵根: '变异之根，锋锐诡谲。天道亦不常见此数。',
  真灵根: '一属独秀，纯而不杂。宗门若见，必争抢之。',
  双灵根: '双属相济，资质上乘。勤修可期大道。',
  三灵根: '三属混杂，资质平平。仙路漫漫，唯勤可补。',
  四灵根: '四属驳杂，灵气入体如泥牛入海。修行殊为不易。',
  五灵根: '五属俱全，谓之伪灵根。凡人之姿，仙路几近断绝——然韩立亦起于此。',
};
