/**
 * commands.ts — the whitelist parser.
 *
 * Anything not on this list becomes `{ kind: 'unknown' }`, which the turn
 * pipeline refuses without advancing the clock or touching the dice. Bare
 * digits are event/tactic choices, so `2` answers the pending question.
 */

import { findItem } from '@/data/items';
import { findManual } from '@/data/manuals';
import { OPPONENTS } from '@/data/opponents';
import { PLACES } from '@/data/places';
import { SPIRITS } from '@/data/spirits';
import { BOARD_STYLES } from './board';
import type { BoardStyle, Command } from './types';

/** Verbs that consume a season. Everything else is a free look. */
export const TIME_COMMANDS: readonly Command['kind'][] = [
  'cultivate',
  'travel',
  'spectate',
  'sitForget',
];

/** Free views — no dice, no clock. */
export const FREE_COMMANDS: readonly Command['kind'][] = [
  'panel',
  'satchel',
  'register',
  'audit',
  'market',
];

const ALIASES: Record<string, Command['kind']> = {
  修炼: 'cultivate',
  打谱: 'cultivate',
  cultivate: 'cultivate',
  观棋: 'spectate',
  看棋: 'spectate',
  spectate: 'spectate',
  坐忘: 'sitForget',
  歇息: 'sitForget',
  rest: 'sitForget',
  游历: 'travel',
  远行: 'travel',
  travel: 'travel',
  弈道: 'match',
  对弈: 'match',
  下棋: 'match',
  match: 'match',
  投子: 'resign',
  认负: 'resign',
  resign: 'resign',
  坊市: 'market',
  市集: 'market',
  market: 'market',
  破境: 'breakthrough',
  突破: 'breakthrough',
  breakthrough: 'breakthrough',
  命盘: 'panel',
  panel: 'panel',
  行囊: 'satchel',
  背包: 'satchel',
  satchel: 'satchel',
  精怪录: 'register',
  register: 'register',
  棋录: 'audit',
  审计: 'audit',
  audit: 'audit',
};

function resolvePlace(token: string): string | undefined {
  const t = token.trim();
  return PLACES.find((p) => p.id === t || p.name === t)?.id;
}

function resolveOpponent(token: string): string | undefined {
  const t = token.trim();
  return OPPONENTS.find((o) => o.id === t || o.name === t)?.id;
}

function resolveSpirit(token: string): string | undefined {
  const t = token.trim();
  return SPIRITS.find((s) => s.id === t || s.name === t)?.id;
}

/** Turns raw input into a Command. Never throws; never mutates. */
export function parseCommand(raw: string): Command {
  const text = raw.trim();
  if (text.length === 0) return { kind: 'unknown', raw };

  // Bare digit → event option / tactic slot.
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    if (n >= 1 && n <= 9) return { kind: 'eventChoice', choiceIndex: n - 1 };
    return { kind: 'unknown', raw };
  }

  if ((BOARD_STYLES as readonly string[]).includes(text)) {
    return { kind: 'play', style: text as BoardStyle };
  }

  const parts = text.split(/\s+/);
  const head = parts[0] ?? '';
  const rest = parts.slice(1).join(' ').trim();

  const simple = ALIASES[head] ?? ALIASES[text];
  if (simple && rest.length === 0) {
    switch (simple) {
      case 'cultivate': return { kind: 'cultivate' };
      case 'spectate': return { kind: 'spectate' };
      case 'sitForget': return { kind: 'sitForget' };
      case 'travel': return { kind: 'travel' };
      case 'match': return { kind: 'match' };
      case 'resign': return { kind: 'resign' };
      case 'market': return { kind: 'market' };
      case 'breakthrough': return { kind: 'breakthrough' };
      case 'panel': return { kind: 'panel' };
      case 'satchel': return { kind: 'satchel' };
      case 'register': return { kind: 'register' };
      case 'audit': return { kind: 'audit' };
      default: break;
    }
  }

  if (simple === 'travel' && rest.length > 0) {
    const placeId = resolvePlace(rest);
    return placeId ? { kind: 'travel', placeId } : { kind: 'unknown', raw };
  }
  if (simple === 'match' && rest.length > 0) {
    const opponentId = resolveOpponent(rest);
    return opponentId ? { kind: 'match', opponentId } : { kind: 'unknown', raw };
  }

  if (head === '买' || head === 'buy') {
    const [name, countRaw] = splitTrailingCount(rest);
    const item = findItem(name);
    if (!item) return { kind: 'unknown', raw };
    return { kind: 'buy', itemId: item.id, ...(countRaw ? { count: countRaw } : {}) };
  }
  if (head === '卖' || head === 'sell') {
    const [name, countRaw] = splitTrailingCount(rest);
    const item = findItem(name);
    if (!item) return { kind: 'unknown', raw };
    return { kind: 'sell', itemId: item.id, ...(countRaw ? { count: countRaw } : {}) };
  }
  if (head === '用' || head === 'use') {
    const item = findItem(rest);
    return item ? { kind: 'use', itemId: item.id } : { kind: 'unknown', raw };
  }
  if (head === '赠' || head === 'gift') {
    const [who, ...others] = rest.split(/\s+/);
    const spiritId = resolveSpirit(who ?? '');
    const item = findItem(others.join(' '));
    if (!spiritId || !item) return { kind: 'unknown', raw };
    return { kind: 'gift', spiritId, itemId: item.id };
  }
  if (head === '参' || head === '参谱' || head === 'study') {
    const manual = findManual(rest);
    return manual ? { kind: 'study', manualId: manual.id } : { kind: 'unknown', raw };
  }
  if (head === '悟' || head === '悟谱' || head === 'learn') {
    const manual = findManual(rest);
    return manual ? { kind: 'learn', manualId: manual.id } : { kind: 'unknown', raw };
  }

  return { kind: 'unknown', raw };
}

function splitTrailingCount(text: string): [string, number | undefined] {
  const m = /^(.*?)(?:\s+|×|x|\*)(\d+)$/.exec(text.trim());
  if (!m) return [text.trim(), undefined];
  return [(m[1] ?? '').trim(), Number(m[2])];
}

/** Stable string for the audit hash chain — must not include free text. */
export function commandKey(cmd: Command): string {
  switch (cmd.kind) {
    case 'travel': return `travel:${cmd.placeId ?? '-'}`;
    case 'match': return `match:${cmd.opponentId ?? '-'}`;
    case 'play': return `play:${cmd.style}`;
    case 'buy': return `buy:${cmd.itemId}x${cmd.count ?? 1}`;
    case 'sell': return `sell:${cmd.itemId}x${cmd.count ?? 1}`;
    case 'use': return `use:${cmd.itemId}`;
    case 'gift': return `gift:${cmd.spiritId}:${cmd.itemId}`;
    case 'study': return `study:${cmd.manualId}`;
    case 'learn': return `learn:${cmd.manualId}`;
    case 'eventChoice': return `choice:${cmd.choiceIndex}`;
    case 'unknown': return 'unknown';
    default: return cmd.kind;
  }
}

export function isTimeCommand(cmd: Command): boolean {
  return (TIME_COMMANDS as readonly string[]).includes(cmd.kind);
}

export function isFreeCommand(cmd: Command): boolean {
  return (FREE_COMMANDS as readonly string[]).includes(cmd.kind);
}
