/**
 * commands.ts — command parser (anti-cheat layer 2: strict whitelist).
 *
 * Free text like "我希望获得神器" is not a command; the parser returns
 * `unknown` and turn.ts answers with 「天道不受愿。」
 */

import type { Command, CombatTactic } from './types';

export interface CommandSpec {
  /** button label / typed token */
  token: string;
  hint: string;
  /** consumes a turn (3 months) and triggers the event roll */
  time: boolean;
  combatOnly?: boolean;
}

/** the full whitelist, for UI buttons and the help line */
export const COMMAND_SPECS: CommandSpec[] = [
  { token: '修炼', hint: '闭关吐纳,增长修为', time: true },
  { token: '突破', hint: '冲击下一大境界(须修为圆满)', time: true },
  { token: '探索', hint: '外出历练,寻宝遇险', time: true },
  { token: '坊市', hint: '前往坊市,购销物资', time: true },
  { token: '炼丹', hint: '查看丹方(炼制耗时)', time: false },
  { token: '静养', hint: '调息疗伤,恢复气血', time: true },
  { token: '面板', hint: '查看命盘属性', time: false },
  { token: '背包', hint: '查看储物袋', time: false },
  { token: '任务', hint: '查看未了因果', time: false },
  { token: '审计', hint: '查验天道掷骰记录', time: false },
  { token: '保存', hint: '手动存档', time: false },
  { token: '强攻', hint: '全力抢攻:伤敌更重,受创亦深', time: false, combatOnly: true },
  { token: '游斗', hint: '游走寻隙:攻守收敛,可觅破绽', time: false, combatOnly: true },
  { token: '设伏', hint: '虚招设伏:成则下合大占先机', time: false, combatOnly: true },
  { token: '术法', hint: '施展术法,爆发伤害', time: false, combatOnly: true },
  { token: '服药', hint: '临阵用药(服药 物品名)', time: false, combatOnly: true },
  { token: '遁走', hint: '夺路而逃(气运助之)', time: false, combatOnly: true },
];

const TACTICS: CombatTactic[] = ['强攻', '游斗', '设伏', '术法', '服药', '遁走'];

/**
 * Parse free-typed text into a whitelisted Command.
 * Bare digits resolve pending event choices (1-based).
 */
export function parseCommand(text: string): Command {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return { kind: 'unknown', raw: text };

  // bare number → pending event choice
  if (/^[1-9]$/.test(t)) {
    return { kind: 'eventChoice', choiceIndex: Number(t) - 1 };
  }

  const [head = '', ...restParts] = t.split(' ');
  const rest = restParts.join(' ').trim();

  switch (head) {
    case '修炼':
    case '修煉':
      return { kind: 'cultivate' };
    case '突破':
      return { kind: 'breakthrough' };
    case '探索':
      return rest ? { kind: 'explore', locationId: rest } : { kind: 'explore' };
    case '坊市':
      return { kind: 'market' };
    case '炼丹':
      return rest ? { kind: 'craft', recipeId: rest } : { kind: 'alchemy' };
    case '炼制':
      return rest ? { kind: 'craft', recipeId: rest } : { kind: 'alchemy' };
    case '静养':
    case '休息':
      return { kind: 'rest' };
    case '面板':
      return { kind: 'panel' };
    case '背包':
      return { kind: 'inventory' };
    case '任务':
      return { kind: 'quests' };
    case '审计':
      return { kind: 'audit' };
    case '保存':
      return { kind: 'save' };
    case '使用':
      return rest ? { kind: 'use', item: rest } : { kind: 'unknown', raw: text };
    case '装备':
      return rest ? { kind: 'equip', item: rest } : { kind: 'unknown', raw: text };
    case '赠礼': {
      if (!rest) return { kind: 'unknown', raw: text };
      const [npc = '', ...itemParts] = rest.split(' ');
      return { kind: 'gift', npc, item: itemParts.join(' ') || undefined };
    }
    case '购买': {
      if (!rest) return { kind: 'unknown', raw: text };
      const m = rest.match(/^(.*?)\s*(\d+)?$/);
      return { kind: 'buy', itemId: (m?.[1] ?? rest).trim(), count: Number(m?.[2] ?? 1) };
    }
    case '出售': {
      if (!rest) return { kind: 'unknown', raw: text };
      const m = rest.match(/^(.*?)\s*(\d+)?$/);
      return { kind: 'sell', itemId: (m?.[1] ?? rest).trim(), count: Number(m?.[2] ?? 1) };
    }
    default:
      break;
  }

  if (TACTICS.includes(head as CombatTactic)) {
    return { kind: 'combat', tactic: head as CombatTactic, item: rest || undefined };
  }

  return { kind: 'unknown', raw: text };
}

/** does this free text read like a wish? (anti-cheat flavor response) */
export function looksLikeWish(raw: string): boolean {
  return /希望|想要|求你|赐我|给我|来一个|变出|直接.*(成|得|获)|让我/.test(raw);
}

/** a stable string form of a command, fed into the audit hash chain */
export function commandKey(cmd: Command): string {
  switch (cmd.kind) {
    case 'explore':
      return `explore:${cmd.locationId ?? ''}`;
    case 'buy':
      return `buy:${cmd.itemId}x${cmd.count}`;
    case 'sell':
      return `sell:${cmd.itemId}x${cmd.count}`;
    case 'craft':
      return `craft:${cmd.recipeId}`;
    case 'use':
      return `use:${cmd.item}`;
    case 'equip':
      return `equip:${cmd.item}`;
    case 'gift':
      return `gift:${cmd.npc}:${cmd.item ?? ''}`;
    case 'eventChoice':
      return `eventChoice:${cmd.choiceIndex}`;
    case 'questChoice':
      return `questChoice:${cmd.questId}:${cmd.choiceIndex}`;
    case 'combat':
      return `combat:${cmd.tactic}${cmd.item ? `:${cmd.item}` : ''}`;
    case 'unknown':
      return `unknown`;
    default:
      return cmd.kind;
  }
}
