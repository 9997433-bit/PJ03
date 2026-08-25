// ============================================================================
// injuries.ts — 伤势模板
// 引擎克隆(makeInjury)后挂在角色身上。effect 采用 PLAN §2 方言:
//   speed / power 为小数比例(-0.2 = 修炼/战力打八折),
//   breakthrough 为百分点(-10 = 突破成算 −10)。
// 键名契约:waiShang(兜底)、xinMo(突破失败心魔)、neishang(战败内伤)
// 已被 engine/breakthrough.ts 与 engine/combat.ts 按字面引用。
// ============================================================================

import type { Injury } from '@/engine/types';

export interface InjuryTemplate {
  id: string;
  name: string;
  severity: 1 | 2 | 3;
  /** 基础持续回合(山野村童·耐苦 −1) */
  baseTurns: number;
  effect: Partial<Record<'speed' | 'power' | 'breakthrough', number>>;
  /** 天道旁白(受伤时) */
  line: string;
}

export const INJURY_DEFS: Record<string, InjuryTemplate> = {
  waiShang: {
    id: 'waiShang',
    name: '外伤',
    severity: 1,
    baseTurns: 3,
    effect: { power: -0.1 },
    line: '皮开肉绽,幸未及筋骨。',
  },
  neishang: {
    id: 'neishang',
    name: '内伤',
    severity: 2,
    baseTurns: 5,
    effect: { speed: -0.2, power: -0.15, breakthrough: -5 },
    line: '气血逆行,五脏如遭锤击。行功时胸口隐隐作痛。',
  },
  duShang: {
    id: 'duShang',
    name: '余毒未清',
    severity: 2,
    baseTurns: 4,
    effect: { speed: -0.15, power: -0.1 },
    line: '毒气滞于经络,须以真气日日炼化。',
  },
  xinMo: {
    id: 'xinMo',
    name: '心魔滋生',
    severity: 2,
    baseTurns: 6,
    effect: { speed: -0.25, breakthrough: -10 },
    line: '一念之差,魔由心生。每逢入定,总有一个声音问汝:何必呢?',
  },
  daoji_shang: {
    id: 'daoji_shang',
    name: '道基受创',
    severity: 3,
    baseTurns: 10,
    effect: { speed: -0.4, power: -0.15, breakthrough: -12 },
    line: '道基震裂,如屋梁生纹。不养好这道伤,再谈登高,是自寻死路。',
  },
  // ── 同义键(旧引用兼容) ──
  pirou_shang: {
    id: 'pirou_shang',
    name: '皮肉之伤',
    severity: 1,
    baseTurns: 3,
    effect: { power: -0.08 },
    line: '皮肉之伤,不碍行走,碍睡眠。',
  },
  jingmai_shang: {
    id: 'jingmai_shang',
    name: '经脉受损',
    severity: 2,
    baseTurns: 6,
    effect: { speed: -0.2, power: -0.15, breakthrough: -5 },
    line: '经脉如淤塞的河道,真气行至半途,寸步难行。',
  },
};

/** 兼容旧名 */
export const INJURIES = INJURY_DEFS;

/** id 归一化 + 历史别名(daoShang → daoji_shang 等) */
function normKey(id: string): string {
  return id.replace(/[_\-\s]/g, '').toLowerCase();
}
const INJURY_INDEX = new Map<string, InjuryTemplate>();
for (const t of Object.values(INJURY_DEFS)) INJURY_INDEX.set(normKey(t.id), t);
INJURY_INDEX.set('daoshang', INJURY_DEFS.daoji_shang!);

/**
 * 引擎契约:由模板生成一份伤势实例。
 * reduceTurns — 痊愈回合减免(山野村童·耐苦 传 1)。查无此伤时以外伤兜底。
 */
export function makeInjury(id: string, reduceTurns = 0): Injury {
  const t = INJURY_INDEX.get(normKey(id)) ?? INJURY_DEFS.waiShang!;
  return {
    id: t.id,
    name: t.name,
    severity: t.severity,
    turnsLeft: Math.max(1, t.baseTurns - reduceTurns),
    effect: { ...t.effect },
  };
}

/** 旧名兼容(boolean 形参) */
export function makeInjuryFromDef(id: string, enduring = false): Injury {
  return makeInjury(id, enduring ? 1 : 0);
}
