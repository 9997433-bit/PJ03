// ============================================================================
// techniques.ts — 功法与战斗术法
// 功法(修炼主功):速度乘数 + 战力加成;五行与灵根相合者引擎再 ×1.2。
// 战斗术法:【术法】指令释放,平添战力(power 与 powerBonus 同值并存,兼容两处引用)。
// 查找函数做了 id 归一化(去下划线、不分大小写),以兼容 yinQiJue / yinqi_jue 等写法。
// 黄阶市贩可得 → 玄阶需人脉任务 → 地阶为大机缘 → 天阶仅存于传说。
// ============================================================================

import type { AnyElement, RealmId, TechniqueGrade } from '@/engine/types';

export interface TechniqueData {
  id: string;
  name: string;
  grade: TechniqueGrade;
  /** null = 无属性,万灵根可修 */
  elementAffinity: AnyElement[] | null;
  /** 修炼速度乘数(1.1 = +10%) */
  speedBonus: number;
  /** 战力加成(平添) */
  powerBonus: number;
  minRealm: RealmId;
  /** 0 = 非卖品(机缘/任务限定) */
  price: number;
  /** 获取途径 */
  source: string;
  desc: string;
}

export interface CombatArtData {
  id: string;
  name: string;
  element: AnyElement | null;
  /** 术法威能(两个字段同值,兼容 art.power 与 art.powerBonus 两种引用) */
  power: number;
  powerBonus: number;
  minRealm: RealmId;
  price: number;
  source: string;
  desc: string;
}

export const TECHNIQUES: TechniqueData[] = [
  // ── 黄阶 ── 市井可求,聊胜于无 ─────────────────────────
  {
    id: 'yinqi_jue', name: '引气诀', grade: '黄阶',
    elementAffinity: null, speedBonus: 1.0, powerBonus: 0,
    minRealm: 'mortal', price: 30, source: '坊市有售;修仙世家家学',
    desc: '流传最广的入门吐纳法,号称「万法之母」——意思是,它什么都生不出来,只能让汝不死在起点。',
  },
  {
    id: 'changchun_gong', name: '长春功', grade: '黄阶',
    elementAffinity: ['木'], speedBonus: 1.08, powerBonus: 2,
    minRealm: 'mortal', price: 60, source: '坊市有售',
    desc: '木行养生功,气息绵长如老树盘根。修此功者多长寿,也多平庸——树活千年,终究是树。',
  },
  {
    id: 'ruijin_jue', name: '锐金诀', grade: '黄阶',
    elementAffinity: ['金'], speedBonus: 1.06, powerBonus: 5,
    minRealm: 'mortal', price: 60, source: '坊市有售',
    desc: '金行炼体小法,气走锋锐一路。练到深处,指甲能刮出火星,市井斗殴,颇有威名。',
  },
  {
    id: 'ningbi_jue', name: '凝碧诀', grade: '黄阶',
    elementAffinity: ['水'], speedBonus: 1.08, powerBonus: 2,
    minRealm: 'mortal', price: 60, source: '坊市有售',
    desc: '水行静功,以静制动,以柔化刚。心浮气躁者修之,三日便弃;沉得住气者,细水长流。',
  },
  {
    id: 'yanyang_gong', name: '炎阳功', grade: '黄阶',
    elementAffinity: ['火'], speedBonus: 1.06, powerBonus: 4,
    minRealm: 'mortal', price: 60, source: '坊市有售',
    desc: '火行刚猛功法,气血如烹。冬日修炼可免炭火——是穷修士选它最实在的理由。',
  },
  {
    id: 'houtu_gong', name: '厚土功', grade: '黄阶',
    elementAffinity: ['土'], speedBonus: 1.05, powerBonus: 3,
    minRealm: 'mortal', price: 60, source: '坊市有售',
    desc: '土行守御功法,皮糙肉厚。挨打不还手也能耗死对方——前提是,对方愿意陪汝耗。',
  },
  {
    id: 'wuxing_zalu', name: '五行杂炼录', grade: '黄阶',
    elementAffinity: ['金', '木', '水', '火', '土'], speedBonus: 1.05, powerBonus: 2,
    minRealm: 'mortal', price: 90, source: '坊市有售(专为杂灵根所制)',
    desc: '某位五灵根前辈穷尽一生编纂的杂修法门,五行兼顾,专治「练什么都不合」。扉页只有一行字:「同病者,共勉。」',
  },

  // ── 玄阶 ── 宗门真传,人脉方得 ─────────────────────────
  {
    id: 'qingyuan_jianjue', name: '青元剑诀', grade: '玄阶',
    elementAffinity: ['金', '木'], speedBonus: 1.2, powerBonus: 18,
    minRealm: 'qi', price: 800, source: '落霞宗真传;宗门贡献或长老赏识可得',
    desc: '落霞宗立派剑功,剑气青莹如春水初生。修至深处,袖中飞剑三尺,可裁云,可断江。',
  },
  {
    id: 'xuanbing_jue', name: '玄冰诀', grade: '玄阶',
    elementAffinity: ['水', '冰'], speedBonus: 1.22, powerBonus: 14,
    minRealm: 'qi', price: 800, source: '坊市偶有残本;完本在掩月谷',
    desc: '寒潭底修出来的功法,气息森冷入骨。修者掌心常年凝霜,握过的茶盏,再也热不起来。',
  },
  {
    id: 'chiyan_fentian', name: '赤炎焚天功', grade: '玄阶',
    elementAffinity: ['火'], speedBonus: 1.2, powerBonus: 20,
    minRealm: 'qi', price: 900, source: '散修渠道;黑市偶见',
    desc: '霸道火功,进境迅猛,伤敌亦伤己。功法末页有前人血书:「练到第七层,记得住在水边。」',
  },
  {
    id: 'muling_changsheng', name: '木灵长生功', grade: '玄阶',
    elementAffinity: ['木'], speedBonus: 1.25, powerBonus: 8,
    minRealm: 'qi', price: 850, source: '百药园园主亲传;药修一脉',
    desc: '以木行生机温养经脉,修炼如春雨润物。兼修此功者炼丹时灵识格外敏锐,是药修的看家本领。',
  },
  {
    id: 'yanjia_gong', name: '岩甲功', grade: '玄阶',
    elementAffinity: ['土'], speedBonus: 1.15, powerBonus: 25,
    minRealm: 'qi', price: 800, source: '巨剑门外流;矿脉修士多习',
    desc: '土行至刚法门,灵气化岩附体,硬撼法器而不伤。缺点是修者体重日增——御风轻身之术,与此功无缘。',
  },
  {
    id: 'leiguang_cuiti', name: '雷光淬体诀', grade: '玄阶',
    elementAffinity: ['雷'], speedBonus: 1.3, powerBonus: 22,
    minRealm: 'qi', price: 0, source: '变异雷灵根专属;机缘事件可得',
    desc: '引天雷淬体的狂法,非雷灵根者修之即焚。功成之日,出手带电光,快过常人一线——生死之间,一线即天堑。',
  },

  // ── 地阶 ── 一部功法,一场造化 ─────────────────────────
  {
    id: 'dayan_jue', name: '大衍诀', grade: '地阶',
    elementAffinity: null, speedBonus: 1.45, powerBonus: 30,
    minRealm: 'qi', price: 0, source: '上古传承;机缘事件限定',
    desc: '相传出自上古大能之手,推演天机、包容五行,任何灵根修之皆如鱼得水。修仙界闻其名者众,见其文者,一只手数得过来。',
  },
  {
    id: 'xuantian_zhanling', name: '玄天斩灵剑经', grade: '地阶',
    elementAffinity: ['金'], speedBonus: 1.35, powerBonus: 55,
    minRealm: 'foundation', price: 0, source: '荒古战场遗迹;断剑崖渊源',
    desc: '战场上杀出来的剑经,字字带血。剑意所指,斩灵斩魂——习此剑者,先问自己一句:此生打算杀多少人?',
  },
  {
    id: 'taiyin_lianxing', name: '太阴炼形篇', grade: '地阶',
    elementAffinity: ['水', '冰'], speedBonus: 1.4, powerBonus: 35,
    minRealm: 'foundation', price: 0, source: '掩月谷至宝;残篇流落在外',
    desc: '月华炼形,阴极生阳。修至大成者形神如玉,寿数绵长。残篇流落江湖之后,为它死的人,已够修一座祠。',
  },
  {
    id: 'guizang_jue', name: '归藏诀', grade: '地阶',
    elementAffinity: ['土', '木'], speedBonus: 1.38, powerBonus: 40,
    minRealm: 'foundation', price: 0, source: '无名洞府;前辈遗泽',
    desc: '大巧若拙的守成法门,气息内敛如古井。修此功者站在人群里,神识扫十遍也扫不出来——保命,亦是大道。',
  },

  // ── 天阶 ── 传说 ─────────────────────────────────────
  {
    id: 'taixuan_jing', name: '太玄经', grade: '天阶',
    elementAffinity: null, speedBonus: 1.7, powerBonus: 80,
    minRealm: 'core', price: 0, source: '仅存残页;集齐者,此界三千年未有',
    desc: '据传为飞升者留下的道书,一页可换一座城。书香门第的沈家祖上,曾为其中一页做过注——注文尚在,原页已佚。',
  },
];

export const COMBAT_ARTS: CombatArtData[] = [
  {
    id: 'jianqi_shu', name: '剑气术', element: '金',
    power: 12, powerBonus: 12, minRealm: 'qi', price: 80, source: '坊市符卷有售',
    desc: '聚气成刃,隔空伤敌。修仙界最常见的杀人技——常见,是因为好用。',
  },
  {
    id: 'huoqiu_shu', name: '火球术', element: '火',
    power: 14, powerBonus: 14, minRealm: 'qi', price: 80, source: '坊市符卷有售',
    desc: '拳大一团真火,炼气期的看家本领。多少妖兽的皮毛、多少散修的胡子,毁于此术。',
  },
  {
    id: 'tujia_shu', name: '土甲术', element: '土',
    power: 10, powerBonus: 10, minRealm: 'qi', price: 80, source: '坊市符卷有售',
    desc: '黄光附体,硬受一击。看着土气,救过的命比任何华丽术法都多。',
  },
  {
    id: 'bingzhui_shu', name: '冰锥术', element: '水',
    power: 13, powerBonus: 13, minRealm: 'qi', price: 90, source: '坊市符卷偶有',
    desc: '凝水成锥,破空无声。杀人于无声者,先要自己心如止水。',
  },
  {
    id: 'yufeng_jue', name: '御风诀', element: '风',
    power: 8, powerBonus: 8, minRealm: 'qi', price: 120, source: '游方道人处求得',
    desc: '身轻如叶,来去乘风。战力平平,但「打不过就跑」四个字,它演绎得最漂亮。',
  },
  {
    id: 'qingzhu_jianyun', name: '青竹蜂云剑术', element: '金',
    power: 30, powerBonus: 30, minRealm: 'foundation', price: 0, source: '需持青竹蜂云剑方可修习',
    desc: '一剑化七,如蜂群蔽日。剑修毕生所求,不过是让对手数不清自己会死于哪一剑。',
  },
  {
    id: 'leiguang_shan', name: '雷光闪', element: '雷',
    power: 35, powerBonus: 35, minRealm: 'foundation', price: 0, source: '雷灵根机缘限定',
    desc: '化身雷光,先发制人。对手看见雷光的时候,胜负已经分完了。',
  },
  {
    id: 'xuedun_shu', name: '血遁术', element: null,
    power: 0, powerBonus: 0, minRealm: 'qi', price: 0, source: '魔道功法;柳如烟或魔修渠道',
    desc: '燃血遁走,十死无生之局可保一线。魔道的东西,救命时最好用——账,以后再算。',
  },
];

/** id 归一化:去除下划线、连字符,统一小写 — 兼容 yinQiJue / yinqi_jue 等历史写法 */
function norm(id: string): string {
  return id.replace(/[_\-\s]/g, '').toLowerCase();
}

const TECH_INDEX = new Map(TECHNIQUES.map((t) => [norm(t.id), t]));
const ART_INDEX = new Map(COMBAT_ARTS.map((a) => [norm(a.id), a]));

export function getTechnique(idOrName: string): TechniqueData | undefined {
  return TECH_INDEX.get(norm(idOrName)) ?? TECHNIQUES.find((t) => t.name === idOrName.trim());
}

export function getCombatArt(idOrName: string): CombatArtData | undefined {
  return ART_INDEX.get(norm(idOrName)) ?? COMBAT_ARTS.find((a) => a.name === idOrName.trim());
}

/** 同义导出(旧代码以 getArt 相称) */
export const getArt = getCombatArt;
