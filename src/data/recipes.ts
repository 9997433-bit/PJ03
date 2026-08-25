// ============================================================================
// recipes.ts — 丹方十三品
// 成率 = baseSuccess + 悟性×2(識药出身再 +10),上限 95。
// 材料尽毁于失败,炉费概不退还——丹房的规矩,比天道还硬。
// 既有 id(r_huiqi_san / r_juqi_dan / r_liaoshang_dan / r_jingxin_dan /
// r_zhuji_dan)为引擎契约,不可改。
// ============================================================================

import type { Recipe } from '@/engine/types';

export const RECIPES: Recipe[] = [
  // ── 凡俗草药 ──
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
    id: 'r_jingxin_wan',
    resultItemId: 'jingxin_wan',
    name: '静心丸',
    materials: [
      { itemId: 'qingxin_cao', count: 1 },
      { itemId: 'lingcao', count: 1 },
    ],
    baseSuccess: 75,
    minRealm: 'mortal',
    fee: 5,
  },
  {
    id: 'r_shengji_san',
    resultItemId: 'shengji_san',
    name: '生肌散',
    materials: [
      { itemId: 'lingcao', count: 1 },
      { itemId: 'she_dan', count: 1 },
      { itemId: 'yaoshou_pi', count: 1 },
    ],
    baseSuccess: 65,
    minRealm: 'mortal',
    fee: 10,
  },

  // ── 炼气丹药 ──
  {
    id: 'r_juqi_dan',
    resultItemId: 'juqi_dan',
    name: '聚气丹',
    materials: [
      { itemId: 'lingcao', count: 2 },
      { itemId: 'jinxian_cao', count: 1 },
    ],
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
    id: 'r_peiyuan_dan',
    resultItemId: 'peiyuan_dan',
    name: '培元丹',
    materials: [
      { itemId: 'lingcao', count: 2 },
      { itemId: 'jinxian_cao', count: 2 },
    ],
    baseSuccess: 55,
    minRealm: 'qi',
    fee: 25,
  },
  {
    id: 'r_huanglong_dan',
    resultItemId: 'huanglong_dan',
    name: '黄龙丹',
    materials: [
      { itemId: 'jinxian_cao', count: 3 },
      { itemId: 'yaodan', count: 1 },
    ],
    baseSuccess: 50,
    minRealm: 'qi',
    fee: 40,
  },
  {
    id: 'r_ningshen_dan',
    resultItemId: 'ningshen_dan',
    name: '凝神丹',
    materials: [
      { itemId: 'qingxin_cao', count: 3 },
      { itemId: 'bainian_lingcao', count: 1 },
    ],
    baseSuccess: 45,
    minRealm: 'qi',
    fee: 60,
  },
  {
    id: 'r_pozhang_dan',
    resultItemId: 'pozhang_dan',
    name: '破障丹',
    materials: [
      { itemId: 'huolian_zi', count: 2 },
      { itemId: 'yaodan', count: 1 },
      { itemId: 'qingxin_cao', count: 1 },
    ],
    baseSuccess: 40,
    minRealm: 'qi',
    fee: 80,
  },
  {
    id: 'r_zhuji_dan',
    resultItemId: 'zhuji_dan',
    name: '筑基丹',
    materials: [
      { itemId: 'jiuqu_lingshen', count: 1 },
      { itemId: 'bainian_lingcao', count: 1 },
      { itemId: 'yaodan', count: 2 },
    ],
    baseSuccess: 35,
    minRealm: 'qi',
    fee: 100,
  },

  // ── 筑基丹药 ──
  {
    id: 'r_xisui_dan',
    resultItemId: 'xisui_dan',
    name: '洗髓丹',
    materials: [
      { itemId: 'bainian_lingcao', count: 2 },
      { itemId: 'hantan_shi', count: 1 },
      { itemId: 'huolian_zi', count: 1 },
    ],
    baseSuccess: 35,
    minRealm: 'foundation',
    fee: 150,
  },
  {
    id: 'r_jiuqu_lingshen_dan',
    resultItemId: 'jiuqu_lingshen_dan',
    name: '九曲灵参丹',
    materials: [
      { itemId: 'jiuqu_lingshen', count: 1 },
      { itemId: 'qiannian_lingru', count: 1 },
      { itemId: 'bainian_lingcao', count: 2 },
    ],
    baseSuccess: 25,
    minRealm: 'foundation',
    fee: 300,
  },
];

export function getRecipe(id: string): Recipe | undefined {
  const needle = id.trim();
  return RECIPES.find((r) => r.id === needle || r.name === needle || r.resultItemId === needle);
}
