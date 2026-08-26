/**
 * fates.ts — 命格 D100 table
 *
 * Where the 灵根 roll decides how fast you climb, the 命格 roll decides the
 * exchange rate between the two meters: how much 气运 a deed earns you and how
 * much 劫运 it costs. Bright fates pay well and are billed accordingly.
 */

import type { FateDef } from '@/engine/types';

export const FATES: readonly FateDef[] = [
  {
    id: 'tiansha',
    name: '天煞孤星',
    rollMin: 1,
    rollMax: 8,
    desc: '亲缘寡薄,近者多殃。独行的人,劫也只能独自受。',
    attributeMods: { dingLi: 2 },
    calamityRate: 1.3,
    fortuneRate: 1.1,
    startFortune: 5,
    startMerit: -10,
    special: '孤煞:无门派时修炼 +10%,劫运积累 +30%。',
  },
  {
    id: 'guhong',
    name: '孤鸿命',
    rollMin: 9,
    rollMax: 20,
    desc: '来去无定所,聚散不由人。走得快,也留不下什么。',
    attributeMods: { jiBian: 1, shenHun: 1 },
    calamityRate: 0.95,
    fortuneRate: 1,
    startFortune: 8,
    startMerit: 0,
    special: '轻身:遁走检定 +12。',
  },
  {
    id: 'wuge',
    name: '无格',
    rollMin: 21,
    rollMax: 38,
    desc: '星盘上你那一格是空的。钦天监称之为「未录」——好听些的说法叫自由。',
    attributeMods: {},
    calamityRate: 0.9,
    fortuneRate: 0.95,
    startFortune: 10,
    startMerit: 0,
    special: '未录:劫运积累 −10%,不易被人推演。',
  },
  {
    id: 'wenqu',
    name: '文曲照命',
    rollMin: 39,
    rollMax: 52,
    desc: '生而知之者少,近乎知之者,此格是也。',
    attributeMods: { wuXing: 2 },
    calamityRate: 0.95,
    fortuneRate: 1,
    startFortune: 12,
    startMerit: 10,
    special: '通文:习功法检定 +10。',
  },
  {
    id: 'taiyin',
    name: '太阴入命',
    rollMin: 53,
    rollMax: 64,
    desc: '月照千江。心思沉静者,得见他人所不见。',
    attributeMods: { shenHun: 2 },
    calamityRate: 0.85,
    fortuneRate: 1,
    startFortune: 12,
    startMerit: 15,
    special: '照微:推演耗费 −30%,反噬 −2。',
  },
  {
    id: 'pojun',
    name: '破军持世',
    rollMin: 65,
    rollMax: 76,
    desc: '所过之处,旧局皆破。破得了局,也破得了自己。',
    attributeMods: { tiPo: 2 },
    calamityRate: 1.2,
    fortuneRate: 1.15,
    startFortune: 14,
    startMerit: -10,
    special: '摧锋:斗法威能 +12%。',
  },
  {
    id: 'tanlang',
    name: '贪狼夺食',
    rollMin: 77,
    rollMax: 86,
    desc: '见气运如见血食。图录未至,此命已先有此心。',
    attributeMods: { jiBian: 2 },
    calamityRate: 1.25,
    fortuneRate: 1.2,
    startFortune: 16,
    startMerit: -20,
    special: '夺食:灭运所得气运 +30%。',
  },
  {
    id: 'tianfu',
    name: '天府厚德',
    rollMin: 87,
    rollMax: 93,
    desc: '仓廪之相。福不厚而祸自远,只因你从不去争。',
    attributeMods: { dingLi: 1, tiPo: 1 },
    calamityRate: 0.8,
    fortuneRate: 0.9,
    startFortune: 14,
    startMerit: 40,
    special: '厚德:化解劫运检定 +12,起始功德 +40。',
  },
  {
    id: 'ziwei',
    name: '紫微帝星',
    rollMin: 94,
    rollMax: 97,
    desc: '众星拱之。气运如江河灌顶,天雷亦循此柱而下。',
    attributeMods: { shenHun: 1, tiPo: 1, wuXing: 1, dingLi: 1, jiBian: 1 },
    calamityRate: 1.35,
    fortuneRate: 1.35,
    startFortune: 30,
    startMerit: 10,
    special: '帝星:气运所得 +35%,劫运积累 +35%。',
  },
  {
    id: 'yinghuo',
    name: '荧惑守心',
    rollMin: 98,
    rollMax: 99,
    desc: '大凶之象。史书里写到这四个字时,后面通常跟着一个王朝的年号。',
    attributeMods: { shenHun: 3 },
    calamityRate: 1.6,
    fortuneRate: 1.4,
    startFortune: 24,
    startMerit: -25,
    special: '守心:起始劫运 +12;劫中所得修为 ×2。',
  },
  {
    id: 'mieyun',
    name: '灭运之命',
    rollMin: 100,
    rollMax: 100,
    desc: '图录认主之相。你还没见过它,它已经在找你了。',
    attributeMods: { shenHun: 2, dingLi: 1 },
    calamityRate: 1.45,
    fortuneRate: 1.5,
    startFortune: 20,
    startMerit: 0,
    special: '认主:开局即持《图录残卷·一》,灭运所得 +50%。',
  },
];

export const FATE_BY_ID: Record<string, FateDef> = Object.fromEntries(
  FATES.map((f) => [f.id, f]),
);

export function fateForRoll(value: number): FateDef {
  const clamped = Math.max(1, Math.min(100, Math.round(value)));
  for (const f of FATES) {
    if (clamped >= f.rollMin && clamped <= f.rollMax) return f;
  }
  return FATES[2]!;
}

export function fateById(id: string): FateDef | null {
  return FATE_BY_ID[id] ?? null;
}
