import type { Technique } from '@/engine/types';

export const TECHNIQUES: Technique[] = [
  {
    id: 'yinqijue',
    name: '引气诀',
    grade: '黄阶',
    elementAffinity: null,
    speedBonus: 1.1,
    powerBonus: 0,
    minRealm: 'mortal',
    desc: '最粗浅的吐纳法门，引天地灵气入体。乡野散修多习此诀。',
  },
  {
    id: 'changchungong',
    name: '长春功',
    grade: '黄阶',
    elementAffinity: ['木'],
    speedBonus: 1.15,
    powerBonus: 0,
    minRealm: 'mortal',
    desc: '木属正法，绵长温养。修之气血调和，伤势易愈。',
  },
  {
    id: 'liehuozhang',
    name: '烈火掌',
    grade: '黄阶',
    elementAffinity: ['火'],
    speedBonus: 1.12,
    powerBonus: 8,
    minRealm: 'qi',
    desc: '火属功法，掌出如燎原。修行稍快，兼具搏杀之能。',
  },
  {
    id: 'xuanshuijing',
    name: '玄水经',
    grade: '玄阶',
    elementAffinity: ['水', '冰'],
    speedBonus: 1.3,
    powerBonus: 10,
    minRealm: 'qi',
    desc: '玄阶水法，静水流深。心性愈坚，行功愈稳。',
  },
  {
    id: 'qingyuanjianjue',
    name: '青元剑诀',
    grade: '玄阶',
    elementAffinity: ['金'],
    speedBonus: 1.25,
    powerBonus: 25,
    minRealm: 'qi',
    desc: '玄阶剑修功法，剑气青元，锋不可当。',
  },
  {
    id: 'houtugong',
    name: '厚土功',
    grade: '玄阶',
    elementAffinity: ['土'],
    speedBonus: 1.2,
    powerBonus: 15,
    minRealm: 'qi',
    desc: '玄阶土法，如山岳之不动。防御见长。',
  },
  {
    id: 'dayanjue',
    name: '大衍诀',
    grade: '地阶',
    elementAffinity: null,
    speedBonus: 1.6,
    powerBonus: 30,
    minRealm: 'foundation',
    desc: '地阶无属正法，推演天机，包容万象。可遇不可求。',
  },
  {
    id: 'ziyanjue',
    name: '紫焰诀',
    grade: '地阶',
    elementAffinity: ['火', '雷'],
    speedBonus: 1.5,
    powerBonus: 60,
    minRealm: 'foundation',
    desc: '地阶奇法，紫焰焚天。威能冠绝同侪。',
  },
  {
    id: 'taixuanjing',
    name: '太玄经',
    grade: '天阶',
    elementAffinity: null,
    speedBonus: 2.0,
    powerBonus: 100,
    minRealm: 'foundation',
    desc: '传说中的天阶经文，字字玄奥。上古传承，机缘所钟方可得之。',
  },
];

export function getTechnique(id: string): Technique | null {
  return TECHNIQUES.find((t) => t.id === id) ?? null;
}

/** Combat arts (战斗术法) — flat power adders usable in combat. */
export interface CombatArt {
  id: string;
  name: string;
  power: number;
  desc: string;
}
export const COMBAT_ARTS: CombatArt[] = [
  { id: 'jianqi', name: '剑气术', power: 15, desc: '凝气为剑，隔空伤敌。' },
  { id: 'huoqiu', name: '火球术', power: 12, desc: '炼气期最常见的攻伐术法。' },
  { id: 'tujia', name: '土甲术', power: 8, desc: '土灵之气护体，减免伤势。' },
];
export function getArt(id: string): CombatArt | null {
  return COMBAT_ARTS.find((a) => a.id === id) ?? null;
}
