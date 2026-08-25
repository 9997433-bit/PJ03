// ============================================================================
// npcs.ts — 十二位有名之人
// 好感 −100…100;越过门槛,恩怨自见分晓。
// 门槛为双方言超集:{flagKey, effect}(类型契约)与 {unlockFlag, narrative}
// (engine/npc.ts 按字面读取)并存,值相同。既有六人之 id 与 flagKey 不可改。
// favoriteGifts 为投其所好之物(canonical item id);赠礼好感 = 品阶×5,
// 引擎他日可按 favoriteGifts 翻倍——数据先行备好。
// ============================================================================

import type { EventEffect, Npc, NpcThreshold } from '@/engine/types';

/** 数据侧门槛 — 引擎两种读取方言的超集 */
export interface NpcThresholdData extends NpcThreshold {
  /** engine/npc.ts 按此键记一次性解锁 */
  unlockFlag: string;
  /** engine/npc.ts 越槛时直接播报此句 */
  narrative: string;
  effect?: EventEffect;
}

/** 数据侧人物 — 引擎 Npc 的超集(性情、所图、喜恶为扩展字段) */
export interface NpcData extends Npc {
  thresholds: NpcThresholdData[];
  /** 性情(一句话) */
  persona: string;
  /** 所图(此人真正想要什么) */
  motive: string;
  /** 投其所好(canonical item id) */
  favoriteGifts: string[];
  /** 赠礼提示(江湖传闻口吻) */
  giftHint: string;
}

export const INITIAL_NPCS: Record<string, NpcData> = {
  qianZhangGui: {
    id: 'qianZhangGui',
    name: '钱掌柜',
    identity: '坊市万宝阁掌柜,笑面藏刀,童叟“基本”无欺。',
    persona: '见人三分笑,袖里一杆秤。和气生财是真信条,落井下石也是真手艺。',
    motive: '想把万宝阁开成十里八乡头一号。缺的不是本钱,是消息和人脉。',
    favoriteGifts: ['linghou_jiu', 'hantan_shi', 'zihou_hua'],
    giftHint: '掌柜的好酒,更好稀罕货——能转手三倍利的那种。',
    favor: 0,
    desc: '柜台后一站二十年,眼睛就是秤。',
    thresholds: [
      {
        at: 20,
        unlock: '坊市九折优待',
        flagKey: 'npc_qian_20',
        unlockFlag: 'npc_qian_20',
        narrative: '钱掌柜拍着胸脯:“自家人,往后一律九折!”',
        effect: { narrative: '钱掌柜拍着胸脯:“自家人,往后一律九折!”', flag: ['marketDiscount', true] },
      },
      {
        at: 60,
        unlock: '压箱底的好东西',
        flagKey: 'npc_qian_60',
        unlockFlag: 'npc_qian_60',
        narrative: '钱掌柜引汝入内堂,取出一枚蒙尘的玉佩:“有缘者得之。”',
        effect: { narrative: '钱掌柜引汝入内堂,取出一枚蒙尘的玉佩:“有缘者得之。”', items: [{ itemId: 'hushen_yupei', count: 1 }] },
      },
    ],
  },
  chenShiXiong: {
    id: 'chenShiXiong',
    name: '陈师兄',
    identity: '同门师兄,炼气十层,刀子嘴豆腐心。',
    persona: '嘴上从不饶人,手上从不坑人。骂汝最凶的是他,替汝挡刀的也是他。',
    motive: '卡在炼气十层五年了。嘴上说看开了,夜里还在偷偷打坐。',
    favoriteGifts: ['juqi_dan', 'huanglong_dan', 'pozhang_dan'],
    giftHint: '他缺什么,同门都知道——一粒能破瓶颈的丹。',
    favor: 0,
    desc: '外门弟子里资格最老的一个。',
    thresholds: [
      {
        at: 30,
        unlock: '倾囊相授《剑气术》',
        flagKey: 'npc_chen_30',
        unlockFlag: 'npc_chen_30',
        narrative: '陈师兄把汝拽到后山:“看好了,就教这一遍。”',
        effect: { narrative: '陈师兄把汝拽到后山:“看好了,就教这一遍。”', teachArt: 'jianqi_shu' },
      },
      {
        at: 70,
        unlock: '生死之交',
        flagKey: 'npc_chen_70',
        unlockFlag: 'npc_chen_70',
        narrative: '陈师兄塞来一株百年灵草:“拿着。跟我客气就是看不起我。”',
        effect: { narrative: '陈师兄塞来一株百年灵草:“拿着。跟我客气就是看不起我。”', items: [{ itemId: 'bainian_lingcao', count: 1 }] },
      },
    ],
  },
  qingPaoLaoZhe: {
    id: 'qingPaoLaoZhe',
    name: '青袍老者',
    identity: '来历成谜的老修士,常在山道旁下棋,棋盘对面无人。',
    persona: '不问来处,不言去处。落子极慢,看人极快。',
    motive: '在等一个人,或者说,在等一步棋。等了多少年,他自己也不数了。',
    favoriteGifts: ['canju_qipu', 'linghou_jiu', 'wudao_cha'],
    giftHint: '棋痴。一册残谱,胜过千枚灵石。',
    favor: 0,
    desc: '有人说见过他御剑,剑光是青的,像一声叹息。',
    thresholds: [
      {
        at: 40,
        unlock: '授《大衍诀》',
        flagKey: 'npc_qing_40',
        unlockFlag: 'npc_qing_40',
        narrative: '老者落下一子,头也不抬:“老夫这局棋,你替我记着。”一卷心法凭空印入汝识海。',
        effect: { narrative: '老者落下一子,头也不抬:“老夫这局棋,你替我记着。”一卷心法凭空印入汝识海。', teachTechnique: 'dayan_jue' },
      },
      {
        at: 70,
        unlock: '千年灵乳',
        flagKey: 'npc_qing_70',
        unlockFlag: 'npc_qing_70',
        narrative: '“棋逢对手,当浮一大白。”老者抛来一只玉瓶,内盛千年灵乳。',
        effect: { narrative: '“棋逢对手,当浮一大白。”老者抛来一只玉瓶,内盛千年灵乳。', items: [{ itemId: 'qiannian_lingru', count: 1 }] },
      },
    ],
  },
  yanZhangLao: {
    id: 'yanZhangLao',
    name: '严长老',
    identity: '宗门执法长老,面冷如霜,赏罚分明。',
    persona: '规矩比天大。不徇私,不记仇,也不记好——但记功。',
    motive: '看着宗门一年不如一年,嘴上不说。他在找一个撑得起下一代的人。',
    favoriteGifts: ['yaodan_2', 'xuantie', 'jinren_fu'],
    giftHint: '送礼免谈。但为宗门添一份战备,他会记在功簿上。',
    favor: 0,
    desc: '执法堂三十年,签下的罚单能糊满一面墙。',
    thresholds: [
      {
        at: 25,
        unlock: '宗门庇护',
        flagKey: 'npc_yan_25',
        unlockFlag: 'npc_yan_25',
        narrative: '严长老颔首:“宗门之内,无人可欺你。”',
        effect: { narrative: '严长老颔首:“宗门之内,无人可欺你。”', flag: ['sectBacking', true] },
      },
      {
        at: 60,
        unlock: '赐法衣',
        flagKey: 'npc_yan_60',
        unlockFlag: 'npc_yan_60',
        narrative: '“护道之物,拿去。”一袭玄龟法衣掷至汝怀中。',
        effect: { narrative: '“护道之物,拿去。”一袭玄龟法衣掷至汝怀中。', items: [{ itemId: 'fayi_xuangui', count: 1 }] },
      },
    ],
  },
  luoSha: {
    id: 'luoSha',
    name: '罗刹',
    identity: '魔道散修,睚眦必报。与之结怨,夜路当心。',
    persona: '笑着杀人,杀完还笑。唯一的规矩是有仇必报,唯一的软肋无人知晓。',
    motive: '筑基中期卡了十年,急需突破的资粮——别人的资粮。',
    favoriteGifts: ['moya_lingfan', 'yaodan_2', 'ningshen_dan'],
    giftHint: '给魔修送礼?送得对,是护身符;送得不对,是催命符。',
    favor: 0,
    desc: '红衣胜血。见过这身红的人,大多没能开口描述它。',
    thresholds: [
      {
        at: -50,
        unlock: '血仇已结',
        flagKey: 'npc_luosha_n50',
        unlockFlag: 'npc_luosha_n50',
        narrative: '有人捎来一片染血的黑巾。罗刹的规矩:此物既至,追杀不休。',
        effect: { narrative: '有人捎来一片染血的黑巾。罗刹的规矩:此物既至,追杀不休。', flag: ['feud', true] },
      },
      {
        at: 40,
        unlock: '魔道的人情',
        flagKey: 'npc_luosha_40',
        unlockFlag: 'npc_luosha_40',
        narrative: '罗刹抛来一枚玉简,笑意难辨:“血遁之术,拿去。别谢我——魔道的人情,是要还的。”',
        effect: { narrative: '罗刹抛来一枚玉简,笑意难辨:“血遁之术,拿去。别谢我——魔道的人情,是要还的。”', teachArt: 'xuedun_shu' },
      },
    ],
  },
  aYao: {
    id: 'aYao',
    name: '阿瑶',
    identity: '青梅故人,仍在山下故里,守着一间药圃。',
    persona: '话不多,记性好。汝爱吃什么、怕疼不怕疼,她都记得。',
    motive: '不求汝回头,只求每年知道汝还活着。药圃留着一垄,是给这个念想浇水。',
    favoriteGifts: ['nuanyu_zan', 'qingxin_cao', 'lingcao'],
    giftHint: '金山银山不如一支素簪。她要的从来不是贵重。',
    favor: 0,
    desc: '村口老槐树下,她站成了半棵树。',
    thresholds: [
      {
        at: 30,
        unlock: '家乡的静心丸',
        flagKey: 'npc_ayao_30',
        unlockFlag: 'npc_ayao_30',
        narrative: '阿瑶托行商捎来一只布包,内有静心丸一枚,针脚细密。',
        effect: { narrative: '阿瑶托行商捎来一只布包,内有静心丸一枚,针脚细密。', items: [{ itemId: 'jingxin_wan', count: 1 }] },
      },
      {
        at: 70,
        unlock: '尘缘一诺',
        flagKey: 'npc_ayao_70',
        unlockFlag: 'npc_ayao_70',
        narrative: '“修仙的人,也会老么?”她只问了这一句。汝无言,心性却在此问中沉淀如渊。',
        effect: { narrative: '“修仙的人,也会老么?”她只问了这一句。汝无言,心性却在此问中沉淀如渊。', attribute: ['xinXing', 1] },
      },
    ],
  },

  // ═══════════ 新增六人 ═══════════
  moXuZi: {
    id: 'moXuZi',
    name: '墨虚子',
    identity: '坊市丹房的老师傅,一手丹术,半生炸炉。',
    persona: '暴脾气,好为人师。骂徒弟的嗓门整条街都听得见,教真东西时声音却压得极低。',
    motive: '此生大愿是炼成一炉九曲灵参丹。差的不是手艺,是一味主药和一个传人。',
    favoriteGifts: ['jiuqu_lingshen', 'bainian_lingcao', 'huolian_zi'],
    giftHint: '别送成丹——那是打他的脸。送药材,越稀罕越好。',
    favor: 0,
    desc: '右手三根指头是烧伤后重接的。他说这叫学费。',
    thresholds: [
      {
        at: 30,
        unlock: '丹房听用',
        flagKey: 'npc_moxu_30',
        unlockFlag: 'npc_moxu_30',
        narrative: '墨虚子把炉门钥匙拍在汝掌心:“炉子随便用,炸了算你的。”自此炼丹如有名师在侧。',
        effect: { narrative: '墨虚子把炉门钥匙拍在汝掌心:“炉子随便用,炸了算你的。”自此炼丹如有名师在侧。', flag: ['alchemyMentor', true] },
      },
      {
        at: 65,
        unlock: '衣钵之传',
        flagKey: 'npc_moxu_65',
        unlockFlag: 'npc_moxu_65',
        narrative: '老头子把一枚破障丹塞进汝手里,别过脸去:“我那些不成器的方子,你都拿去。莫要辱没。”',
        effect: { narrative: '老头子把一枚破障丹塞进汝手里,别过脸去:“我那些不成器的方子,你都拿去。莫要辱没。”', items: [{ itemId: 'pozhang_dan', count: 1 }] },
      },
    ],
  },
  liuRuYan: {
    id: 'liuRuYan',
    name: '柳如烟',
    identity: '魔道女修,亦正亦邪,行踪不定。',
    persona: '言笑晏晏,真话假话三七开——哪三哪七,看她心情。',
    motive: '被正道通缉,被魔道追债。她要的很简单:一个两边都够不着她的地方。',
    favoriteGifts: ['yinni_fu', 'nuanyu_zan', 'linghou_jiu'],
    giftHint: '送她能藏身保命的物件,比送金山更得欢心。',
    favor: 0,
    desc: '青衫如烟。她出现的地方,总跟着两拨追兵和三个谎言。',
    thresholds: [
      {
        at: 35,
        unlock: '魔道的门路',
        flagKey: 'npc_liu_35',
        unlockFlag: 'npc_liu_35',
        narrative: '柳如烟以指尖蘸酒,在桌上画了一张只存在片刻的地图:“黑市的门,朝这边开。”',
        effect: { narrative: '柳如烟以指尖蘸酒,在桌上画了一张只存在片刻的地图:“黑市的门,朝这边开。”', flag: ['blackMarket', true] },
      },
      {
        at: 70,
        unlock: '烟消之诺',
        flagKey: 'npc_liu_70',
        unlockFlag: 'npc_liu_70',
        narrative: '“若有一日我不辞而别,”她难得正色,“这个替我收着。”——枚传讯玉符,和半句没说完的话。',
        effect: { narrative: '“若有一日我不辞而别,”她难得正色,“这个替我收着。”——枚传讯玉符,和半句没说完的话。', items: [{ itemId: 'chuanxun_yufu', count: 1 }] },
      },
    ],
  },
  zhouGuanShi: {
    id: 'zhouGuanShi',
    name: '周管事',
    identity: '周氏商行在坊市的管事。周家夺了韩家灵田,他是当年的经手人。',
    persona: '皮笑肉不笑,账算得比谁都清。欺软怕硬四个字,他活成了教科书。',
    motive: '往上爬。周家家主之位轮不到他,但坊市这一亩三分地,他要攥死。',
    favoriteGifts: ['hantan_shi', 'jingtie', 'linghou_jiu'],
    giftHint: '他只认利。送礼就是递投名状——收了,他便认你是“自己人”。',
    favor: 0,
    desc: '算盘珠子拨得山响,拨走的都是别人家的家底。',
    thresholds: [
      {
        at: -30,
        unlock: '周氏的打压',
        flagKey: 'npc_zhou_n30',
        unlockFlag: 'npc_zhou_n30',
        narrative: '坊市里几家相熟的铺子忽然对汝闭门谢客。周管事在柜台后拨着算盘,眼皮都不抬。',
        effect: { narrative: '坊市里几家相熟的铺子忽然对汝闭门谢客。周管事在柜台后拨着算盘,眼皮都不抬。', flag: ['zhouSuppression', true] },
      },
      {
        at: 40,
        unlock: '旧账的另一本',
        flagKey: 'npc_zhou_40',
        unlockFlag: 'npc_zhou_40',
        narrative: '酒过三巡,周管事压低声音:“当年韩家的事……账,其实有两本。”他推过来一页誊抄的旧纸。',
        effect: { narrative: '酒过三巡,周管事压低声音:“当年韩家的事……账,其实有两本。”他推过来一页誊抄的旧纸。', flag: ['zhouLedger', true] },
      },
    ],
  },
  baiYaoWeng: {
    id: 'baiYaoWeng',
    name: '百药翁',
    identity: '百药园园主,药修一脉硕果仅存的老人。',
    persona: '待草木比待人亲。谁糟蹋药材,他记谁一辈子;谁怜惜草木,他也记一辈子。',
    motive: '百药园后继无人。他不求弟子天资,只求一双惜药的手。',
    favoriteGifts: ['lingcao', 'qingxin_cao', 'zihou_hua'],
    giftHint: '一株亲手采的灵草,胜过十枚灵石——他看的是采药的手法。',
    favor: 0,
    desc: '据说他能听懂草木言语。也可能只是老糊涂了——药修都这样。',
    thresholds: [
      {
        at: 30,
        unlock: '药园采撷之许',
        flagKey: 'npc_baiyao_30',
        unlockFlag: 'npc_baiyao_30',
        narrative: '百药翁把一柄小药锄递给汝:“后山那片,你自便。记住,采七留三。”',
        effect: { narrative: '百药翁把一柄小药锄递给汝:“后山那片,你自便。记住,采七留三。”', items: [{ itemId: 'bainian_lingcao', count: 1 }] },
      },
      {
        at: 70,
        unlock: '木灵一脉真传',
        flagKey: 'npc_baiyao_70',
        unlockFlag: 'npc_baiyao_70',
        narrative: '老人将一卷以百年药藤为轴的功法放在汝手中:“木灵一脉,今日起有传了。”',
        effect: { narrative: '老人将一卷以百年药藤为轴的功法放在汝手中:“木灵一脉,今日起有传了。”', teachTechnique: 'muling_changsheng' },
      },
    ],
  },
  xuBanXian: {
    id: 'xuBanXian',
    name: '徐半仙',
    identity: '游方相士,卦摊支在坊市口,十卦九不准。',
    persona: '油嘴滑舌,插科打诨。可他偶尔正经起来说的那半句话,回头想想,句句应验。',
    motive: '没人知道一个能窥天机的人为什么摆摊糊口。他说:躲债。躲谁的债,不讲。',
    favoriteGifts: ['linghou_jiu', 'gan_liang', 'canju_qipu'],
    giftHint: '一壶酒就能换他半日胡话——胡话里偶有真机。',
    favor: 0,
    desc: '卦幡上书:半仙,算半卦,收半价,准一半。',
    thresholds: [
      {
        at: 20,
        unlock: '半句天机',
        flagKey: 'npc_xu_20',
        unlockFlag: 'npc_xu_20',
        narrative: '徐半仙忽然收了嬉笑,飞快说了半句:“逢青则起,遇血则避。”随即又哈哈起来,死活不肯说下半句。',
        effect: { narrative: '徐半仙忽然收了嬉笑,飞快说了半句:“逢青则起,遇血则避。”随即又哈哈起来,死活不肯说下半句。', flag: ['destinyHint', true] },
      },
      {
        at: 60,
        unlock: '逆天改命一卦',
        flagKey: 'npc_xu_60',
        unlockFlag: 'npc_xu_60',
        narrative: '“这一卦,折我十年寿。”徐半仙起了真卦,面色发白,“你命里那道坎,我替你挪了三寸。够你活了。”',
        effect: { narrative: '“这一卦,折我十年寿。”徐半仙起了真卦,面色发白,“你命里那道坎,我替你挪了三寸。够你活了。”', attribute: ['qiYun', 1] },
      },
    ],
  },
  yunGuanShi: {
    id: 'yunGuanShi',
    name: '云管事',
    identity: '云氏仙族的外务管事,广纳客卿,来者不拒——有用的那种。',
    persona: '滴水不漏的场面人。夸汝的话能说一刻钟,不带一个重样的字,也不带一个真心的字。',
    motive: '云氏与周氏暗斗多年。他在四处收拢可用之人,当刀,或当磨刀石。',
    favoriteGifts: ['xuantie', 'yaodan_2', 'longlin_guo'],
    giftHint: '云氏什么都不缺,缺的是“心意”——够分量的那种心意。',
    favor: 0,
    desc: '见人说人话,见鬼说鬼话,见修士说道友。',
    thresholds: [
      {
        at: 30,
        unlock: '客卿供奉',
        flagKey: 'npc_yun_30',
        unlockFlag: 'npc_yun_30',
        narrative: '云管事奉上一只锦盒:“区区束脩,不成敬意。云氏的门,随时为道友开着。”',
        effect: { narrative: '云管事奉上一只锦盒:“区区束脩,不成敬意。云氏的门,随时为道友开着。”', spiritStones: 100, flag: ['yunPatron', true] },
      },
      {
        at: 65,
        unlock: '云氏秘藏',
        flagKey: 'npc_yun_65',
        unlockFlag: 'npc_yun_65',
        narrative: '“族库里的东西,家主说了,道友可挑一件。”汝挑中的那件,云管事的笑容僵了一瞬。',
        effect: { narrative: '“族库里的东西,家主说了,道友可挑一件。”汝挑中的那件,云管事的笑容僵了一瞬。', items: [{ itemId: 'ningshen_dan', count: 1 }] },
      },
    ],
  },
};

export function getNpcName(id: string): string {
  return INITIAL_NPCS[id]?.name ?? id;
}

export function getNpcDef(idOrName: string): NpcData | undefined {
  const needle = idOrName.trim();
  return INITIAL_NPCS[needle] ?? Object.values(INITIAL_NPCS).find((n) => n.name === needle);
}
