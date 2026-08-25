/**
 * spiritRoots.ts — 灵根 D100 抽取表
 * 一次 D100 定终身,结果不可重掷(creation.ts 强制)。
 * revealLines 供 SpiritRootStep 分段渐显:测灵碑亮起 → 光色变化 → 定音。
 * 大多数人抽到差灵根 —— 这个游戏讲的正是「以凡人之身,逆天而行」。
 */
import type { BaseElement, MutantElement, SpiritRootTier } from './types';

/** 五行池 — 多灵根从中不重复抽取 */
export const BASE_ELEMENTS: BaseElement[] = ['金', '木', '水', '火', '土'];

/** 变异池 — 异灵根专用 */
export const MUTANT_ELEMENTS: MutantElement[] = ['雷', '冰', '风'];

export const SPIRIT_ROOT_TABLE: SpiritRootTier[] = [
  {
    grade: '五灵根',
    range: [1, 40],
    speedMultiplier: 0.5,
    elementCount: 5,
    color: 'muted',
    revealLines: [
      '汝掌心贴上测灵碑。碑面凉如深井之水。',
      '许久,碑上浮起五色光纹——皆淡,皆散,如雨打沙面,转瞬漫漶。',
      '测灵人收回手,眼皮都未抬:「五行杂灵根。下一个。」',
      '周遭响起几声低低的嗤笑。有人叫它「伪灵根」——修仙界最不值钱的入场券。',
    ],
    verdict: '天道无言。碑不欺人:此路于汝,百倍其功,未必一成。走,或不走?',
    bonusFlags: { pseudo_root_grit: true }, // 引擎:苦熬心志 — 心性检定 +1
  },
  {
    grade: '四灵根',
    range: [41, 65],
    speedMultiplier: 0.7,
    elementCount: 4,
    color: 'muted',
    revealLines: [
      '汝掌心贴上测灵碑。碑体微温,似有回应。',
      '四道光纹次第亮起,明明灭灭,彼此牵扯,谁也压不过谁。',
      '测灵人多看了汝一眼,提笔记录:「四灵根,驳杂,可入下品名册。」',
      '不算被拒之门外——只是门内的路,比别人长四倍。',
    ],
    verdict: '天道记下:资质平庸者众,而庸中有恒者,万中无一。汝为哪种,日后自见。',
  },
  {
    grade: '三灵根',
    range: [66, 82],
    speedMultiplier: 0.9,
    elementCount: 3,
    color: 'normal',
    revealLines: [
      '汝掌心贴上测灵碑。碑面泛起涟漪般的微光。',
      '三色光纹升起,尚算清晰,在碑顶交缠成一团黯淡的云。',
      '测灵人点了点头:「三灵根。够格了。」',
      '够格——在修仙界,这两个字既是通行证,也是天花板。',
    ],
    verdict: '天道记下:中人之姿。宗门收汝,如仓廪收粟,一石粟里,可曾指望哪一粒成仙?',
  },
  {
    grade: '双灵根',
    range: [83, 93],
    speedMultiplier: 1.2,
    elementCount: 2,
    color: 'jade',
    revealLines: [
      '汝掌心贴上测灵碑。碑体倏然一热。',
      '两道光纹拔地而起,凝而不散,如双剑并立,清光照亮了测灵人的脸。',
      '「双灵根。」他声音沉了下来,重新打量汝,「几年没见过了。」',
      '人群安静了一瞬。有人开始打听汝的姓名。',
    ],
    verdict: '天道记下:上上之姿。但记住——碑上光华,照不亮前路半尺,路仍要汝一步步走。',
  },
  {
    grade: '真灵根',
    range: [94, 97],
    speedMultiplier: 1.6,
    elementCount: 1,
    color: 'jade',
    revealLines: [
      '汝掌心贴上测灵碑。嗡——碑体轻鸣。',
      '一道光柱冲顶而起,纯粹,凝练,不杂一丝旁色,直贯碑顶。',
      '测灵人霍然起身,袖中掉出的笔都忘了捡:「单属性真灵根!」',
      '此刻起,汝的名字会被写进不止一家宗门的名录。带着朱批。',
    ],
    verdict: '天道记下:真灵根者,道途通衢。然通衢之上,伏尸亦众——盯上汝的,不止宗门。',
  },
  {
    grade: '异灵根',
    range: [98, 99],
    speedMultiplier: 2.2,
    elementCount: 1,
    mutant: true,
    color: 'gold',
    revealLines: [
      '汝掌心贴上测灵碑。碑面骤然爆出一声脆响!',
      '光纹不是升起来的——是炸开的。颜色诡谲,不在五行谱内,碑身裂了一道发丝细的纹。',
      '测灵人踉跄半步,死死盯着那道异色光华,喉结滚动:「变异灵根……天地异种。」',
      '他压低声音,几乎是耳语:「小友,今日之事,少对人言。」',
    ],
    verdict: '天道记下:异种降世,福祸各半。怀璧之罪,自古如是——藏好汝的光。',
    bonusFlags: { mutant_root: true }, // 引擎:变异术法威力上浮,亦引来觊觎类事件
  },
  {
    grade: '天灵根',
    range: [100, 100],
    speedMultiplier: 3.0,
    elementCount: 1,
    color: 'gold',
    revealLines: [
      '汝掌心贴上测灵碑。',
      '一瞬间,天地失声。',
      '碑上光华冲霄而起,直上百丈,方圆十里灵气如百川归海,朝汝所立之处倒卷而来。测灵碑——这块三百年无恙的古碑——寸寸崩裂。',
      '测灵人跪了下去。不是对汝,是对这一根冲天的光柱。',
      '「天灵根……老朽有生之年,竟然……」',
    ],
    verdict: '天道记下:万中无一,天之骄子。而天道无亲——它给汝最快的路,亦会给汝最重的劫。',
    bonusFlags: { heaven_favored: true }, // 引擎:大机缘权重上调,同时解锁「木秀于林」类劫难事件
  },
];

/** 揭示前的公共引子 — 供 UI 在 D100 落定前渐显 */
export const SPIRIT_ROOT_PRELUDE: string[] = [
  '测灵碑立于此地已三百年。碑前跪过神童,也跪过白发。',
  '测灵人枯瘦的手指向碑面:「掌心贴上去。心里想什么都没用。」',
  '天道执骰。命数,一掷而定。',
];

/** 按 D100 点数取档 */
export function getSpiritRootTier(roll: number): SpiritRootTier {
  const tier = SPIRIT_ROOT_TABLE.find((t) => roll >= t.range[0] && roll <= t.range[1]);
  // roll 恒在 1–100,表覆盖完整区间;此分支仅为类型收窄
  return tier ?? SPIRIT_ROOT_TABLE[0];
}
