import type { Origin } from '@/engine/types';

export const ORIGINS: Origin[] = [
  {
    id: 'farmer',
    name: '山村农户',
    desc: '生于陇亩之间，食粗粝，负霜露。筋骨得天独厚，唯不识一字。',
    attributeMods: { genGu: 2 },
    startSpiritStones: 5,
    startItems: [],
    startFlags: { hardy: true },
    special: '耐苦：伤势恢复所需时日减一。',
  },
  {
    id: 'scholar',
    name: '落魄书生',
    desc: '十年寒窗，功名无望。偶得残卷半部，方知世间有仙。',
    attributeMods: { wuXing: 2 },
    startSpiritStones: 10,
    startItems: ['canjuan'],
    startFlags: { eidetic: true },
    special: '过目不忘：参悟功法时悟性额外+2。',
  },
  {
    id: 'merchant',
    name: '商贾之子',
    desc: '家道殷实，锱铢必较。仙缘或可以钱财铺路。',
    attributeMods: { qiYun: 1 },
    startSpiritStones: 100,
    startItems: [],
    startFlags: { haggler: true },
    special: '市侩：坊市出售物品得价六成（常人五成）。',
  },
  {
    id: 'apothecary',
    name: '药铺学徒',
    desc: '自幼辨百草、守药炉，深谙药理，心静如水。',
    attributeMods: { wuXing: 1, xinXing: 1 },
    startSpiritStones: 20,
    startItems: ['lingcao', 'lingcao', 'lingcao'],
    startFlags: { herbalist: true },
    special: '识药：炼丹成功率+10%。',
  },
  {
    id: 'hunter',
    name: '猎户遗孤',
    desc: '父母葬于兽口。自幼与刀弓为伴，杀性内敛而不灭。',
    attributeMods: { genGu: 1, xinXing: 1 },
    startSpiritStones: 8,
    startItems: ['tiegong'],
    startFlags: { slayer: true },
    special: '搏杀：战斗威能+5%。',
  },
  {
    id: 'clan',
    name: '修仙家族旁系',
    desc: '族中灵脉旁支，天资平平，然家学渊源，起点非凡。',
    attributeMods: {},
    startSpiritStones: 50,
    startItems: ['jvqisan'],
    startFlags: { clanborn: true },
    special: '家学：开局习得黄阶功法《引气诀》。',
  },
];

export function getOrigin(id: string): Origin {
  const o = ORIGINS.find((x) => x.id === id);
  if (!o) throw new Error(`unknown origin: ${id}`);
  return o;
}
