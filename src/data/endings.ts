// ============================================================================
// endings.ts — 终局
// 天道各有一句盖棺之言。不悲,不喜。
// ============================================================================

import type { EndingDef } from '@/engine/types';

export const ENDINGS: Record<string, EndingDef> = {
  oldAge: {
    id: 'oldAge',
    title: '寿元耗尽·坐化',
    line: '灯枯油尽,形神俱寂。汝之一生,天道尽收眼底——不过沧海一粟。',
  },
  combatDeath: {
    id: 'combatDeath',
    title: '身死道消',
    line: '修行路上,尸骨为阶。今日,汝为他人之阶。',
  },
  qiDeviation: {
    id: 'qiDeviation',
    title: '走火入魔·爆体而亡',
    line: '逆天而行,天不允之。气机崩散处,魂飞魄灭。',
  },
  breakthroughDeath: {
    id: 'breakthroughDeath',
    title: '强行突破·殒身',
    line: '天堑既名天堑,便是以尸骨量其深浅。汝,亦是其一。',
  },
  bingJie: {
    id: 'bingJie',
    title: '兵解',
    line: '因果既结,以身偿之。来世,莫再欠。',
  },
  ascension: {
    id: 'ascension',
    title: '化神大圆满·飞升之门',
    line: '雷云散尽,天门洞开。汝回望人间一眼,拾级而上。天道目送,不语。',
  },
};

export function getEnding(id: string): EndingDef {
  return ENDINGS[id] ?? ENDINGS.combatDeath!;
}
