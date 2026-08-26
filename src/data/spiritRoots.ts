// ============================================================================
// spiritRoots.ts — 灵根 D100 抽取表
// 一次 D100 定终身,不可重掷(creation.ts 强制)。
// 大多数人抽到差灵根——这个游戏讲的,正是以凡人之身逆天而行。
// revealLines 供 SpiritRootStep 分段渐显:测灵碑亮起 → 光色变化 → 定音。
// ============================================================================

import type { Element, MutantElement, SpiritRootGrade } from '@/engine/types';

/** 五行池 — 多灵根从中不重复抽取 */
export const BASE_ELEMENTS: Element[] = ['金', '木', '水', '火', '土'];

/** 变异池 — 异灵根专用 */
export const MUTATED_ELEMENTS: MutantElement[] = ['雷', '冰', '风'];
/** 同义导出(旧名) */
export const MUTANT_ELEMENTS = MUTATED_ELEMENTS;

/** 数据侧表行 — 引擎 SpiritRootTableEntry 的超集(mutant/mutated 并存) */
export interface SpiritRootRow {
  min: number;
  max: number;
  grade: SpiritRootGrade;
  /** 展示用全称,如「五行杂灵根(伪灵根)」 */
  label: string;
  elementCount: number;
  speedMultiplier: number;
  /** 变异灵根从 雷/冰/风 池抽取 */
  mutant?: boolean;
  /** 同义字段(部分引擎代码以 mutated 相称) */
  mutated?: boolean;
  /** 揭示时的短评 */
  blurb: string;
  /** 分段渐显的测灵戏文(UI 逐行打出) */
  revealLines: string[];
  /** 天道落款一句 */
  verdict: string;
  /** 附带暗记(引擎按键名取用,如 五灵根 苦志) */
  bonusFlags?: Record<string, boolean | number>;
  /** UI 色彩提示 */
  color: 'gold' | 'jade' | 'normal' | 'muted';
}

export const SPIRIT_ROOT_TABLE: SpiritRootRow[] = [
  {
    min: 1, max: 40,
    grade: '五灵根',
    label: '五行杂灵根(伪灵根)',
    elementCount: 5,
    speedMultiplier: 0.5,
    color: 'muted',
    blurb: '五色皆沾,五色皆薄。修仙界最不值钱的入场券。',
    revealLines: [
      '汝掌心贴上测灵碑。碑面凉如深井之水。',
      '许久,碑上浮起五色光纹——皆淡,皆散,如雨打沙面,转瞬漫漶。',
      '测灵人收回手,眼皮都未抬:「五行杂灵根。下一个。」',
      '周遭响起几声低低的嗤笑。有人管它叫「伪灵根」。',
    ],
    verdict: '天道无言。碑不欺人:此路于汝,百倍其功,未必一成。走,或不走?',
    bonusFlags: { grit: true },
  },
  {
    min: 41, max: 65,
    grade: '四灵根',
    label: '四灵根(下品)',
    elementCount: 4,
    speedMultiplier: 0.7,
    color: 'muted',
    blurb: '四行驳杂,彼此掣肘。门内的路,比别人长四倍。',
    revealLines: [
      '汝掌心贴上测灵碑。碑体微温,似有回应。',
      '四道光纹次第亮起,明明灭灭,彼此牵扯,谁也压不过谁。',
      '测灵人多看了汝一眼,提笔记录:「四灵根,驳杂,可入下品名册。」',
    ],
    verdict: '天道记下:资质平庸者众,而庸中有恒者,万中无一。汝为哪种,日后自见。',
  },
  {
    min: 66, max: 82,
    grade: '三灵根',
    label: '三灵根(中品)',
    elementCount: 3,
    speedMultiplier: 0.9,
    color: 'normal',
    blurb: '中人之姿,够格入门。「够格」二字,既是通行证,也是天花板。',
    revealLines: [
      '汝掌心贴上测灵碑。碑面泛起涟漪般的微光。',
      '三色光纹升起,尚算清晰,在碑顶交缠成一团黯淡的云。',
      '测灵人点了点头:「三灵根。够格了。」',
    ],
    verdict: '天道记下:宗门收汝,如仓廪收粟。一石粟里,可曾指望哪一粒成仙?',
  },
  {
    min: 83, max: 93,
    grade: '双灵根',
    label: '双灵根(上品)',
    elementCount: 2,
    speedMultiplier: 1.2,
    color: 'jade',
    blurb: '双色清光并立如剑。几年难遇的好苗子。',
    revealLines: [
      '汝掌心贴上测灵碑。碑体倏然一热。',
      '两道光纹拔地而起,凝而不散,如双剑并立,清光照亮了测灵人的脸。',
      '「双灵根。」他的声音沉了下来,重新打量汝,「几年没见过了。」',
      '人群安静了一瞬。有人开始打听汝的姓名。',
    ],
    verdict: '天道记下:上上之姿。但记住——碑上光华,照不亮前路半尺,路仍要汝一步步走。',
  },
  {
    min: 94, max: 97,
    grade: '真灵根',
    label: '单属性真灵根(极品)',
    elementCount: 1,
    speedMultiplier: 1.6,
    color: 'jade',
    blurb: '一线灵光,纯粹如初雪。宗门名录朱批之姿。',
    revealLines: [
      '汝掌心贴上测灵碑。嗡——碑体轻鸣。',
      '一道光柱冲顶而起,纯粹,凝练,不杂一丝旁色,直贯碑顶。',
      '测灵人霍然起身,袖中掉出的笔都忘了捡:「单属性真灵根!」',
      '此刻起,汝的名字会被写进不止一家宗门的名录。带着朱批。',
    ],
    verdict: '天道记下:真灵根者,道途通衢。然通衢之上,伏尸亦众——盯上汝的,不止宗门。',
  },
  {
    min: 98, max: 99,
    grade: '异灵根',
    label: '天地异种·变异灵根',
    elementCount: 1,
    mutant: true,
    mutated: true,
    color: 'gold',
    speedMultiplier: 2.2,
    blurb: '色不在五行谱内。福祸各半,怀璧其罪。',
    revealLines: [
      '汝掌心贴上测灵碑。碑面骤然爆出一声脆响!',
      '光纹不是升起来的——是炸开的。颜色诡谲,不在五行谱内,碑身裂了一道发丝细的纹。',
      '测灵人踉跄半步,死死盯着那道异色光华,喉结滚动:「变异灵根……天地异种。」',
      '他压低声音,几乎是耳语:「小友,今日之事,少对人言。」',
    ],
    verdict: '天道记下:异种降世,福祸各半。藏好汝的光。',
    bonusFlags: { mutantRoot: true },
  },
  {
    min: 100, max: 100,
    grade: '天灵根',
    label: '天灵根(万中无一)',
    elementCount: 1,
    speedMultiplier: 3.0,
    color: 'gold',
    blurb: '光柱百丈,古碑寸裂。天之骄子——而天道无亲。',
    revealLines: [
      '汝掌心贴上测灵碑。',
      '一瞬间,天地失声。',
      '碑上光华冲霄而起,直上百丈,方圆十里灵气如百川归海,朝汝所立之处倒卷而来。' +
      '测灵碑——这块三百年无恙的古碑——寸寸崩裂。',
      '测灵人跪了下去。不是对汝,是对这一根冲天的光柱。',
      '「天灵根……老朽有生之年,竟然……」',
    ],
    verdict: '天道记下:万中无一。它给汝最快的路,亦会给汝最重的劫。',
    bonusFlags: { heavenFavored: true },
  },
];

/** 按 D100 点数取档(1–100 全覆盖) */
export function lookupSpiritRoot(d100: number): SpiritRootRow {
  const v = Math.max(1, Math.min(100, Math.round(d100)));
  return SPIRIT_ROOT_TABLE.find((t) => v >= t.min && v <= t.max) ?? SPIRIT_ROOT_TABLE[0]!;
}

/** 同义导出(旧名) */
export const getSpiritRootTier = lookupSpiritRoot;

/** stubEngine 兼容: D100 → 灵根档位 */
export function bandForRoll(d100: number) {
  const row = lookupSpiritRoot(d100);
  return {
    grade: row.grade,
    elementCount: row.elementCount,
    speedMultiplier: row.speedMultiplier,
    note: row.blurb,
    mutant: row.mutant ?? row.mutated,
  };
}

/** 同义:五行元素池 */
export const ELEMENTS = BASE_ELEMENTS;

/** 各品阶短评 — 供揭示后一句话点评 */
export const SPIRIT_ROOT_FLAVOR: Record<SpiritRootGrade, string> = {
  五灵根: '五行皆沾,五行皆废。测灵人已在挥手叫下一个了。',
  四灵根: '四行驳杂,资质平平。修仙路上,汝将排在长队的末尾。',
  三灵根: '中人之姿。宗门要人手,也仅仅是要人手。',
  双灵根: '双色清光,凝而不散。测灵人第一次正眼看汝。',
  真灵根: '一线冲霄,纯粹无瑕。这一日之后,汝的名字有了分量。',
  异灵根: '光色诡谲,不在谱内。测灵人劝汝:少对人言。',
  天灵根: '古碑寸裂,十里灵气来朝。天之骄子——天道无亲。',
};

/** 揭示前的公共引子 — UI 在 D100 落定前渐显 */
export const SPIRIT_ROOT_PRELUDE: string[] = [
  '测灵碑立于此地已三百年。碑前跪过神童,也跪过白发。',
  '测灵人枯瘦的手指向碑面:「掌心贴上去。心里想什么,都没用。」',
  '天道执骰。命数,一掷而定。',
];
