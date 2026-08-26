import type { ItemDef } from '@/engine/types';

/**
 * 器物 — 26 things you can carry.
 *
 * Nothing here is a weapon. Tea steadies the mind, charms hold off the dust,
 * curios are what spirits actually want, and a few objects exist only to be
 * given away.
 */
export const ITEMS: readonly ItemDef[] = [
  // ---------------------------------------------------------------- 茶 tea
  {
    id: 'tea_cuya',
    name: '粗芽茶',
    kind: 'tea',
    grade: 1,
    price: 4,
    desc: '最贱的一等茶,涩得厉害。可涩过之后,人是醒的。',
    effect: { spirit: 14, dust: -2 },
    consumable: true,
  },
  {
    id: 'tea_yunwu',
    name: '云雾毛尖',
    kind: 'tea',
    grade: 2,
    price: 22,
    desc: '高山云里长的。汤色清极,喝完舌根留一线甜。',
    effect: { spirit: 34, dust: -6, exp: 12 },
    consumable: true,
  },
  {
    id: 'tea_shixin',
    name: '石心冷泡',
    kind: 'tea',
    grade: 3,
    price: 58,
    desc: '以山石凹处积水冷泡三日。饮之如含一枚凉子。',
    effect: { spirit: 52, dust: -14, chessDao: 1 },
    consumable: true,
  },
  {
    id: 'tea_wangyou',
    name: '忘忧',
    kind: 'tea',
    grade: 4,
    price: 160,
    desc: '据说饮者会忘掉一件最想忘的事。摊主不肯说自己忘了什么。',
    effect: { spirit: 90, dust: -30, clearBurdens: true },
    consumable: true,
  },

  // -------------------------------------------------------------- 笔墨 brush
  {
    id: 'brush_qingyu',
    name: '青玉笔',
    kind: 'brush',
    grade: 1,
    price: 12,
    desc: '杆是染色的竹,不是玉。但握久了确实温。',
    effect: { attribute: ['caiXue', 1] },
  },
  {
    id: 'brush_songyan',
    name: '松烟古墨',
    kind: 'brush',
    grade: 2,
    price: 46,
    desc: '前朝的墨,磨开有松脂气。写出来的字,鬼也读得懂。',
    effect: { exp: 40, insight: 1 },
    consumable: true,
  },
  {
    id: 'brush_wenxin',
    name: '问心砚',
    kind: 'brush',
    grade: 4,
    price: 220,
    desc: '砚池映不出人脸,只映得出人今日的心。',
    effect: { attribute: ['xinJing', 1], dust: -18 },
  },

  // ------------------------------------------------------------- 符 charms
  {
    id: 'charm_pingan',
    name: '平安符',
    kind: 'charm',
    grade: 1,
    price: 8,
    desc: '庙祝随手画的。心诚则灵,不诚则是一张黄纸。',
    effect: { dust: -8, spirit: 10 },
    consumable: true,
  },
  {
    id: 'charm_qingjing',
    name: '清静符',
    kind: 'charm',
    grade: 2,
    price: 30,
    desc: '道观所出,压得住一时的躁。',
    effect: {
      dust: -16,
      mood: {
        id: 'mood_qingjing',
        name: '清静',
        kind: 'boon',
        turnsLeft: 3,
        speedMult: 1.2,
        dustPerTurn: -2,
        desc: '心里那口井暂时静了,连月亮都照得进去。',
      },
    },
    consumable: true,
  },
  {
    id: 'charm_bigui',
    name: '避秽符',
    kind: 'charm',
    grade: 3,
    price: 66,
    desc: '走夜路的人贴身带着。对真正的老东西没用,对小鬼够了。',
    effect: { dust: -24, flag: ['避秽在身', 3] },
    consumable: true,
  },
  {
    id: 'charm_zhaoyin',
    name: '召隐符',
    kind: 'charm',
    grade: 4,
    price: 180,
    desc: '烧了它,附近愿意见汝的东西便会现身。不愿意的仍旧不会。',
    effect: { flag: ['召隐', true], insight: 2 },
    consumable: true,
  },

  // ------------------------------------------------------------ 棋具 stones
  {
    id: 'stone_yunzi',
    name: '寻常云子',
    kind: 'stone',
    grade: 1,
    price: 16,
    desc: '一副缺了三颗白子的旧棋。缺的那三颗,汝自己拿石子补的。',
    effect: { chessDao: 1 },
  },
  {
    id: 'stone_hanyu',
    name: '寒玉棋',
    kind: 'stone',
    grade: 3,
    price: 140,
    desc: '子入手即凉,夏日对局不出汗,思路便不乱。',
    effect: { chessDao: 3, attribute: ['xinJing', 1] },
  },
  {
    id: 'stone_xingchen',
    name: '星辰枰',
    kind: 'stone',
    grade: 5,
    price: 900,
    desc: '枰上纵横十九道,夜里会浮出星子。落错一手,星便暗一颗。',
    effect: { chessDao: 8, attribute: ['wuXing', 2] },
    hidden: true,
  },

  // ------------------------------------------------------------- 食 food
  {
    id: 'food_shanzha',
    name: '山楂糕',
    kind: 'food',
    grade: 1,
    price: 3,
    desc: '路上顶饿的东西。酸,但顶饿。',
    effect: { spirit: 18 },
    consumable: true,
  },
  {
    id: 'food_hesu',
    name: '荷叶素馔',
    kind: 'food',
    grade: 2,
    price: 20,
    desc: '寺里做的。没有油腥,吃完人是轻的。',
    effect: { spirit: 40, dust: -6 },
    consumable: true,
  },
  {
    id: 'food_songzi',
    name: '松子仁',
    kind: 'food',
    grade: 2,
    price: 26,
    desc: '古松结的。山精很爱这个,汝自己吃反倒可惜。',
    effect: { spirit: 22, giftFavor: 8 },
    consumable: true,
  },

  // ------------------------------------------------------------- 古玩 curios
  {
    id: 'curio_songzhi',
    name: '松脂琥珀',
    kind: 'curio',
    grade: 2,
    price: 52,
    desc: '里头封着一只千年前的蚊。它比汝先见过这座山。',
    effect: { giftFavor: 14 },
  },
  {
    id: 'curio_pogui',
    name: '破龟甲',
    kind: 'curio',
    grade: 2,
    price: 38,
    desc: '庙里捡的,裂纹恰好像一副定式。',
    effect: { chessDao: 2, giftFavor: 10 },
  },
  {
    id: 'curio_tongling',
    name: '铜铃',
    kind: 'curio',
    grade: 3,
    price: 96,
    desc: '摇它无声,可远处的东西会回头。',
    effect: { giftFavor: 20, flag: ['铃在手', true] },
  },
  {
    id: 'curio_yueyingjing',
    name: '月影镜',
    kind: 'curio',
    grade: 4,
    price: 300,
    desc: '照人无影,照鬼有形。夜里别对着自己照。',
    effect: { giftFavor: 30, attribute: ['qiYun', 1] },
    hidden: true,
  },

  // ------------------------------------------------------------- 礼 gifts
  {
    id: 'gift_jiuhu',
    name: '一壶浊酒',
    kind: 'gift',
    grade: 1,
    price: 10,
    desc: '不好喝,但共饮的人从不挑。',
    effect: { spirit: 12, dust: 4, giftFavor: 10 },
    consumable: true,
  },
  {
    id: 'gift_xiangzhu',
    name: '沉水香',
    kind: 'gift',
    grade: 3,
    price: 88,
    desc: '一炷可燃一夜。庙里的、坟头的,都受用。',
    effect: { dust: -10, giftFavor: 22 },
    consumable: true,
  },
  {
    id: 'gift_zhiqian',
    name: '纸钱一沓',
    kind: 'gift',
    grade: 1,
    price: 5,
    desc: '给阴间的通货。活人拿着晦气,鬼拿着欢喜。',
    effect: { dust: 3, giftFavor: 12 },
    consumable: true,
  },

  // ------------------------------------------------------ 奇物 hidden things
  {
    id: 'curio_lankeaxe',
    name: '烂柯斧柄',
    kind: 'curio',
    grade: 5,
    price: 0,
    desc: '朽得一碰就散。握着它,汝忽然记得看完一整局棋是什么感觉。',
    effect: { chessDao: 6, insight: 3, lifespan: 20 },
    hidden: true,
  },
  {
    id: 'scroll_lanke',
    name: '烂柯残卷',
    kind: 'manual',
    grade: 3,
    price: 0,
    desc: '樵夫用它包过柴。展开来,是半局没人下完的棋。',
    effect: { teachManual: 'manual_gupu_lanke', insight: 2 },
    hidden: true,
  },
  {
    id: 'scroll_songfeng',
    name: '松风谱抄本',
    kind: 'manual',
    grade: 4,
    price: 0,
    desc: '抄得极工整,末页却有一行潦草的批注:「此手我至今不解。」',
    effect: { teachManual: 'manual_mingpu_songfeng', insight: 3 },
    hidden: true,
  },
  {
    id: 'curio_wuziqi',
    name: '无字棋谱',
    kind: 'manual',
    grade: 5,
    price: 0,
    desc: '一页字也没有。看得久了,页上会浮出汝自己下过的棋。',
    effect: { teachManual: 'manual_tianpu_wuzi', insight: 4 },
    hidden: true,
  },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

export function getItem(id: string): ItemDef | undefined {
  return ITEM_BY_ID[id];
}

/** Resolve by id first, then by exact display name — for text commands. */
export function findItem(query: string): ItemDef | undefined {
  const q = query.trim();
  return ITEM_BY_ID[q] ?? ITEMS.find((i) => i.name === q);
}
