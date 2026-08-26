import type { PlaceDef } from '@/engine/types';

/**
 * 十二处 — the road, in order of how far the world will let you walk.
 *
 * Fares are paid in 银钱; the gate is 境界, because some of these places do
 * not exist for anyone who cannot yet see them.
 */
export const PLACES: readonly PlaceDef[] = [
  {
    id: 'ningan',
    name: '宁安县',
    minRealm: 'chen',
    fare: 0,
    desc: '青石长街,茶楼三家,棋馆一间。汝的路从这里的门槛开始。',
    eventTags: ['市井', '棋馆', '人情'],
  },
  {
    id: 'jichuan',
    name: '稽川渡口',
    minRealm: 'chen',
    fare: 6,
    desc: '船工在此候客。水汽浮着,岸边石阶被摸得发亮。',
    eventTags: ['水', '行旅', '市井'],
  },
  {
    id: 'zhulin',
    name: '幽篁竹海',
    minRealm: 'chen',
    fare: 10,
    desc: '万竿翠竹,风来如万人低语。有人说这里的路会自己动。',
    eventTags: ['山野', '精怪', '清静'],
  },
  {
    id: 'lankeshan',
    name: '烂柯山',
    minRealm: 'mingxin',
    fare: 18,
    desc: '樵夫观棋、斧柯尽烂的那座山。山道上至今散着无人收的黑白子。',
    eventTags: ['棋馆', '仙缘', '清静'],
  },
  {
    id: 'gusi',
    name: '云栖古寺',
    minRealm: 'mingxin',
    fare: 22,
    desc: '寺僧四人,钟一口。香客说这里的钟自己会响。',
    eventTags: ['清静', '鬼魅', '论道'],
  },
  {
    id: 'yezhen',
    name: '夜市旧镇',
    minRealm: 'mingxin',
    fare: 26,
    desc: '子时才开的市。摊主不看人脸,只看手上有没有阳气。',
    eventTags: ['市井', '鬼魅', '奇物'],
  },
  {
    id: 'canghe',
    name: '沧河龙渊',
    minRealm: 'yangqi',
    fare: 40,
    desc: '河心有涡,深不见底。老渔人说底下压着一副没下完的棋。',
    eventTags: ['水', '精怪', '仙缘'],
  },
  {
    id: 'jiuhuang',
    name: '九荒古道',
    minRealm: 'yangqi',
    fare: 48,
    desc: '前朝驿路,如今只有风与骨。每隔十里立一块无字碑。',
    eventTags: ['行旅', '鬼魅', '波折'],
  },
  {
    id: 'xuanque',
    name: '玄阙书院',
    minRealm: 'tongxuan',
    fare: 70,
    desc: '半山之上,只收看得见门的人。院中古松下常年摆着一副空枰。',
    eventTags: ['论道', '棋馆', '仙缘'],
  },
  {
    id: 'yinsi',
    name: '阴司渡',
    minRealm: 'tongxuan',
    fare: 88,
    desc: '不该来的地方。渡口点着长明的青灯,排队的人不说话。',
    eventTags: ['鬼魅', '论道', '波折'],
  },
  {
    id: 'yunhai',
    name: '云海棋台',
    minRealm: 'zuowang',
    fare: 130,
    desc: '云上一方石台,不知谁凿的。落子声传得很远,却无回音。',
    eventTags: ['仙缘', '棋馆', '清静'],
  },
  {
    id: 'taixu',
    name: '太虚枰',
    minRealm: 'xiaoyao',
    fare: 0,
    desc: '不在任何一张舆图上。汝闭眼即到,睁眼即离。',
    eventTags: ['仙缘', '论道', '清静'],
  },
];

export const PLACE_BY_ID: Record<string, PlaceDef> = Object.fromEntries(
  PLACES.map((p) => [p.id, p]),
);

export function getPlace(id: string): PlaceDef | undefined {
  return PLACE_BY_ID[id];
}

export const STARTING_PLACE = 'ningan';
