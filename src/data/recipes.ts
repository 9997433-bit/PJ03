import type { Recipe } from '@/engine/types';

export const RECIPES: Recipe[] = [
  {
    id: 'r_huiqisan',
    resultItemId: 'huiqisan',
    name: '回气散',
    materials: [{ itemId: 'lingcao', count: 2 }],
    baseSuccess: 75,
    minRealm: 'mortal',
    fee: 2,
  },
  {
    id: 'r_jvqisan',
    resultItemId: 'jvqisan',
    name: '聚气散',
    materials: [{ itemId: 'lingcao', count: 3 }],
    baseSuccess: 70,
    minRealm: 'mortal',
    fee: 3,
  },
  {
    id: 'r_jvqidan',
    resultItemId: 'jvqidan',
    name: '聚气丹',
    materials: [{ itemId: 'lingcao', count: 2 }, { itemId: 'zijilingzhi', count: 1 }],
    baseSuccess: 55,
    minRealm: 'qi',
    fee: 10,
  },
  {
    id: 'r_liaoshangdan',
    resultItemId: 'liaoshangdan',
    name: '疗伤丹',
    materials: [{ itemId: 'zijilingzhi', count: 1 }, { itemId: 'yaodan1', count: 1 }],
    baseSuccess: 50,
    minRealm: 'qi',
    fee: 15,
  },
  {
    id: 'r_jingxindan',
    resultItemId: 'jingxindan',
    name: '静心丹',
    materials: [{ itemId: 'qiancaohua', count: 2 }, { itemId: 'lingcao', count: 1 }],
    baseSuccess: 55,
    minRealm: 'qi',
    fee: 12,
  },
  {
    id: 'r_zhujidan',
    resultItemId: 'zhujidan',
    name: '筑基丹',
    materials: [{ itemId: 'zijilingzhi', count: 2 }, { itemId: 'yaodan1', count: 2 }, { itemId: 'longxucao', count: 1 }],
    baseSuccess: 30,
    minRealm: 'qi',
    fee: 100,
  },
  {
    id: 'r_xisuidan',
    resultItemId: 'xisuidan',
    name: '洗髓丹',
    materials: [{ itemId: 'longxucao', count: 1 }, { itemId: 'yaodan2', count: 1 }],
    baseSuccess: 40,
    minRealm: 'foundation',
    fee: 60,
  },
  {
    id: 'r_ningjindan',
    resultItemId: 'ningjindan',
    name: '凝金丹',
    materials: [{ itemId: 'yaodan2', count: 2 }, { itemId: 'hanyubing', count: 1 }, { itemId: 'longxucao', count: 2 }],
    baseSuccess: 25,
    minRealm: 'foundation',
    fee: 300,
  },
];

export function getRecipe(id: string): Recipe {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`unknown recipe: ${id}`);
  return r;
}
