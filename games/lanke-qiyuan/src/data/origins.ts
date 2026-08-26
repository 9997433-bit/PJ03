import type { OriginDef } from '@/engine/types';

/**
 * 六种出身 — where the wanderer came from before the road.
 *
 * None of them is a warrior. Each shifts the same 28-point attribute budget
 * and hands you a different first foothold: a little money, a curio, or a
 * fragment of a game record nobody else could read.
 */
export const ORIGINS: readonly OriginDef[] = [
  {
    id: 'shusheng',
    name: '落第书生',
    desc: '三试不中,行囊里只剩笔墨与半部残谱。',
    flavor: '汝提笔十年,终究没能写出考官要的那句话。城门开时,汝往南走了。',
    attributeMods: { caiXue: 3, wuXing: 1, qiYun: -1 },
    startCoin: 30,
    startItems: ['brush_qingyu', 'tea_cuya'],
    startManualId: 'manual_canpu_shuangyan',
    startChessDao: 8,
    startFlags: { 识文断字: true },
    perk: 'brushBorn',
    perkName: '笔生',
    perkDesc: '与人、与鬼论道,才学检定 +2。',
  },
  {
    id: 'qiguan',
    name: '棋馆学徒',
    desc: '自幼在棋馆递茶扫地,把别人的对局看进了骨头里。',
    flavor: '汝擦了七年棋枰。掌柜说汝擦得干净,却没让汝坐上去过一次。',
    attributeMods: { wuXing: 2, xinJing: 2, caiXue: -1 },
    startCoin: 18,
    startItems: ['stone_yunzi'],
    startManualId: 'manual_gupu_lanke',
    startChessDao: 16,
    perk: 'stoneEar',
    perkName: '听子',
    perkDesc: '观棋所得棋道 +50%。',
  },
  {
    id: 'yaonong',
    name: '采药山民',
    desc: '识得百草,也识得哪座山头夜里不能过。',
    flavor: '汝背篓里的三七比城里贵三倍,可汝更记得山神庙前那半局没下完的棋。',
    attributeMods: { xinJing: 2, qiYun: 2, caiXue: -2 },
    startCoin: 24,
    startItems: ['food_shanzha', 'charm_pingan', 'curio_songzhi'],
    startChessDao: 4,
    startFlags: { 识药: true },
    perk: 'roadWise',
    perkName: '行脚',
    perkDesc: '游历盘缠减半,且每次游历多掷一次遇事。',
  },
  {
    id: 'daotong',
    name: '出走道童',
    desc: '观里的经背得滚瓜烂熟,师父的道却始终没接住。',
    flavor: '师父临终说：「汝不必留。」汝便下了山,连蒲团都没带。',
    attributeMods: { xinJing: 3, wuXing: 1, qiYun: -1 },
    startCoin: 12,
    startItems: ['charm_qingjing', 'tea_cuya'],
    startManualId: 'manual_canpu_wuwei',
    startChessDao: 10,
    startFlags: { 通经: true },
    perk: 'quietMind',
    perkName: '静者',
    perkDesc: '心尘积得比常人慢四分之一。',
  },
  {
    id: 'shangren',
    name: '破产行商',
    desc: '一船货沉在江里,债主追了三个郡。',
    flavor: '汝算过一辈子的账,唯独没算出江上那阵风。如今身上只剩一副棋。',
    attributeMods: { qiYun: 3, caiXue: 1, xinJing: -2 },
    startCoin: 96,
    startItems: ['gift_jiuhu', 'gift_jiuhu', 'stone_yunzi'],
    startChessDao: 6,
    startFlags: { 通商: true },
    perk: 'openHand',
    perkName: '疏财',
    perkDesc: '赠礼所得好感 +60%,精怪更愿意近汝。',
  },
  {
    id: 'guyi',
    name: '孤庙遗孤',
    desc: '在破庙里长大,同吃供果的还有几个不该说话的。',
    flavor: '汝叫过它们哥哥姐姐。后来庙塌了,它们说：去走走罢,别回头。',
    attributeMods: { wuXing: 3, qiYun: 1, xinJing: -1, caiXue: -1 },
    startCoin: 8,
    startItems: ['curio_pogui', 'food_shanzha'],
    startChessDao: 12,
    startFlags: { 幼时见鬼: true, 阴阳眼: true },
    perk: 'wideRead',
    perkName: '博览',
    perkDesc: '悟谱所耗之「悟」减三成。',
  },
];

export const ORIGIN_BY_ID: Record<string, OriginDef> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
);

export function getOrigin(id: string): OriginDef | undefined {
  return ORIGIN_BY_ID[id];
}
