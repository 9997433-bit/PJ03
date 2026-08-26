import type { SpiritBeing } from '@/engine/types';

/**
 * 精怪录 — twelve beings who may, if you are patient and courteous, decide
 * that you are worth talking to.
 *
 * Favour runs −50…100. Nothing here can be fought; the only levers are
 * gifts, the choices you make in their events, and playing them a decent
 * game of go.
 */
export const SPIRITS: readonly SpiritBeing[] = [
  {
    id: 'zhuxian',
    name: '阿箬',
    kind: '狐仙',
    title: '竹海青狐',
    favor: 0,
    home: 'zhulin',
    minRealm: 'chen',
    desc: '化作卖笋少女在林边坐着,尾巴藏得不太好。棋下得急,输了会跺脚。',
    thresholds: [
      { at: 20, unlock: '阿箬肯带汝走竹海里的近路。', gift: { insight: 1 } },
      { at: 50, unlock: '她把自家藏的松脂琥珀塞给汝。', gift: { itemId: 'curio_songzhi' } },
      { at: 80, unlock: '阿箬教汝听竹子说话——那是她族里的秘术。', gift: { chessDao: 5, insight: 2 } },
    ],
  },
  {
    id: 'laogui',
    name: '玄丈',
    kind: '水族',
    title: '沧河老龟',
    favor: 0,
    home: 'canghe',
    minRealm: 'yangqi',
    desc: '在河底压了八百年。说话极慢,一句话能拖过一个下午。棋风更慢。',
    thresholds: [
      { at: 25, unlock: '玄丈允汝在他背上晒太阳。' , gift: { coin: 40 } },
      { at: 55, unlock: '他吐出一枚含了三百年的寒玉。', gift: { itemId: 'stone_hanyu' } },
      { at: 85, unlock: '玄丈把甲上的纹路指给汝看——那是一整部残谱。', gift: { chessDao: 8, insight: 3 } },
    ],
  },
  {
    id: 'songling',
    name: '不语',
    kind: '山精',
    title: '古松木灵',
    favor: 0,
    home: 'lankeshan',
    minRealm: 'mingxin',
    desc: '烂柯山上那棵松。从不开口,以落针成字作答。',
    thresholds: [
      { at: 20, unlock: '松针在地上摆出「坐」字。', gift: { insight: 1 } },
      { at: 50, unlock: '它落下一段朽了的木柄。', gift: { itemId: 'curio_lankeaxe' } },
      { at: 80, unlock: '不语终于说了一个字。汝没听清,但心里亮了。', gift: { chessDao: 10 } },
    ],
  },
  {
    id: 'yeyoushen',
    name: '崔判',
    kind: '神祇',
    title: '城隍夜游',
    favor: 0,
    home: 'yezhen',
    minRealm: 'mingxin',
    desc: '提灯巡夜的青袍官。爱和人赌棋,赌注是别人的寿数——汝的除外。',
    thresholds: [
      { at: 25, unlock: '崔判在名册上把汝的名字往后挪了一格。', gift: { insight: 2 } },
      { at: 55, unlock: '他借汝一盏青灯,照得见不该照的东西。', gift: { itemId: 'charm_bigui' } },
      { at: 85, unlock: '崔判默许汝翻阅生死簿的边角。', gift: { chessDao: 6, coin: 200 } },
    ],
  },
  {
    id: 'jinggui',
    name: '阿沅',
    kind: '鬼魅',
    title: '井中女',
    favor: 0,
    home: 'ningan',
    minRealm: 'chen',
    desc: '宁安县衙后那口枯井里的。生前爱棋,死后无人对局,已寂寞很久。',
    thresholds: [
      { at: 20, unlock: '井里传上来一声笑。', gift: { insight: 1 } },
      { at: 50, unlock: '阿沅把陪葬的铜铃递上来。', gift: { itemId: 'curio_tongling' } },
      { at: 80, unlock: '她说：「我这局，下完了。」井水第二日就清了。', gift: { chessDao: 6, insight: 2 } },
    ],
  },
  {
    id: 'yanling',
    name: '砚奴',
    kind: '器灵',
    title: '问心砚灵',
    favor: 0,
    home: 'xuanque',
    minRealm: 'tongxuan',
    desc: '一方老砚生出的灵。脾气坏,嫌所有人的字都写得难看。',
    thresholds: [
      { at: 25, unlock: '砚奴勉强承认汝的横还算平。', gift: { insight: 2 } },
      { at: 55, unlock: '它替汝磨了一次墨——墨里有它自己。', gift: { itemId: 'brush_songyan' } },
      { at: 85, unlock: '砚奴愿随汝走。它说外头的纸也许好些。', gift: { chessDao: 7, insight: 3 } },
    ],
  },
  {
    id: 'hebo',
    name: '稽伯',
    kind: '水族',
    title: '稽川河伯',
    favor: 0,
    home: 'jichuan',
    minRealm: 'chen',
    desc: '管着一段渡口的小神。爱喝酒,酒后爱悔棋。',
    thresholds: [
      { at: 20, unlock: '稽伯让船家不收汝的钱。', gift: { coin: 30 } },
      { at: 50, unlock: '他从水里摸出一副被人扔了的云子。', gift: { itemId: 'stone_yunzi' } },
      { at: 80, unlock: '稽伯把这段河的水情全说给汝听。', gift: { chessDao: 4, insight: 2 } },
    ],
  },
  {
    id: 'zhongling',
    name: '无相',
    kind: '器灵',
    title: '古寺钟灵',
    favor: 0,
    home: 'gusi',
    minRealm: 'mingxin',
    desc: '寺里那口钟。无人撞时自鸣,僧人已习惯,只当是风。',
    thresholds: [
      { at: 25, unlock: '钟为汝响了一声,只汝一人听见。', gift: { insight: 2 } },
      { at: 55, unlock: '无相以钟声替汝洗去一身尘。', gift: { itemId: 'tea_wangyou' } },
      { at: 85, unlock: '它教汝在心里敲那一下。此后汝再不会慌。', gift: { chessDao: 8 } },
    ],
  },
  {
    id: 'shangui',
    name: '阿绫',
    kind: '山精',
    title: '九荒山鬼',
    favor: 0,
    home: 'jiuhuang',
    minRealm: 'yangqi',
    desc: '披着薜荔,站在无字碑上唱前朝的歌。谁给她起个名字,她能高兴很多年。',
    thresholds: [
      { at: 25, unlock: '阿绫替汝挡了一次山瘴。', gift: { insight: 1 } },
      { at: 55, unlock: '她把碑下埋的东西刨给汝。', gift: { itemId: 'curio_yueyingjing' } },
      { at: 85, unlock: '阿绫在碑上刻了汝的名字。碑从此有字了。', gift: { chessDao: 6, insight: 3 } },
    ],
  },
  {
    id: 'dujin',
    name: '摆渡人',
    kind: '神祇',
    title: '阴司渡口',
    favor: 0,
    home: 'yinsi',
    minRealm: 'tongxuan',
    desc: '斗笠压得极低,看不见脸。一辈子只问一句：「上不上船?」',
    thresholds: [
      { at: 30, unlock: '他破例允汝在岸边坐一会儿。', gift: { insight: 3 } },
      { at: 60, unlock: '摆渡人指了指对岸,让汝看一眼便回。', gift: { chessDao: 5 } },
      { at: 90, unlock: '他把船篙横过来当枰,与汝下了一局。', gift: { chessDao: 12, insight: 5 } },
    ],
  },
  {
    id: 'yunweng',
    name: '云中叟',
    kind: '神祇',
    title: '棋台守',
    favor: 0,
    home: 'yunhai',
    minRealm: 'zuowang',
    desc: '在云海棋台守了不知多少年,等一个能把那局下完的人。',
    thresholds: [
      { at: 30, unlock: '老叟为汝拂去石台上的云。', gift: { insight: 4 } },
      { at: 60, unlock: '他允汝执白。', gift: { chessDao: 8 } },
      { at: 90, unlock: '云中叟起身让座。「这台子,该换人守了。」', gift: { chessDao: 15, insight: 8 } },
    ],
  },
  {
    id: 'bailu',
    name: '白鹿',
    kind: '山精',
    title: '不请自来',
    favor: 0,
    home: 'zhulin',
    minRealm: 'mingxin',
    desc: '不属于任何一处,却总在汝最静的时候出现在路的尽头。',
    thresholds: [
      { at: 20, unlock: '白鹿停下来看了汝一眼。', gift: { insight: 2 } },
      { at: 55, unlock: '它领汝去了一处地图上没有的泉。', gift: { itemId: 'tea_shixin' } },
      { at: 85, unlock: '白鹿低头,让汝骑了一程。风声里全是棋。', gift: { chessDao: 9, insight: 4 } },
    ],
  },
];

export const SPIRIT_BY_ID: Record<string, SpiritBeing> = Object.fromEntries(
  SPIRITS.map((s) => [s.id, s]),
);

export function getSpirit(id: string): SpiritBeing | undefined {
  return SPIRIT_BY_ID[id];
}

/** A fresh, mutable register for a new life. */
export function initialSpirits(): Record<string, SpiritBeing> {
  const out: Record<string, SpiritBeing> = {};
  for (const s of SPIRITS) {
    out[s.id] = { ...s, thresholds: s.thresholds.map((t) => ({ ...t })), met: false, crossed: [] };
  }
  return out;
}
