import type { QiYuanRow } from '@/engine/types';

/**
 * 棋缘抽取表 — the one D100 that cannot be taken back.
 *
 * The table must cover 1..100 with no gap and no overlap; `dataIntegrity`
 * locks that down. Grades below 疏竹 are common on purpose: most people who
 * sit down at a board never hear anything at all.
 */
export const QIYUAN_TABLE: readonly QiYuanRow[] = [
  {
    min: 1,
    max: 18,
    grade: '顽石之缘',
    affinityCount: 1,
    speedMultiplier: 0.6,
    boardBonus: 0,
    blurb: '子落在枰上,声如敲石。天地未答,汝亦不问。',
  },
  {
    min: 19,
    max: 40,
    grade: '蒲柳之缘',
    affinityCount: 1,
    speedMultiplier: 0.85,
    boardBonus: 1,
    blurb: '蒲柳之姿,望秋先零。可蒲柳也活过很多个秋。',
  },
  {
    min: 41,
    max: 62,
    grade: '疏竹之缘',
    affinityCount: 2,
    speedMultiplier: 1.05,
    boardBonus: 2,
    blurb: '风过疏竹,竹不留声。汝落子时,似乎有谁应了一声。',
  },
  {
    min: 63,
    max: 79,
    grade: '苍松之缘',
    affinityCount: 2,
    speedMultiplier: 1.3,
    boardBonus: 3,
    blurb: '松根盘石,百年不移。汝的棋里,已有一分不肯让的东西。',
  },
  {
    min: 80,
    max: 91,
    grade: '流云之缘',
    affinityCount: 3,
    speedMultiplier: 1.6,
    boardBonus: 5,
    blurb: '云无常形,过山则山,过水则水。汝的手不定,却总在该在的地方。',
  },
  {
    min: 92,
    max: 98,
    grade: '明月之缘',
    affinityCount: 4,
    speedMultiplier: 2.1,
    boardBonus: 7,
    blurb: '千江有水千江月。汝一人对局,枰上却像坐了很多人。',
  },
  {
    min: 99,
    max: 100,
    grade: '太虚棋缘',
    affinityCount: 5,
    speedMultiplier: 3.0,
    boardBonus: 10,
    blurb: '天地为枰。汝落第一子的那一瞬,某处有一局棋提前收了官。',
  },
];

export function qiYuanRowFor(d100: number): QiYuanRow {
  const row = QIYUAN_TABLE.find((r) => d100 >= r.min && d100 <= r.max);
  if (!row) throw new Error(`棋缘表未覆盖 ${d100}`);
  return row;
}
