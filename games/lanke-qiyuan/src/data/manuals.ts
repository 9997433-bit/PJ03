import type { ManualDef } from '@/engine/types';

/**
 * 棋谱 — the study track.
 *
 * A manual is bought with 悟 (insight), not money, and only after 棋道 has
 * risen far enough to make sense of it. One manual may be 参 (studied) at a
 * time; studying it colours 修炼 flavour and boosts both cultivation and the
 * board.
 */
export const MANUALS: readonly ManualDef[] = [
  {
    id: 'manual_canpu_shuangyan',
    name: '《双燕残谱》',
    tier: '残谱',
    insightCost: 2,
    minChessDao: 0,
    speedBonus: 1.08,
    boardBonus: 1,
    desc: '半页纸,只留了黑先九手。落款「双燕」,不知是人是燕。',
  },
  {
    id: 'manual_canpu_wuwei',
    name: '《无为残卷》',
    tier: '残谱',
    insightCost: 2,
    minChessDao: 0,
    speedBonus: 1.06,
    boardBonus: 0,
    desc: '道观旧物。通篇讲的不是怎么下,是什么时候不下。',
  },
  {
    id: 'manual_gupu_lanke',
    name: '《烂柯古谱》',
    tier: '古谱',
    insightCost: 4,
    minChessDao: 12,
    speedBonus: 1.15,
    boardBonus: 2,
    desc: '樵夫所见那局的追记。棋谱到中盘忽然断了——记谱人的斧柄烂了。',
  },
  {
    id: 'manual_gupu_jiangxue',
    name: '《江雪对局》',
    tier: '古谱',
    insightCost: 5,
    minChessDao: 20,
    speedBonus: 1.18,
    boardBonus: 3,
    desc: '孤舟蓑笠翁,与谁对坐?谱上只有一方落子,另一方空着。',
  },
  {
    id: 'manual_gupu_yeti',
    name: '《夜啼谱》',
    tier: '古谱',
    insightCost: 5,
    minChessDao: 26,
    speedBonus: 1.14,
    boardBonus: 4,
    desc: '鬼手所记。每一手都在算对方还剩多少阳寿。',
  },
  {
    id: 'manual_mingpu_songfeng',
    name: '《松风十九路》',
    tier: '名谱',
    insightCost: 8,
    minChessDao: 40,
    speedBonus: 1.28,
    boardBonus: 5,
    desc: '玄阙书院镇院之谱。读到第七路,窗外真会起风。',
  },
  {
    id: 'manual_mingpu_shuiyue',
    name: '《水月手谈》',
    tier: '名谱',
    insightCost: 9,
    minChessDao: 48,
    speedBonus: 1.26,
    boardBonus: 7,
    desc: '以水为枰,以月为子。落子处无痕,可胜负分明。',
  },
  {
    id: 'manual_mingpu_zuowang',
    name: '《坐忘篇》',
    tier: '名谱',
    insightCost: 11,
    minChessDao: 58,
    speedBonus: 1.36,
    boardBonus: 4,
    desc: '不教棋,教怎么把「我在下棋」这件事忘掉。',
  },
  {
    id: 'manual_tianpu_taixu',
    name: '《太虚枰经》',
    tier: '天谱',
    insightCost: 16,
    minChessDao: 74,
    speedBonus: 1.5,
    boardBonus: 9,
    desc: '开篇一句：「天地为枰,众生为子。」余下皆是注脚。',
  },
  {
    id: 'manual_tianpu_wuzi',
    name: '《无字谱》',
    tier: '天谱',
    insightCost: 20,
    minChessDao: 88,
    speedBonus: 1.62,
    boardBonus: 12,
    desc: '没有一个字。汝读到哪一页,哪一页就是汝的棋。',
  },
];

export const MANUAL_BY_ID: Record<string, ManualDef> = Object.fromEntries(
  MANUALS.map((m) => [m.id, m]),
);

export function getManual(id: string): ManualDef | undefined {
  return MANUAL_BY_ID[id];
}

export function findManual(query: string): ManualDef | undefined {
  const q = query.trim();
  return MANUAL_BY_ID[q] ?? MANUALS.find((m) => m.name === q || m.name === `《${q}》`);
}
