// ============================================================================
// quests.ts — 主线三章(三择一节点)+ 支线十则
// 主线以 chapter 逐章推进;支线以 objective 自动查验(killEnemy 以
// kills_<enemyId> 旗标计数,obtainItem 交付时收走货物)。
// 既有 id(main1-3 / sideWolves / sideHerbs / sideFoundation / sideAYao)
// 为引擎契约,不可改。物品与敌手引用一律 canonical id。
// ============================================================================

import type { Quest } from '@/engine/types';

export const INITIAL_QUESTS: Quest[] = [
  // ---------------- 主线 ----------------
  {
    id: 'main1',
    kind: 'main',
    chapter: 1,
    title: '第一章·凡尘出岫',
    narrative:
      '灵根既显,凡尘便留不住汝了。青牛镇外三条路:仙门张榜纳新,散修来去自由,没落的云氏仙族亦在招揽外姓。何去何从,一念定之。',
    choices: [
      {
        text: '拜入仙门,循规蹈矩',
        effect: {
          narrative: '汝叩首三次,入外门弟子籍。晨钟暮鼓,自此有了归处,也有了枷锁。',
          flag: ['joinedSect', true],
          favor: ['yanZhangLao', 15],
        },
      },
      {
        text: '独行散修,天地为庐',
        effect: {
          narrative: '汝背起行囊,头也不回。散修命贱,却自由——代价与馈赠,皆记在天道账上。',
          flag: ['loner', true],
          spiritStones: 30,
        },
      },
      {
        text: '投效云氏仙族',
        effect: {
          narrative: '云管事上下打量汝半晌,掷来两包聚气散:“做客卿,先从跑腿做起。”',
          flag: ['clanPatron', true],
          items: [{ itemId: 'juqi_san', count: 2 }],
          favor: ['yunGuanShi', 10],
        },
      },
    ],
    reward: { narrative: '第一章·终。', exp: 20 },
    status: 'active',
  },
  {
    id: 'main2',
    kind: 'main',
    chapter: 2,
    title: '第二章·筑基之争',
    narrative:
      '坊市传开消息:万宝阁将拍卖一枚筑基丹。炼气圆满者闻风而动,暗流涌起。有人备灵石,有人备刀。汝亦到了需要此丹的时候。',
    unlockAfter: 'main1',
    minRealm: 'qi',
    choices: [
      {
        text: '黑吃黑——劫下暗中抢丹的魔修',
        effect: {
          narrative: '雨夜,汝截住得手的魔修,一场恶斗夺回丹瓶。梁子,也就此结下了。',
          items: [{ itemId: 'zhuji_dan', count: 1 }],
          favor: ['luoSha', -60],
        },
      },
      {
        text: '散尽家财,正价竞拍',
        effect: {
          narrative: '槌落三声,丹归汝手。袋中灵石去了大半,倒也睡得安稳。',
          spiritStones: -300,
          items: [{ itemId: 'zhuji_dan', count: 1 }],
          favor: ['qianZhangGui', 10],
        },
      },
      {
        text: '让与更需要之人',
        effect: {
          narrative: '同门师兄寿元将近,只差此丹一线。汝退出了竞拍。他重重叩首:“此恩,来世也记得。”',
          favor: ['chenShiXiong', 40],
          exp: 100,
          flag: ['karma', true],
        },
      },
    ],
    reward: { narrative: '第二章·终。', exp: 50 },
    status: 'locked',
  },
  {
    id: 'main3',
    kind: 'main',
    chapter: 3,
    title: '第三章·结丹因果',
    narrative:
      '筑基已成,丹关在望。凝丹需三阶妖丹为引,而万妖山深处,妖丹与杀机同在。亦有旁门捷径,亦有笨功夫。因果如何结,汝自选之。',
    unlockAfter: 'main2',
    minRealm: 'foundation',
    choices: [
      {
        text: '独闯万妖山,亲手猎取',
        effect: {
          narrative: '汝入山七日,寻至三尾妖狐的月泉巢穴。它先开的口,汝先出的手。',
          combat: 'sanwei_yaohu',
          flag: ['huntAlone', true],
        },
      },
      {
        text: '与青袍老者联手,共分其利',
        effect: {
          narrative: '老者收起棋盘:“同去同去。”有他坐镇,妖山如逛后园。妖丹到手,人情记下。',
          items: [{ itemId: 'yaodan_3', count: 1 }],
          favor: ['qingPaoLaoZhe', 25],
          spiritStones: -100,
        },
      },
      {
        text: '闭关苦修,以水磨功夫蓄势',
        effect: {
          narrative: '汝封了洞府,一坐三年。出关之日,鬓角霜色又深一分,道行亦深一分。',
          exp: 800,
          flag: ['ascetic', true],
        },
      },
    ],
    reward: { narrative: '第三章·终。主线因果,至此圆满。', exp: 200, flag: ['mainArcDone', true] },
    status: 'locked',
  },

  // ---------------- 支线 ----------------
  {
    id: 'sideWolves',
    kind: 'side',
    title: '除狼患',
    narrative: '青牛镇外青目妖狼伤人,里正悬赏:除去妖狼者,谢灵石五十。',
    objective: { type: 'killEnemy', target: 'qingmu_yaolang', n: 1, desc: '猎杀青目妖狼 ×1' },
    reward: { narrative: '里正奉上赏金,满镇燃了炮仗。', spiritStones: 50, favor: ['qianZhangGui', 10] },
    status: 'active',
  },
  {
    id: 'sideHerbs',
    kind: 'side',
    title: '采药五株',
    narrative: '万宝阁常年收灵草。凑足五株,可换一笔外快。(收集齐后自动交付)',
    objective: { type: 'obtainItem', target: 'lingcao', n: 5, desc: '持有灵草 ×5' },
    reward: { narrative: '钱掌柜验货点头,银货两讫。', spiritStones: 30 },
    status: 'active',
  },
  {
    id: 'sideFoundation',
    kind: 'side',
    title: '问鼎筑基',
    narrative: '筑基,是仙凡真正的分界。踏过去,方有资格谈“道”之一字。',
    objective: { type: 'reachRealm', target: 'foundation', desc: '突破至筑基期' },
    reward: { narrative: '仙凡两分,自此不同。万宝阁送来贺礼一份——一只崭新的储物袋。', items: [{ itemId: 'chuwu_dai', count: 1 }], exp: 50 },
    status: 'active',
  },
  {
    id: 'sideAYao',
    kind: 'side',
    title: '故人之思',
    narrative: '阿瑶的药圃,一直给汝留着一垄。常回去看看。',
    objective: { type: 'favor', target: 'aYao', n: 30, desc: '阿瑶好感达到 30' },
    reward: { narrative: '槐花落了满肩。有些东西,修仙也修不掉。', exp: 60 },
    status: 'active',
  },
  {
    id: 'sideMistCaravan',
    kind: 'side',
    title: '雾泽沉铃',
    narrative: '两年前一支商队消失在迷雾泽,至今雾里夜夜有骡铃声。斩了泽中作祟的水鬼,给死者一个安息,给生者一个交代。',
    objective: { type: 'killEnemy', target: 'shuigui', n: 1, desc: '斩杀泽中水鬼 ×1' },
    reward: {
      narrative: '水鬼既灭,雾散三日。泽心露出商队残骸——人已不可寻,遗物尚可归乡。铃声,再也没有响过。',
      spiritStones: 80,
      exp: 60,
      flag: ['caravanTruth', true],
    },
    status: 'active',
  },
  {
    id: 'sideZhouFeud',
    kind: 'side',
    title: '讨个公道',
    narrative: '周氏的打手仗势欺人,坊市周边小户敢怒不敢言。有人凑了份子钱,只求一位修士出头。',
    objective: { type: 'killEnemy', target: 'zhoushi_dashi', n: 1, desc: '教训周氏打手 ×1' },
    reward: { narrative: '打手抱头鼠窜,份子钱如数奉上。周家的脸面,今日折了一角。', spiritStones: 40, exp: 40, favor: ['zhouGuanShi', -15] },
    status: 'active',
  },
  {
    id: 'sideAlchemyEntry',
    kind: 'side',
    title: '丹道初窥',
    narrative: '墨虚子放话:能拿出三份回气散的,不论出身,丹房收作记名学徒。丹是买是炼,他不问——反正他闻得出来。',
    objective: { type: 'obtainItem', target: 'huiqi_san', n: 3, desc: '持有回气散 ×3' },
    reward: { narrative: '墨虚子捏碎一粒,凑鼻一闻,哼了一声:“凑合。明日辰时,来剥药皮。”', spiritStones: 20, exp: 30, favor: ['moXuZi', 15] },
    status: 'active',
  },
  {
    id: 'sideBeastCores',
    kind: 'side',
    title: '妖丹十枚',
    narrative: '万宝阁挂出高价收单:一阶妖丹十枚,重酬。落款处按着一个不肯露面的买主的指印。(收集齐后自动交付)',
    objective: { type: 'obtainItem', target: 'yaodan', n: 10, desc: '持有妖丹 ×10' },
    reward: { narrative: '货银两讫。掌柜多给了一成:“买主吩咐的,说与道友有缘。”', spiritStones: 100, items: [{ itemId: 'xisui_dan', count: 1 }] },
    status: 'active',
  },
  {
    id: 'sideDemonSlayer',
    kind: 'side',
    title: '除魔卫道',
    narrative: '近年魔修屡屡越界,掳人炼药。执法堂张榜:诛魔修两名者,记大功一件。',
    objective: { type: 'killEnemy', target: 'modao_xiu', n: 2, desc: '诛杀魔道修士 ×2' },
    reward: { narrative: '严长老在功簿上落下汝的名字,笔画极重。“宗门记得。”', items: [{ itemId: 'hushen_fu', count: 2 }], exp: 100, favor: ['yanZhangLao', 20] },
    status: 'active',
  },
  {
    id: 'sideOldChess',
    kind: 'side',
    title: '棋逢对手',
    narrative: '山道旁的青袍老者,棋盘对面永远空着。坐上去陪他下几局——输赢不论,论心。',
    objective: { type: 'favor', target: 'qingPaoLaoZhe', n: 40, desc: '青袍老者好感达到 40' },
    reward: { narrative: '老者收拾棋枰,忽道:“这些年,谢了。”汝这才发现,棋盘对面那侧的石凳,早被人坐得温润发亮。', exp: 120 },
    status: 'active',
  },
  {
    id: 'sideGoldenCore',
    kind: 'side',
    title: '金丹之约',
    narrative: '修行路上有个说法:结成金丹,方算真正在仙道上留了名字。汝的名字,天道等着记。',
    objective: { type: 'reachRealm', target: 'core', desc: '突破至金丹期' },
    reward: { narrative: '丹成之日,百里灵气朝汝一涌。山下的凡人只当是起了大风,多收了三成麦。', items: [{ itemId: 'ningshen_dan', count: 1 }], exp: 300 },
    status: 'active',
  },
];

export function getQuestDef(id: string): Quest | undefined {
  return INITIAL_QUESTS.find((q) => q.id === id);
}
