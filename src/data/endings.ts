// ============================================================================
// endings.ts — 终局十六式
// 天道各有一句盖棺之言。不悲,不喜。line 即墓志铭;closing 同文,兼容
// 引擎两种字段读取。getEnding 做别名归一(death_combat → combatDeath 等),
// 查无此终局时以身死道消兜底。
// ============================================================================

import type { EndingDef } from '@/engine/types';

export const ENDINGS: Record<string, EndingDef> = {
  // ── 陨落 ──
  oldAge: {
    id: 'oldAge',
    title: '寿元耗尽·坐化',
    line: '灯枯油尽,形神俱寂。汝之一生,天道尽收眼底——不过沧海一粟。',
    closing: '灯枯油尽,形神俱寂。汝之一生,天道尽收眼底——不过沧海一粟。',
  },
  combatDeath: {
    id: 'combatDeath',
    title: '身死道消',
    line: '修行路上,尸骨为阶。今日,汝为他人之阶。',
    closing: '修行路上,尸骨为阶。今日,汝为他人之阶。',
  },
  qiDeviation: {
    id: 'qiDeviation',
    title: '走火入魔·爆体而亡',
    line: '逆天而行,天不允之。气机崩散处,魂飞魄灭。',
    closing: '逆天而行,天不允之。气机崩散处,魂飞魄灭。',
  },
  breakthroughDeath: {
    id: 'breakthroughDeath',
    title: '强行突破·殒身',
    line: '天堑既名天堑,便是以尸骨量其深浅。汝,亦是其一。',
    closing: '天堑既名天堑,便是以尸骨量其深浅。汝,亦是其一。',
  },
  heartDemon: {
    id: 'heartDemon',
    title: '心魔吞道',
    line: '杀汝者非天,非地,非仇敌——是那个每逢夜深便问「何必呢」的自己。',
    closing: '杀汝者非天,非地,非仇敌——是那个每逢夜深便问「何必呢」的自己。',
  },
  poisonFall: {
    id: 'poisonFall',
    title: '毒发·陨',
    line: '百毒不侵是传说,千防万防是修行。汝防了千次,漏了一次。',
    closing: '百毒不侵是传说,千防万防是修行。汝防了千次,漏了一次。',
  },
  karmaDebt: {
    id: 'karmaDebt',
    title: '因果反噬',
    line: '汝借过的每一分力,欠过的每一笔账,今日连本带利,一并来收。',
    closing: '汝借过的每一分力,欠过的每一笔账,今日连本带利,一并来收。',
  },
  bingJie: {
    id: 'bingJie',
    title: '兵解',
    line: '因果既结,以身偿之。来世,莫再欠。',
    closing: '因果既结,以身偿之。来世,莫再欠。',
  },
  nameless: {
    id: 'nameless',
    title: '无名冢',
    line: '荒山一抔土,不刻名姓。修仙界每年添十万座这样的坟——今年,有一座是汝的。',
    closing: '荒山一抔土,不刻名姓。修仙界每年添十万座这样的坟——今年,有一座是汝的。',
  },

  // ── 歧路 ──
  demonLord: {
    id: 'demonLord',
    title: '魔道枭雄',
    line: '正道说汝十恶不赦,魔道尊汝一声前辈。汝坐在白骨堆成的高台上,偶尔想起——最初只是想活下去而已。',
    closing: '正道说汝十恶不赦,魔道尊汝一声前辈。汝坐在白骨堆成的高台上,偶尔想起——最初只是想活下去而已。',
  },
  merchantImmortal: {
    id: 'merchantImmortal',
    title: '富甲仙凡',
    line: '汝没有登顶大道,却买下了半座坊市。修仙界都说:得罪谁,也别得罪汝的账房。',
    closing: '汝没有登顶大道,却买下了半座坊市。修仙界都说:得罪谁,也别得罪汝的账房。',
  },
  hermitage: {
    id: 'hermitage',
    title: '归隐林泉',
    line: '汝走到半途,忽然不走了。种药,酿酒,看云。天道来看过汝几次,每次都看见汝在笑。',
    closing: '汝走到半途,忽然不走了。种药,酿酒,看云。天道来看过汝几次,每次都看见汝在笑。',
  },
  guardian: {
    id: 'guardian',
    title: '守村人',
    line: '汝的境界止步于此,青牛村却三百年无灾无劫。村口老槐树下的石碑上刻着:此地有仙,不必问名。',
    closing: '汝的境界止步于此,青牛村却三百年无灾无劫。村口老槐树下的石碑上刻着:此地有仙,不必问名。',
  },
  daoCompanion: {
    id: 'daoCompanion',
    title: '尘缘证道',
    line: '大道三千,汝取一瓢烟火。多年后有人问汝可曾后悔,汝指了指檐下并排的两把竹椅。',
    closing: '大道三千,汝取一瓢烟火。多年后有人问汝可曾后悔,汝指了指檐下并排的两把竹椅。',
  },
  sectPillar: {
    id: 'sectPillar',
    title: '宗门柱石',
    line: '汝未能飞升,却撑起一座山门。后世弟子不知祖师是谁,只知犯了错,会被罚去擦一座旧碑——碑上是汝的名字。',
    closing: '汝未能飞升,却撑起一座山门。后世弟子不知祖师是谁,只知犯了错,会被罚去擦一座旧碑——碑上是汝的名字。',
  },

  // ── 登顶 ──
  ascension: {
    id: 'ascension',
    title: '化神大圆满·飞升之门',
    line: '雷云散尽,天门洞开。汝回望人间一眼,拾级而上。天道目送,不语。',
    closing: '雷云散尽,天门洞开。汝回望人间一眼,拾级而上。天道目送,不语。',
  },
};

/** 别名归一:引擎不同模块以 death_combat / death_qi_deviation 等相称 */
const ENDING_ALIASES: Record<string, string> = {
  death_combat: 'combatDeath',
  death_qi_deviation: 'qiDeviation',
  death_breakthrough: 'breakthroughDeath',
  death_old_age: 'oldAge',
  oldage: 'oldAge',
  death: 'combatDeath',
  victory: 'ascension',
  xinmo: 'heartDemon',
};

export function getEnding(id: string): EndingDef {
  const direct = ENDINGS[id];
  if (direct) return direct;
  const alias = ENDING_ALIASES[id] ?? ENDING_ALIASES[id.toLowerCase()];
  return (alias ? ENDINGS[alias] : undefined) ?? ENDINGS.combatDeath!;
}
