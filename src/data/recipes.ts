/**
 * 丹方. (STUB — content agent expands toward ~8; keep existing ids.)
 */
import type { Recipe } from '@/engine/types';

export const RECIPES: Recipe[] = [
  {
    id: 'r_huiqi_san',
    resultItemId: 'huiqi_san',
    name: '回气散',
    materials: [{ itemId: 'lingcao', count: 2 }],
    baseSuccess: 70,
    minRealm: 'mortal',
    fee: 5,
  },
  {
    id: 'r_juqi_dan',
    resultItemId: 'juqi_dan',
    name: '聚气丹',
    materials: [{ itemId: 'lingcao', count: 3 }],
    baseSuccess: 60,
    minRealm: 'qi',
    fee: 10,
  },
  {
    id: 'r_liaoshang_dan',
    resultItemId: 'liaoshang_dan',
    name: '疗伤丹',
    materials: [
      { itemId: 'lingcao', count: 2 },
      { itemId: 'qingxin_cao', count: 1 },
    ],
    baseSuccess: 55,
    minRealm: 'qi',
    fee: 20,
  },
  {
    id: 'r_jingxin_dan',
    resultItemId: 'jingxin_dan',
    name: '静心丹',
    materials: [{ itemId: 'qingxin_cao', count: 2 }],
    baseSuccess: 60,
    minRealm: 'qi',
    fee: 30,
  },
  {
    id: 'r_zhuji_dan',
    resultItemId: 'zhuji_dan',
    name: '筑基丹',
    materials: [
      { itemId: 'yaodan', count: 3 },
      { itemId: 'lingcao', count: 5 },
    ],
    baseSuccess: 35,
    minRealm: 'qi',
    fee: 100,
  },
];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
