/**
 * 任务 — main story (3-choice nodes) + side quests.
 * (STUB — content agent expands to 3 chapters; keep ids and semantics.)
 */
import type { Quest } from '@/engine/types';

export const QUESTS: Quest[] = [
  {
    id: 'main_ch1',
    kind: 'main',
    chapter: 1,
    title: '第一章 · 凡尘辞别',
    narrative:
      '灵根既显,凡尘便再留不住汝。青石镇的雨下了三日,汝立于檐下,前路有三:黄枫谷招收外门弟子;亦可孤身入山,做个散修;或者,投靠城中那户沈姓修仙家族,寄人篱下,换一份庇护。',
    choices: [
      {
        text: '拜入黄枫谷',
        effect: {
          narrative: '汝随执事登上飞舟。回望时,青石镇已缩成雨雾里的一粒墨点。自此,汝有了师门。',
          flag: ['sect_huangfeng', true],
          favor: ['wang_shixiong', 10],
        },
      },
      {
        text: '孤身入山,自在散修',
        effect: {
          narrative: '无门无派,无拘无束——也无人庇护。汝背起行囊,一头扎进茫茫群山。天高地阔,生死自负。',
          flag: ['loner', true],
          spiritStones: 30,
        },
      },
      {
        text: '投效沈氏家族',
        effect: {
          narrative: '沈家管事上下打量汝一番,丢来一枚客卿玉牌。"按月点卯,莫惹是非。"寄人篱下,亦是屋檐。',
          flag: ['clan_shen', true],
          items: [{ itemId: 'juqi_dan', count: 2 }],
        },
      },
    ],
    reward: { narrative: '' },
    status: 'active',
  },
  {
    id: 'main_ch2',
    kind: 'main',
    chapter: 2,
    title: '第二章 · 筑基之争',
    narrative:
      '筑基丹出世的消息像野火一样烧遍了方圆千里。拍卖、赌斗、截杀——所有炼气巅峰的修士都红了眼。汝的机会,也在其中。',
    choices: [
      {
        text: '倾尽家财,坊市竞买',
        effect: { narrative: '灵石如流水般泼出去。落槌那一刻,汝掌心全是汗。', spiritStones: -200, items: [{ itemId: 'zhuji_dan', count: 1 }] },
      },
      {
        text: '入黑风林,猎妖换丹',
        effect: { narrative: '以命换丹,是散修的老路。汝磨利了剑。', flag: ['hunting_for_dan', true] },
      },
      {
        text: '静观其变,守心不动',
        effect: { narrative: '众人逐丹如鹜,汝独闭门课功。丹可遇而不可求,道基却在自己手里。', exp: 120 },
      },
    ],
    reward: { narrative: '' },
    status: 'locked',
  },
  {
    id: 'side_lingcao',
    kind: 'side',
    title: '药铺所托',
    narrative: '镇上药铺急需灵草入药,愿以灵石相酬。(集齐五株灵草)',
    objective: { type: 'obtainItem', target: 'lingcao', n: 5 },
    reward: { narrative: '药铺老板数出灵石,连声道谢。', spiritStones: 50 },
    status: 'active',
  },
  {
    id: 'side_wolf',
    kind: 'side',
    title: '狼患',
    narrative: '落雁山下村落屡遭狼王袭扰,村老们凑了些积蓄,求修行人除害。(斩杀铁牙狼王)',
    objective: { type: 'killEnemy', target: 'tieya_lang', n: 1 },
    reward: { narrative: '村老们捧出粗布包着的灵石,千恩万谢。', spiritStones: 40, items: [{ itemId: 'huiqi_san', count: 2 }] },
    status: 'active',
  },
  {
    id: 'side_zhuji',
    kind: 'side',
    title: '道之阶',
    narrative: '筑基,是仙凡之别的第一道门槛。(突破至筑基期)',
    objective: { type: 'reachRealm', target: 'foundation' },
    reward: { narrative: '自此,汝可称一声"道友"。', spiritStones: 100 },
    status: 'active',
  },
];
