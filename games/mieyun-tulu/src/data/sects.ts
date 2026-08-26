/**
 * sects.ts — 门派体系
 *
 * Membership is a standing contract: a stipend and a discount now, in exchange
 * for a 声望 ledger that only rises if you keep doing the sect's kind of work.
 * Each sect screens applicants on the two meters — 大梵寺 will not take a man
 * dripping with 劫运, and 血蕴宗 will not take a saint.
 */

import type { SectDef } from '@/engine/types';

export const SECTS: readonly SectDef[] = [
  {
    id: 'taiyi',
    name: '太一道',
    route: 'dao',
    desc: '山门在云上,弟子在云下。讲究一个「不惹事,也不怕事」。',
    minRealmOrder: 1,
    tuition: 120,
    stipend: 7,
    discount: 0.12,
    maxCalamity: 58,
    minMerit: -20,
    ranks: [
      { reputation: 25, title: '记名弟子', reward: { stones: 120 } },
      { reputation: 70, title: '内门弟子', reward: { stones: 400, itemId: 'huiyuandan' } },
      { reputation: 160, title: '真传弟子', reward: { stones: 1400, itemId: 'tongxuandan' } },
      { reputation: 320, title: '道子', reward: { stones: 4200, itemId: 'zhenhunling' } },
    ],
  },
  {
    id: 'dafan',
    name: '大梵寺',
    route: 'fo',
    desc: '不收束脩,只问来意。寺门前那口钟,谁敲响了谁自己知道为什么。',
    minRealmOrder: 1,
    tuition: 0,
    stipend: 4,
    discount: 0.08,
    maxCalamity: 46,
    minMerit: 20,
    ranks: [
      { reputation: 25, title: '沙弥', reward: { merit: 20 } },
      { reputation: 70, title: '比丘', reward: { stones: 300, merit: 30 } },
      { reputation: 160, title: '知客僧', reward: { stones: 1200, itemId: 'jingxindan' } },
      { reputation: 320, title: '首座', reward: { stones: 3600, itemId: 'gongdeyupai' } },
    ],
  },
  {
    id: 'xueyun',
    name: '血蕴宗',
    route: 'mo',
    desc: '入门只问一句:你敢不敢取。取得回来的算本事,取不回来的算肥料。',
    minRealmOrder: 1,
    tuition: 60,
    stipend: 10,
    discount: 0.06,
    maxCalamity: 100,
    minMerit: -400,
    ranks: [
      { reputation: 25, title: '血奴', reward: { stones: 200 } },
      { reputation: 70, title: '执刀', reward: { stones: 600, itemId: 'wuleifu' } },
      { reputation: 160, title: '堂主', reward: { stones: 2000, itemId: 'xuantiejian' } },
      { reputation: 320, title: '宗老', reward: { stones: 5200, itemId: 'youmingcao' } },
    ],
  },
  {
    id: 'jixia',
    name: '稷下学宫',
    route: 'ru',
    desc: '天下策论皆汇于此。学宫不修长生,学宫修的是「谁该长生」。',
    minRealmOrder: 1,
    tuition: 240,
    stipend: 12,
    discount: 0.16,
    maxCalamity: 52,
    minMerit: 0,
    ranks: [
      { reputation: 25, title: '游学士', reward: { stones: 260 } },
      { reputation: 70, title: '登堂士', reward: { stones: 700, itemId: 'ningqidan' } },
      { reputation: 160, title: '祭酒佐', reward: { stones: 2200, itemId: 'xingwenpao' } },
      { reputation: 320, title: '大祭酒', reward: { stones: 6000, itemId: 'xuanguangdan' } },
    ],
  },
  {
    id: 'yinyang',
    name: '阴阳家',
    route: 'tulu',
    desc: '不称宗门,只称一脉。他们研究气运已有九百年,至今没人承认自己信命。',
    minRealmOrder: 1,
    tuition: 180,
    stipend: 8,
    discount: 0.1,
    maxCalamity: 75,
    minMerit: -60,
    ranks: [
      { reputation: 25, title: '录事', reward: { stones: 200, itemId: 'xingguipan' } },
      { reputation: 70, title: '推步', reward: { stones: 640, itemId: 'ningshendan' } },
      { reputation: 160, title: '占正', reward: { stones: 2100, itemId: 'dingjiefu' } },
      { reputation: 320, title: '太史令', reward: { stones: 5400, itemId: 'tulu1' } },
    ],
  },
];

export const SECT_BY_ID: Record<string, SectDef> = Object.fromEntries(
  SECTS.map((s) => [s.id, s]),
);

export function sectById(id: string | null): SectDef | null {
  return id ? SECT_BY_ID[id] ?? null : null;
}
