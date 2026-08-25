// ============================================================================
// Shared presentation helpers for game components.
// Pure functions only — no React.
// ============================================================================

import type {
  ItemDef,
  LogEntry,
  RealmId,
  RealmState,
  SpiritRootGrade,
  VisibleAttribute,
} from "@/engine/types";

// ----- Chinese numerals (炼气层数) -----
const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function cnNum(n: number): string {
  if (n <= 0) return CN_DIGITS[0];
  if (n < 10) return CN_DIGITS[n];
  if (n === 10) return "十";
  if (n < 20) return `十${CN_DIGITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ""}`;
}

// ----- Realm display -----
export const REALM_NAMES: Record<RealmId, string> = {
  mortal: "凡人",
  qi: "炼气",
  foundation: "筑基",
  core: "金丹",
  nascent: "元婴",
  deity: "化神",
};

export function formatRealm(realm: RealmState): string {
  if (realm.realm === "mortal") return "凡人之躯";
  if (realm.realm === "qi") return `炼气${cnNum(realm.qiLayer)}层`;
  return `${REALM_NAMES[realm.realm]}${realm.stage}`;
}

/** Short form for the TopBar — e.g. 炼气七层 / 金丹中期 */
export function formatRealmShort(realm: RealmState): string {
  if (realm.realm === "mortal") return "凡人";
  if (realm.realm === "qi") return `炼气${cnNum(realm.qiLayer)}层`;
  return `${REALM_NAMES[realm.realm]}${realm.stage}`;
}

// ----- Turn → in-world date (1 turn = 3 months) -----
const SEASONS = ["春", "夏", "秋", "冬"] as const;

export function turnLabel(turn: number): string {
  if (turn <= 0) return "入世之前";
  const year = Math.floor((turn - 1) / 4) + 1;
  const season = SEASONS[(turn - 1) % 4];
  return `第${cnNum(year)}年 · ${season}`;
}

// ----- Item grade (品阶) -----
export interface GradeInfo {
  label: string;
  textClass: string;
  ringClass: string;
  bgClass: string;
}

export const GRADE_INFO: Record<ItemDef["grade"], GradeInfo> = {
  1: {
    label: "凡品",
    textClass: "text-mist-400",
    ringClass: "ring-ink-600",
    bgClass: "bg-ink-800/60",
  },
  2: {
    label: "下品",
    textClass: "text-paper-200",
    ringClass: "ring-paper-400/40",
    bgClass: "bg-ink-800/70",
  },
  3: {
    label: "中品",
    textClass: "text-jade-300",
    ringClass: "ring-jade-600/60",
    bgClass: "bg-jade-600/10",
  },
  4: {
    label: "上品",
    textClass: "text-gold-300",
    ringClass: "ring-gold-600/60",
    bgClass: "bg-gold-400/10",
  },
  5: {
    label: "仙品",
    textClass: "text-mystic-400",
    ringClass: "ring-mystic-600/70",
    bgClass: "bg-mystic-900/25",
  },
};

// ----- Item kind labels -----
export const ITEM_KIND_LABELS: Record<ItemDef["kind"], string> = {
  pill: "丹药",
  weapon: "兵刃",
  armor: "护具",
  accessory: "饰物",
  talisman: "符箓",
  material: "灵材",
  manual: "典籍",
  misc: "杂物",
};

// ----- Spirit root grade styling -----
export const SPIRIT_ROOT_STYLE: Record<
  SpiritRootGrade,
  { badge: "gold" | "mystic" | "default" | "jade" | "secondary" | "outline"; glowClass: string }
> = {
  天灵根: { badge: "gold", glowClass: "text-glow-gold" },
  异灵根: { badge: "mystic", glowClass: "text-glow-gold" },
  真灵根: { badge: "default", glowClass: "text-glow-gold" },
  双灵根: { badge: "jade", glowClass: "text-glow-jade" },
  三灵根: { badge: "secondary", glowClass: "" },
  四灵根: { badge: "outline", glowClass: "" },
  五灵根: { badge: "outline", glowClass: "" },
};

// ----- Visible attributes (机缘 deliberately absent — hidden by design) -----
export const ATTRIBUTE_META: Record<
  VisibleAttribute,
  { label: string; hint: string }
> = {
  genGu: { label: "根骨", hint: "气血与突破之本" },
  wuXing: { label: "悟性", hint: "参悟功法之速" },
  xinXing: { label: "心性", hint: "御心魔，定道途" },
  qiYun: { label: "气运", hint: "机遇祸福之势" },
};

export const VISIBLE_ATTRIBUTES: VisibleAttribute[] = [
  "genGu",
  "wuXing",
  "xinXing",
  "qiYun",
];

// ----- Narrative tone → classes -----
export function toneTextClass(tone: LogEntry["tone"]): string {
  switch (tone) {
    case "gold":
      return "text-gold-300";
    case "danger":
      return "text-crimson-400";
    case "jade":
      return "text-jade-300";
    default:
      return "text-paper-50/90";
  }
}

// ----- Numbers -----
export function formatStones(n: number): string {
  return n.toLocaleString("zh-Hans-CN");
}

/** Dice value coloring for audit / inline reveals (D100 buckets). */
export function d100ValueClass(value: number): string {
  if (value >= 91) return "text-gold-300";
  if (value >= 71) return "text-jade-300";
  if (value <= 10) return "text-crimson-400";
  if (value <= 30) return "text-crimson-400/70";
  return "text-paper-200";
}
