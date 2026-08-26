/**
 * origins.ts — 出身 (creation step 2)
 *
 * Six starting positions in 大乾 society. Each shifts the five attributes,
 * the purse, and — unlike a plain xianxia opening — the two meters the whole
 * game turns on: 气运 and 劫运.
 */

import type { OriginDef } from '@/engine/types';

export const ORIGINS: readonly OriginDef[] = [
  {
    id: 'shusheng',
    name: '寒门书生',
    desc: '十年青灯,一纸功名不第。读得杂书太多,反倒识得几个不该识的字。',
    attributeMods: { wuXing: 2, dingLi: 1 },
    startStones: 40,
    startItems: [{ itemId: 'canjuan', count: 1 }],
    startFortune: 8,
    startCalamity: 0,
    startMerit: 10,
    startFlags: { literate: true },
    special: '博闻:习功法之检定 +8。',
  },
  {
    id: 'chihou',
    name: '边军斥候',
    desc: '在关外走过三年,活着回来的同袍不足一成。刀口舔血,命硬。',
    attributeMods: { tiPo: 2, jiBian: 1 },
    startStones: 25,
    startItems: [{ itemId: 'tiedao', count: 1 }, { itemId: 'jinchuangyao', count: 2 }],
    startFortune: 10,
    startCalamity: 3,
    startMerit: -5,
    startFlags: { veteran: true },
    special: '悍勇:斗法伤害 +8%,遁走检定 +10。',
  },
  {
    id: 'guanxing',
    name: '钦天监小吏',
    desc: '夜夜记录星象,抄了一辈子别人的命数,自己的那一栏始终空着。',
    attributeMods: { shenHun: 2, wuXing: 1 },
    startStones: 55,
    startItems: [{ itemId: 'xingguipan', count: 1 }],
    startFortune: 12,
    startCalamity: 2,
    startMerit: 5,
    startFlags: { astrologer: true },
    special: '窥天:推演耗费 −25%,且天机反噬 −1。',
  },
  {
    id: 'shanghang',
    name: '商行少东',
    desc: '账房里长大的人,信的是折算与止损,不信天命——直到亲眼见了一次天雷。',
    attributeMods: { jiBian: 2, dingLi: 1 },
    startStones: 220,
    startItems: [{ itemId: 'huiyuandan', count: 2 }],
    startFortune: 14,
    startCalamity: 1,
    startMerit: 0,
    startFlags: { merchant: true },
    special: '精算:坊市买价 −12%,售价 +10%。',
  },
  {
    id: 'yaotong',
    name: '山野药童',
    desc: '认得三百种草,煎错过一副药。师父咽气那晚说:活着比对错要紧。',
    attributeMods: { tiPo: 1, wuXing: 1, dingLi: 1 },
    startStones: 60,
    startItems: [{ itemId: 'lingcao', count: 4 }, { itemId: 'huiyuandan', count: 1 }],
    startFortune: 10,
    startCalamity: 0,
    startMerit: 25,
    startFlags: { herbalist: true },
    special: '识药:丹药功效 +20%,起始功德 +25。',
  },
  {
    id: 'zuichen',
    name: '罪臣之后',
    desc: '满门抄斩那年你六岁,躲在米缸里。抄家的清单上,你家气运是被人明码标了价的。',
    attributeMods: { dingLi: 2, shenHun: 1 },
    startStones: 15,
    startItems: [{ itemId: 'bianyunfu', count: 1 }],
    startFortune: 22,
    startCalamity: 9,
    startMerit: -15,
    startFlags: { hunted: true, grudge: 1 },
    special: '负劫:起始劫运 +9、气运 +22;化解劫运检定 +10。',
  },
];

export const ORIGIN_BY_ID: Record<string, OriginDef> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
);

export function originById(id: string): OriginDef | null {
  return ORIGIN_BY_ID[id] ?? null;
}
