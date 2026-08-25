// ============================================================================
// items.ts — 物品图鉴(80+)
// 丹药 / 兵刃 / 甲胄 / 饰物 / 符箓 / 材料 / 典籍 / 杂物秘宝。
// price=0 或 kind='misc' 者不入坊市;hidden=true 者(神秘小瓶)永不见于
// 任何商店、鉴定或审计明文。查找函数做 id 归一化,兼容历史写法。
// 契约:'huodanfu'(火弹符)'dundifu'(遁地符)'juLingHuan'(聚灵环)
// 'hushen_yupei'(护身玉佩)等 id 已被引擎按字面引用,不可改。
// ============================================================================

import type { Attributes, RealmId } from '@/engine/types';

export type ItemKindData =
  | 'pill' | 'weapon' | 'armor' | 'accessory' | 'talisman' | 'material' | 'manual' | 'misc';

/** 数据侧物品效果 — 引擎 ItemEffect 的超集 */
export interface ItemEffectData {
  hp?: number;
  exp?: number;
  /** 一次性:下次突破成算加成(佩戴类则为常驻) */
  breakthroughBonus?: number;
  attribute?: [keyof Attributes, number];
  cureInjury?: boolean;
  cureStatus?: boolean;
  /** 破除瓶颈(两连败减半状态) */
  clearBottleneck?: boolean;
  /** 丹力绵长:此后 turns 季修行 ×mult */
  expBuff?: { mult: number; turns: number };
  teachTechnique?: string;
  teachArt?: string;
  /** 符箓:战斗中遁走必成 */
  escape?: boolean;
  /** 符箓:战斗直伤 */
  damage?: number;
}

export interface ItemData {
  id: string;
  name: string;
  kind: ItemKindData;
  grade: 1 | 2 | 3 | 4 | 5;
  /** 0 = 无市价(非卖品) */
  price: number;
  desc: string;
  effect?: ItemEffectData;
  power?: number;
  defense?: number;
  /** 坊市上架的境界门槛 */
  minRealm?: RealmId;
  /** 永不见于商店/鉴定明文(神秘小瓶) */
  hidden?: boolean;
  /** 一世仅得一件 */
  unique?: boolean;
  /** false = 商家不收(任务信物等) */
  sellable?: boolean;
}

export const ITEMS: ItemData[] = [
  // ═══════════ 丹药 ═══════════
  {
    id: 'huiqi_san', name: '回气散', kind: 'pill', grade: 1, price: 10,
    effect: { hp: 30 },
    desc: '粗制伤药,苦得舌根发麻。散修行囊里的常客——便宜,顶用,不体面。',
  },
  {
    id: 'shengji_san', name: '生肌散', kind: 'pill', grade: 2, price: 40,
    effect: { hp: 80 },
    desc: '敷内服两便,断骨生肌。药香里带一丝腥甜,那是紫背蜈蚣的味道。别问。',
  },
  {
    id: 'liaoshang_dan', name: '疗伤丹', kind: 'pill', grade: 2, price: 60,
    effect: { hp: 60, cureInjury: true },
    desc: '化瘀通络,根除暗伤。老修士的规矩:储物袋里可以没有灵石,不能没有疗伤丹。',
  },
  {
    id: 'bigu_dan', name: '辟谷丹', kind: 'pill', grade: 1, price: 3,
    effect: { hp: 5 },
    desc: '一粒顶十日饱。淡而无味,吃久了会想念一碗热汤饼——修行清苦,先苦在嘴上。',
  },
  {
    id: 'juqi_san', name: '聚气散', kind: 'pill', grade: 1, price: 15,
    effect: { exp: 25 },
    desc: '辅助引气的药散,微含灵气。入门弟子攒下第一笔灵石,多半换了它。',
  },
  {
    id: 'juqi_dan', name: '聚气丹', kind: 'pill', grade: 1, price: 25,
    effect: { exp: 45 },
    desc: '炼气期的硬通货,一粒可抵旬月苦功。坊市里论把抓,论把买的人不多。',
  },
  {
    id: 'huanglong_dan', name: '黄龙丹', kind: 'pill', grade: 2, price: 90, minRealm: 'qi',
    effect: { exp: 160 },
    desc: '药力浑厚如陈年老酒,入腹自走周天。炼气中后期修士省吃俭用,多半是为了它。',
  },
  {
    id: 'peiyuan_dan', name: '培元丹', kind: 'pill', grade: 2, price: 110, minRealm: 'qi',
    effect: { exp: 100, hp: 40 },
    desc: '固本培元,修为气血两补。病弱之躯入道,全靠此丹撑过头几年。',
  },
  {
    id: 'ningshen_dan', name: '凝神丹', kind: 'pill', grade: 3, price: 260, minRealm: 'qi',
    effect: { expBuff: { mult: 1.5, turns: 4 } },
    desc: '服后神台澄澈,药力绵延一年(此后四季修行倍半)。闭关之前,老修士案头必备。',
  },
  {
    id: 'zhuji_dan', name: '筑基丹', kind: 'pill', grade: 3, price: 400, minRealm: 'qi',
    effect: { breakthroughBonus: 20 },
    desc: '筑基界碑前的一把天梯(下次突破 +20%)。凡人修士,一生所求不过此丹。多少炼气十三层的老修,守着空瓶熬白了头。',
  },
  {
    id: 'jiuqu_lingshen_dan', name: '九曲灵参丹', kind: 'pill', grade: 4, price: 1200, minRealm: 'qi',
    effect: { breakthroughBonus: 35, hp: 100 },
    desc: '以百年九曲灵参为主药,九转文火炼成(下次突破 +35%)。丹成之日满室异香——传说闻过的老鼠都开了灵智。',
  },
  {
    id: 'ningjin_dan', name: '凝金丹', kind: 'pill', grade: 4, price: 2000, minRealm: 'foundation',
    effect: { breakthroughBonus: 15 },
    desc: '助结金丹的上品丹药,有价无市(下次突破 +15%)。市面上的每一粒,都有一段来历不明的故事。',
  },
  {
    id: 'jieying_dan', name: '结婴丹', kind: 'pill', grade: 5, price: 8000, minRealm: 'core',
    effect: { breakthroughBonus: 12 },
    desc: '碎丹化婴的一线生机(下次突破 +12%)。此丹现世必起风波——元婴之下皆蝼蚁,谁不想做那个例外?',
  },
  {
    id: 'jingxin_dan', name: '静心丹', kind: 'pill', grade: 2, price: 120,
    effect: { cureInjury: true, cureStatus: true },
    desc: '清心涤虑,可镇心魔。丹香清冽如雪后松风。心病还须心药医,此丹只保汝撑到医好心病的那天。',
  },
  {
    id: 'jingxin_wan', name: '静心丸', kind: 'pill', grade: 1, price: 30,
    effect: { hp: 15, cureStatus: true },
    desc: '民间土方所制的安神药丸,药力粗浅,胜在一片心意。搓丸的手若细致,针脚般的纹路还留在丸上。',
  },
  {
    id: 'pozhang_dan', name: '破障丹', kind: 'pill', grade: 3, price: 300, minRealm: 'qi',
    effect: { clearBottleneck: true },
    desc: '专破修行瓶颈的猛药(解除瓶颈)。药力如锥,凿开卡关处的淤塞——壁障凿不开,淤塞总凿得开。',
  },
  {
    id: 'xisui_dan', name: '洗髓丹', kind: 'pill', grade: 3, price: 600, minRealm: 'qi',
    effect: { attribute: ['genGu', 1] },
    desc: '伐毛洗髓,重塑根骨(根骨永久 +1)。资质差的修士听到这名字会红眼睛——它贵得有道理。',
  },
  {
    id: 'wudao_cha', name: '悟道茶', kind: 'pill', grade: 4, price: 900, minRealm: 'foundation',
    effect: { attribute: ['wuXing', 1] },
    desc: '灵茶百年一采,一盏即忘言(悟性永久 +1)。喝过的人都说不出它的味道——说得出的,都没喝过真的。',
  },
  {
    id: 'guixi_dan', name: '龟息丹', kind: 'pill', grade: 2, price: 80,
    effect: { hp: 20 },
    desc: '服后气息全敛,如老龟蛰泥。逃命的学问里,「装死」是一门大学问。',
  },

  // ═══════════ 兵刃 ═══════════
  {
    id: 'xiu_bishou', name: '锈迹匕首', kind: 'weapon', grade: 1, price: 2, power: 2,
    desc: '刃口的锈比铁多。但在桥洞里睡觉的年月,它让汝活到了今天。',
  },
  {
    id: 'chai_dao', name: '柴刀', kind: 'weapon', grade: 1, price: 3, power: 3,
    desc: '斫柴的家什,刀背厚,分量足。山里人信它,胜过信菩萨。',
  },
  {
    id: 'tie_jian', name: '铁剑', kind: 'weapon', grade: 1, price: 30, power: 5,
    desc: '凡铁所铸,三斤四两。修仙者的第一柄剑多半是它——后来剑越换越好,梦回时握着的还是它。',
  },
  {
    id: 'tie_gong', name: '铁弓', kind: 'weapon', grade: 1, price: 25, power: 4,
    desc: '猎户旧物,弓弦犹带山风。射狼够了;射妖,得看妖给不给面子。',
  },
  {
    id: 'jinggang_ci', name: '精钢刺', kind: 'weapon', grade: 2, price: 80, power: 8,
    desc: '三棱透甲,见血封喉的形状。打造它的铁匠只问了一句:「杀人还是防身?」——其实是一回事。',
  },
  {
    id: 'qingfeng_jian', name: '青锋剑', kind: 'weapon', grade: 2, price: 150, power: 12,
    desc: '百炼精钢,淬灵泉七次,隐有青芒。炼气修士配它,算是有了一件拿得出手的行头。',
  },
  {
    id: 'xuantie_zhongjian', name: '玄铁重剑', kind: 'weapon', grade: 3, price: 500, power: 22, minRealm: 'qi',
    desc: '玄铁为骨,重逾百斤,剑出如崩山。用它的人不多——扛得动它的人不多。',
  },
  {
    id: 'moya_lingfan', name: '墨鸦灵幡', kind: 'weapon', grade: 3, price: 450, power: 20, minRealm: 'qi',
    desc: '魔道法器,幡动处鸦声凄厉,慑人心神。杀敌很好用,只是夜里,它偶尔自己响。',
  },
  {
    id: 'qingfu_feijian', name: '青蚨飞剑', kind: 'weapon', grade: 3, price: 800, power: 30, minRealm: 'foundation',
    desc: '下品法器,御气而飞,来去如电。筑基修士的体面,一半在境界,一半在这类东西上。',
  },
  {
    id: 'chixiao_feijian', name: '赤霄飞剑', kind: 'weapon', grade: 4, price: 2400, power: 48, minRealm: 'foundation',
    desc: '中品火行法器,御使时剑身赤芒流转,如一线晚霞裁空。见过它出鞘的人,评价出奇一致:快。',
  },
  {
    id: 'faqi_qinghong', name: '古剑·青虹', kind: 'weapon', grade: 4, price: 0, power: 42, unique: true, sellable: false,
    desc: '涧底寒潭中倒插千年的古剑,青芒不灭,出鞘时如一道青虹裁开夜幕。剑身无铭,唯有旧主的一缕剑意未散——它在等一个配得上它的人。',
  },
  {
    id: 'qingzhu_fengyun_jian', name: '青竹蜂云剑', kind: 'weapon', grade: 5, price: 0, power: 60, unique: true,
    desc: '七十二柄小剑合铸一体,御使如蜂群出巢,遮天蔽日。得剑者可参悟《青竹蜂云剑术》。剑柄内侧刻着极小的两个字:韩制。',
  },

  // ═══════════ 甲胄 ═══════════
  {
    id: 'cubu_yi', name: '粗布衣', kind: 'armor', grade: 1, price: 1, defense: 1,
    desc: '洗得发白,补丁摞补丁。它挡不住刀,挡得住山风与人眼。',
  },
  {
    id: 'ruan_jia', name: '软甲', kind: 'armor', grade: 1, price: 40, defense: 4,
    desc: '细鳞软甲,贴身而轻。狼咬第一口的时候,汝还有机会拔刀。',
  },
  {
    id: 'ruanwei_jia', name: '软猬甲', kind: 'armor', grade: 2, price: 160, defense: 8,
    desc: '千枚铁刺妖猬的软刺编成,贴身而穿,刀剑难透。抱汝的人,也得小心。',
  },
  {
    id: 'xuanwu_jia', name: '玄武甲', kind: 'armor', grade: 2, price: 200, defense: 10,
    desc: '玄龟纹甲,厚重沉稳。穿上它,汝跑不快了——也不用跑那么快了。',
  },
  {
    id: 'qingmang_ruanjia', name: '青蟒软甲', kind: 'armor', grade: 3, price: 700, defense: 16, minRealm: 'foundation',
    desc: '一阶巅峰青蟒的蜕皮所制,轻若无物,韧如百炼钢。蟒死的时候,它正准备化蛟。',
  },
  {
    id: 'fayi_xuangui', name: '玄龟法衣', kind: 'armor', grade: 3, price: 0, defense: 18, unique: true, sellable: false, minRealm: 'qi',
    desc: '以三阶玄龟蜕甲织入法衣,水火难侵。宗门执法长老亲手所赐之物,穿在身上的不止是甲,是靠山。',
  },
  {
    id: 'jinsi_daopao', name: '金丝道袍', kind: 'armor', grade: 4, price: 2600, defense: 26, minRealm: 'core',
    desc: '天蚕金丝织就,水火不侵,法器加身自动泛起灵光。穿它的人往人前一站,杀气都会绕着走——通常。',
  },

  // ═══════════ 饰物 ═══════════
  {
    id: 'chuwu_dai', name: '储物袋', kind: 'accessory', grade: 2, price: 300,
    desc: '方寸之内,别有洞天(一丈见方)。凡人挤破头想看一眼的仙家手段,在修士这里,是个钱袋。',
  },
  {
    id: 'qiankun_dai', name: '乾坤袋', kind: 'accessory', grade: 4, price: 3000, minRealm: 'foundation',
    desc: '储物袋的祖宗,内藏空间十丈。老话说:看修士的家底别看剑,看袋子——错了,好袋子看着都不鼓。',
  },
  {
    id: 'juLingHuan', name: '聚灵环', kind: 'accessory', grade: 3, price: 1200, minRealm: 'qi',
    desc: '戴于腕上,周身三尺灵气自聚(修炼速度 +10%)。省下的每一天,到了突破那日都是账。',
  },
  {
    id: 'hushen_yupei', name: '护身玉佩', kind: 'accessory', grade: 3, price: 800, minRealm: 'qi',
    effect: { breakthroughBonus: 5 },
    desc: '温玉养人,佩之心神安定(佩戴时突破成算 +5)。玉上一道旧裂纹——它替前主人挡过一次,只一次。',
  },
  {
    id: 'huxin_jing', name: '护心镜', kind: 'accessory', grade: 2, price: 200, defense: 6,
    desc: '青铜古镜,悬于心口。镜面裂过一次——那一次,它替主人挡了半剑。只有半剑。',
  },
  {
    id: 'bichen_zhu', name: '避尘珠', kind: 'accessory', grade: 3, price: 700, defense: 5, minRealm: 'foundation',
    desc: '悬于颈间,尘泥不沾,毒瘴自避。爱洁之人视若性命,逃命之人视若累赘。',
  },

  // ═══════════ 符箓 ═══════════
  {
    id: 'huodanfu', name: '火弹符', kind: 'talisman', grade: 1, price: 35, power: 40,
    effect: { damage: 40 },
    desc: '一次性攻伐符箓,撕之即燃(战斗伤害 40)。炼气一层也能打出炼气七层的排面——就一下。',
  },
  {
    id: 'jinren_fu', name: '金刃符', kind: 'talisman', grade: 2, price: 90, power: 80, minRealm: 'qi',
    effect: { damage: 80 },
    desc: '符成金刃,斩铁如泥(战斗伤害 80)。画符的老道手抖,十张里两张废——所以便宜,所以碰运气。',
  },
  {
    id: 'dundifu', name: '遁地符', kind: 'talisman', grade: 2, price: 80,
    effect: { escape: true },
    desc: '一拍即遁,土行三里(战斗中遁走必成)。符师的良心之作:它救过的命,比丹药多,比佛多。',
  },
  {
    id: 'hushen_fu', name: '护身符', kind: 'talisman', grade: 2, price: 100,
    effect: { hp: 50 },
    desc: '金光一闪,替汝硬受一击(临阵回血 50)。多少人临死前最后一个念头是:早知道多买两张。',
  },
  {
    id: 'yinni_fu', name: '隐匿符', kind: 'talisman', grade: 2, price: 120,
    desc: '敛息藏形,过境无痕(一次出行免遇袭)。行商世家的孩子从小被教:最好的买卖,是别让劫道的看见汝。',
  },
  {
    id: 'chuanxun_yufu', name: '传讯玉符', kind: 'talisman', grade: 2, price: 100,
    desc: '捏碎即向绑定之人传讯百里。多少修士到死攥着一枚没舍得捏的玉符——舍不得的,不是符。',
  },

  // ═══════════ 材料 ═══════════
  {
    id: 'lingcao', name: '灵草', kind: 'material', grade: 1, price: 8,
    desc: '沾了灵气的草药,炼丹常材。药修入门第一课:认识它,然后认清自己的位置。',
  },
  {
    id: 'qingxin_cao', name: '清心草', kind: 'material', grade: 1, price: 12,
    desc: '生于幽谷,叶上凝霜,可安神,可镇魔。采它的人心不静,是找不到它的。',
  },
  {
    id: 'bainian_lingcao', name: '百年灵草', kind: 'material', grade: 3, price: 150,
    desc: '百年药龄,须根如虬。药铺掌柜见了它,眼睛会先于嘴巴开价。',
  },
  {
    id: 'jinxian_cao', name: '金线草', kind: 'material', grade: 2, price: 25,
    desc: '叶脉金纹,入夜微光。炼制聚气类丹药的主材,坊市里永远缺货。',
  },
  {
    id: 'huolian_zi', name: '火莲子', kind: 'material', grade: 2, price: 30,
    desc: '生于温泉眼的赤莲之实,握在掌心暖如小炉。火行丹药的药引,炸炉事故的头号功臣。',
  },
  {
    id: 'hantan_shi', name: '寒潭石', kind: 'material', grade: 2, price: 35,
    desc: '深潭底百年寒气凝成,盛夏不化。行商拿它北贩,一转手三倍利——若是商队回得来。',
  },
  {
    id: 'jingtie', name: '精铁', kind: 'material', grade: 2, price: 40,
    desc: '百炼去杂的好铁。凡俗铁匠的顶,修仙炼器的底。',
  },
  {
    id: 'xuantie', name: '玄铁', kind: 'material', grade: 3, price: 200, minRealm: 'qi',
    desc: '陨星入地所化,乌沉沉不见光。一小锭,可让一柄凡剑脱胎换骨。',
  },
  {
    id: 'yaodan', name: '妖丹', kind: 'material', grade: 2, price: 50,
    desc: '一阶妖兽的精元所凝,温润微热。妖修一生道行,在人族坊市里明码标价。',
  },
  {
    id: 'yaodan_2', name: '二阶妖丹', kind: 'material', grade: 3, price: 400, minRealm: 'qi',
    desc: '二阶妖兽的命根子。取丹之时妖兽多半还有余息,所以取丹人的价钱里,含着一份抚恤。',
  },
  {
    id: 'yaodan_3', name: '三阶妖丹', kind: 'material', grade: 4, price: 2500, minRealm: 'foundation',
    desc: '入手微沉,内蕴风雷。见过它的散修分两种:发了财的,和没回来的。',
  },
  {
    id: 'zihou_hua', name: '紫猴花', kind: 'material', grade: 3, price: 150, minRealm: 'qi',
    desc: '形如小猴捧月,酿酒极佳。灵猴酒的方子里它排第一味——排第二的是耐心,十年。',
  },
  {
    id: 'qiannian_lingru', name: '千年灵乳', kind: 'material', grade: 4, price: 1500, minRealm: 'foundation',
    desc: '钟乳滴千年,凝而不落者方为灵乳。洞顶一滴,洞下白骨一堆——都是来接这一滴的。',
  },
  {
    id: 'jiuqu_lingshen', name: '九曲灵参', kind: 'material', grade: 4, price: 800, minRealm: 'qi',
    desc: '根须九曲,百年成药,筑基丹的主材。灵参成精前会跑,所以采参人的规矩是:先磕头,后下锄。',
  },
  {
    id: 'longlin_guo', name: '龙鳞果', kind: 'material', grade: 3, price: 300, minRealm: 'qi',
    desc: '果皮如鳞,果肉如冰,生在断崖背阴处。采它的人得先想清楚:果子和命,哪个值钱。',
  },
  {
    id: 'lang_ya', name: '狼牙', kind: 'material', grade: 1, price: 2,
    desc: '铁背狼的獠牙。猎户串起来挂在门口辟邪——狼要是知道,不知作何感想。',
  },
  {
    id: 'she_dan', name: '蛇胆', kind: 'material', grade: 1, price: 5,
    desc: '青纹蛇的苦胆,明目清火。生吞最佳。吞的时候,别想它的出处。',
  },
  {
    id: 'yaoshou_pi', name: '妖兽皮', kind: 'material', grade: 1, price: 8,
    desc: '带灵气的兽皮,鞣制后可做甲、做靴、做钱。荒野之上,一切都能换成活下去的东西。',
  },
  {
    id: 'fu_zhi', name: '符纸', kind: 'material', grade: 1, price: 3,
    desc: '灵桑皮浆抄成,吃得住灵墨。画废十张,方有一张可用——符师的学费,是烧出来的。',
  },

  // ═══════════ 典籍 ═══════════
  {
    id: 'canjuan', name: '残卷', kind: 'manual', grade: 1, price: 20,
    effect: { teachTechnique: 'yinqi_jue' },
    desc: '不知名的残破书卷,细读之下,竟是一篇引气法门。前主人批注潦草,末页只有两个字:「无用」。',
  },
  {
    id: 'jianqi_manual', name: '《剑气术》抄本', kind: 'manual', grade: 2, price: 100,
    effect: { teachArt: 'jianqi_shu' },
    desc: '剑修入门术法的手抄本,字迹凌厉。摸过它的手,大多已经不在了。',
  },
  {
    id: 'huoqiu_manual', name: '《火球术》符卷', kind: 'manual', grade: 2, price: 100,
    effect: { teachArt: 'huoqiu_shu' },
    desc: '火行术法启蒙卷。扉页有前任主人的批注:「先学会灭火。」',
  },
  {
    id: 'tujia_manual', name: '《土甲术》符卷', kind: 'manual', grade: 2, price: 100,
    effect: { teachArt: 'tujia_shu' },
    desc: '守御术法符卷,纸页沉得压手。学它的人不图赢,图「输得慢」——活下来的,都懂这个道理。',
  },
  {
    id: 'qingyuan_yujian', name: '《青元剑诀》玉简', kind: 'manual', grade: 3, price: 0, unique: true,
    effect: { teachTechnique: 'qingyuan_jianjue' },
    desc: '落霞宗真传剑功的传功玉简,非亲传不授。神识探入,有清越剑鸣。',
  },
  {
    id: 'dayan_yujian', name: '《大衍诀》玉简', kind: 'manual', grade: 5, price: 0, unique: true,
    effect: { teachTechnique: 'dayan_jue' },
    desc: '上古传承之物,玉色深青,入手微烫。简上无一字;神识触之,方知浩瀚。',
  },

  // ═══════════ 杂物 · 秘宝 · 信物 ═══════════
  {
    id: 'shenmi_xiaoping', name: '神秘小瓶', kind: 'misc', grade: 5, price: 0, hidden: true, unique: true,
    desc: '拇指大的墨绿小瓶,似玉非玉,似铁非铁,瓶身云纹半隐。月圆之夜自动吸纳月华,凝出一滴翠绿液珠——滴于灵草,一夜百年。此物不可示人。此物,不可示人。',
  },
  {
    id: 'juling_zhenpan', name: '聚灵阵盘', kind: 'misc', grade: 4, price: 0, unique: true,
    effect: { expBuff: { mult: 1.3, turns: 12 } },
    desc: '铺展开来,方圆一丈灵气自聚(此后三年修行 ×1.3)。修仙界的硬道理:钱能买来的时间,都不算贵。',
  },
  {
    id: 'pojin_zhu', name: '破禁珠', kind: 'misc', grade: 4, price: 0, unique: true,
    desc: '灰扑扑一颗圆珠,触禁制则自碎,万法禁绝一瞬。就一瞬——够了,取宝的手要快。',
  },
  {
    id: 'taixuan_canye', name: '《太玄经》残页', kind: 'misc', grade: 5, price: 0, unique: true,
    desc: '一页泛黄古纸,字迹如活物游走,凝视稍久便头痛欲裂。天下修士梦寐以求之物——拥有它的人,大多死于这份「梦寐以求」。',
  },
  {
    id: 'gan_liang', name: '粗粮干饼', kind: 'misc', grade: 1, price: 1,
    effect: { hp: 5 },
    desc: '掺了麸皮的硬饼,能硌掉牙。山里人的一天,从啃它开始。',
  },
  {
    id: 'mai_bing', name: '半块麦饼', kind: 'misc', grade: 1, price: 0, unique: true,
    effect: { hp: 3 },
    desc: '讨来的,舍不得吃完的那半块。有些饿,记一辈子。',
  },
  {
    id: 'jiachuan_canyu', name: '家传残玉', kind: 'misc', grade: 2, price: 0, unique: true,
    desc: '韩家祖上传下的半块玉璧,纹路古拙,来历成谜。月圆之夜,玉心似有一点微光,眨眼即逝。',
  },
  {
    id: 'bankuai_guyu', name: '半块古玉', kind: 'misc', grade: 2, price: 0, unique: true,
    desc: '贴身佩戴,寒冬亦温。断口齐整,像是被人硬生生掰开——另一半在哪里,汝从记事起就在想。',
  },
  {
    id: 'wumu_suanpan', name: '乌木算盘', kind: 'misc', grade: 1, price: 0, unique: true,
    desc: '父亲用旧的算盘,珠子油亮。第七颗珠子有夹层,汝一直没能打开。',
  },
  {
    id: 'zayi_yaopai', name: '杂役腰牌', kind: 'misc', grade: 1, price: 0, unique: true,
    desc: '落霞宗杂役的木牌,编号三百六十一。磨得发亮的不是牌子,是三年。',
  },
  {
    id: 'zufu_cance', name: '祖父残册', kind: 'misc', grade: 2, price: 0, unique: true,
    desc: '无名残册,记吐纳导引之法,页边有祖父小楷批注。末页缺角,批注断在半句:「太玄者,非经也,乃——」',
  },
  {
    id: 'linghou_jiu', name: '灵猴酒', kind: 'misc', grade: 3, price: 200,
    effect: { hp: 30 },
    desc: '紫猴花酿的灵酒,启封十里香。修仙人送礼的头一份体面——收礼的人嘴上推辞,手很诚实。',
  },
  {
    id: 'canju_qipu', name: '残局棋谱', kind: 'misc', grade: 2, price: 50,
    desc: '一册古棋残局,第七十二局无解。有人说破解者能悟大道;也有人说,执意破它的人,都疯了。',
  },
  {
    id: 'nuanyu_zan', name: '暖玉簪', kind: 'misc', grade: 3, price: 300,
    desc: '羊脂暖玉雕成的素簪,不镶金,不缀珠。送它的人想说的话,都在这份素净里。',
  },
];

/** id 归一化:去除分隔符、统一小写 — 兼容 dundi_fu/dundifu、juQiDan/juqi_dan 等 */
function norm(id: string): string {
  return id.replace(/[_\-\s]/g, '').toLowerCase();
}

const ITEM_INDEX = new Map(ITEMS.map((i) => [norm(i.id), i]));

const UNKNOWN_ITEM: ItemData = {
  id: 'unknown', name: '无名之物', kind: 'misc', grade: 1, price: 0,
  desc: '来历不明之物。天道亦无记载。',
};

/** 按 id 取物(归一化匹配;查无此物时返回占位,免于崩坏) */
export function getItem(id: string): ItemData {
  return ITEM_INDEX.get(norm(id)) ?? UNKNOWN_ITEM;
}

/** 按名称或 id 找物(玩家输入用) */
export function findItemByName(nameOrId: string): ItemData | undefined {
  const needle = nameOrId.trim();
  if (!needle) return undefined;
  return (
    ITEMS.find((i) => i.name === needle) ??
    ITEM_INDEX.get(norm(needle)) ??
    ITEMS.find((i) => i.name.includes(needle))
  );
}

/** 玩家输入解析别名 */
export const resolveItem = findItemByName;

/** 引擎契约:按字面 id 直取(attributes.ts 装备加成查表用) */
export const ITEM_BY_ID: Record<string, ItemData> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

/** 典籍 → 所授功法(旧引用兼容) */
export const MANUAL_TECHNIQUE: Record<string, string> = Object.fromEntries(
  ITEMS.filter((i) => i.kind === 'manual' && i.effect?.teachTechnique)
    .map((i) => [i.id, i.effect!.teachTechnique!]),
);

// 旧引用兼容:部分引擎模块自 '@/data/items' 引入敌手与伤势表
export { getEnemy, ENEMIES } from './enemies';
export { INJURY_DEFS } from './injuries';
