/**
 * turn.ts — 回合解析器 (the single writer)
 *
 * Every state transition in the game funnels through `execute`. Nothing else
 * in the codebase constructs a new `GameState`, which is what makes the
 * following four guarantees hold at once:
 *
 *   **白名单** — the phase decides which commands exist. In 斗法 only combat
 *   verbs are legal; with an event pending only 抉择 is. Anything else is
 *   rejected with the state untouched.
 *
 *   **原子性** — the command works on a deep clone. If `checkInvariants` finds
 *   a violation at the end of the turn, the clone is discarded whole and the
 *   player is told the turn was rolled back. A half-applied turn cannot exist.
 *
 *   **哈希链** — each accepted command appends
 *   `sha256(prev | turn | command | rolls)`, so an edited save is detectable
 *   without storing the original.
 *
 *   **顺序** — turn-costing commands always run the 劫运 phase *first*. That
 *   fixed ordering is what makes 推演命数 able to promise anything at all.
 */

import { buildChainEntry, checkInvariants, isForbiddenWish, WISH_REJECTION } from './audit';
import { attemptBreakthrough } from './breakthrough';
import { calamityPhase, dissolveCalamity } from './calamity';
import { combatAction, resolveSpoils, startCombat } from './combat';
import { cultivate, seclude } from './cultivation';
import { derive, lifespanFor } from './derived';
import { divine } from './divination';
import { canRetire, checkEndings } from './endings';
import { chooseEventOption, explore } from './events';
import { buyItem, equipItem, sellItem, unequipSlot, useItem } from './market';
import { joinSect, leaveSect, learnTechnique, sectUpkeep } from './progression';
import { enemiesForRealm } from '@/data/enemies';
import { realmDef } from '@/data/realms';
import { rollRange } from './rng';
import type {
  CombatAction,
  DivinationDepth,
  GameState,
  LogEntry,
  MitigationId,
  SpoilsChoice,
  TurnResult,
} from './types';
import { clamp, cloneState, countItem, entry, pushLog, round1 } from './util';

// ============================================================================
// Commands
// ============================================================================

export type Command =
  | { kind: '修炼' }
  | { kind: '闭关' }
  | { kind: '突破' }
  | { kind: '探索' }
  | { kind: '斗法' }
  | { kind: '化解劫运'; mitigation: MitigationId }
  | { kind: '推演命数'; depth: DivinationDepth }
  | { kind: '习功法'; techniqueId: string }
  | { kind: '归隐' }
  | { kind: '坊市买'; itemId: string; count?: number }
  | { kind: '坊市卖'; itemId: string; count?: number }
  | { kind: '用物'; itemId: string }
  | { kind: '装备'; itemId: string }
  | { kind: '卸下'; slot: 'weapon' | 'robe' | 'charm' }
  | { kind: '入门派'; sectId: string }
  | { kind: '离门'; }
  | { kind: '战斗'; action: CombatAction }
  | { kind: '战利'; choice: SpoilsChoice }
  | { kind: '抉择'; choiceId: string };

/** Commands that consume a year and therefore trigger the 劫运 phase. */
const TURN_COSTING: ReadonlySet<Command['kind']> = new Set([
  '修炼',
  '闭关',
  '突破',
  '探索',
  '斗法',
  '化解劫运',
  '习功法',
]);

/** Legal command kinds per phase. Everything else is rejected outright. */
const PHASE_WHITELIST: Record<string, ReadonlySet<Command['kind']>> = {
  playing: new Set<Command['kind']>([
    '修炼',
    '闭关',
    '突破',
    '探索',
    '斗法',
    '化解劫运',
    '推演命数',
    '习功法',
    '归隐',
    '坊市买',
    '坊市卖',
    '用物',
    '装备',
    '卸下',
    '入门派',
    '离门',
  ]),
  combat: new Set<Command['kind']>(['战斗', '战利', '用物']),
  event: new Set<Command['kind']>(['抉择']),
};

export function commandLabel(command: Command): string {
  switch (command.kind) {
    case '化解劫运':
      return `化解劫运·${command.mitigation}`;
    case '推演命数':
      return `推演命数·${command.depth}`;
    case '习功法':
      return `习功法·${command.techniqueId}`;
    case '坊市买':
      return `坊市买·${command.itemId}×${command.count ?? 1}`;
    case '坊市卖':
      return `坊市卖·${command.itemId}×${command.count ?? 1}`;
    case '用物':
      return `用物·${command.itemId}`;
    case '装备':
      return `装备·${command.itemId}`;
    case '卸下':
      return `卸下·${command.slot}`;
    case '入门派':
      return `入门派·${command.sectId}`;
    case '战斗':
      return `战斗·${command.action}`;
    case '战利':
      return `战利·${command.choice}`;
    case '抉择':
      return `抉择·${command.choiceId}`;
    default:
      return command.kind;
  }
}

// ============================================================================
// Upkeep
// ============================================================================

function runUpkeep(state: GameState): LogEntry[] {
  const c = state.character!;
  const out: LogEntry[] = [];

  c.age += 1;
  state.stats.turns = state.turn;
  state.stats.years = c.age - 16;

  // 伤势
  const healed: string[] = [];
  for (const injury of c.injuries) injury.turnsLeft -= 1;
  c.injuries = c.injuries.filter((i) => {
    if (i.turnsLeft > 0) return true;
    healed.push(i.name);
    return false;
  });
  if (healed.length > 0) out.push(entry(state.turn, '系统', `伤愈:${healed.join('、')}。`, 'normal'));

  // 门派
  out.push(...sectUpkeep(state));

  const d = derive(c);
  if (d.meritPerTurn !== 0) {
    c.merit = clamp(c.merit + d.meritPerTurn, -300, 600);
  }
  c.lifespan = lifespanFor(c);
  c.maxHp = d.maxHp;
  c.maxMana = d.maxMana;
  c.hp = clamp(c.hp + Math.round(d.maxHp * 0.06), 0, d.maxHp);
  c.mana = clamp(c.mana + Math.round(d.maxMana * 0.2), 0, d.maxMana);

  // 图录三卷齐备
  if (
    !c.flags.tuluAll &&
    countItem(c.inventory, 'tulu1') > 0 &&
    countItem(c.inventory, 'tulu2') > 0 &&
    countItem(c.inventory, 'tulu3') > 0
  ) {
    c.flags.tuluAll = true;
    out.push(entry(state.turn, '天机', '三卷俱在囊中。它们在夜里互相翻页。', 'calm'));
  }

  // 推演过深
  if (state.stats.divinations >= 25 && !c.flags.tianjiLost) {
    c.flags.tianjiLost = true;
    c.calamity.value = clamp(c.calamity.value + 8, 0, 100);
    out.push(
      entry(state.turn, '天机', '看得太多了。你开始记不清哪些是看过的,哪些是过过的。劫运 +8。', 'danger'),
    );
  }

  c.calamity.peak = Math.max(c.calamity.peak, c.calamity.value);
  state.stats.peakCalamity = Math.max(state.stats.peakCalamity, c.calamity.value);
  state.stats.peakFortune = Math.max(state.stats.peakFortune, c.fortune);
  state.stats.merit = c.merit;

  if (state.forecast && state.forecast.turn <= state.turn) state.forecast = null;

  state.turn += 1;
  state.stats.turns = state.turn;
  return out;
}

function needsUpkeep(state: GameState): boolean {
  return Boolean(state.character?.flags.pendingUpkeep);
}

function settleTurn(state: GameState): LogEntry[] {
  const c = state.character!;
  if (state.phase !== 'playing') return [];
  if (!c.flags.pendingUpkeep) return [];
  delete c.flags.pendingUpkeep;
  return runUpkeep(state);
}

// ============================================================================
// Command bodies
// ============================================================================

function seekDuel(state: GameState): LogEntry[] {
  const c = state.character!;
  const order = realmDef(c.realm.realm).order;
  const pool = enemiesForRealm(order);
  const idx = rollRange(state, 0, pool.length - 1, '斗法·寻敌');
  const enemy = pool[idx] ?? pool[0]!;
  return [
    entry(state.turn, '系统', '你出去找架打。这一行里,这是最快的生财之道。', 'normal'),
    ...startCombat(state, enemy.id, 'duel'),
  ];
}

function runBody(state: GameState, command: Command): LogEntry[] {
  switch (command.kind) {
    case '修炼':
      return cultivate(state);
    case '闭关':
      return seclude(state);
    case '突破':
      return attemptBreakthrough(state);
    case '探索':
      return explore(state);
    case '斗法':
      return seekDuel(state);
    case '化解劫运':
      return dissolveCalamity(state, command.mitigation);
    case '推演命数':
      return divine(state, command.depth);
    case '习功法':
      return learnTechnique(state, command.techniqueId);
    case '坊市买':
      return buyItem(state, command.itemId, command.count ?? 1);
    case '坊市卖':
      return sellItem(state, command.itemId, command.count ?? 1);
    case '用物':
      return useItem(state, command.itemId);
    case '装备':
      return equipItem(state, command.itemId);
    case '卸下':
      return unequipSlot(state, command.slot);
    case '入门派':
      return joinSect(state, command.sectId);
    case '离门':
      return leaveSect(state);
    case '战斗':
      return combatAction(state, command.action);
    case '战利':
      return resolveSpoils(state, command.choice);
    case '抉择':
      return chooseEventOption(state, command.choiceId);
    case '归隐':
      return [entry(state.turn, '图录', '你把账本合上了。', 'violet')];
  }
}

// ============================================================================
// The resolver
// ============================================================================

function rejectWith(state: GameState, reason: string): TurnResult {
  return { state, entries: [], rejected: reason };
}

export function execute(state: GameState, command: Command): TurnResult {
  if (state.ending) return rejectWith(state, '此生已终。图录不为死者添笔。');
  if (!state.character) return rejectWith(state, '尚未入世。');

  const allowed = PHASE_WHITELIST[state.phase];
  if (!allowed) return rejectWith(state, '此相位不受指令。');
  if (!allowed.has(command.kind)) {
    const hint =
      state.phase === 'combat'
        ? '斗法之中,唯战与走。'
        : state.phase === 'event'
          ? '事在眼前,先作抉择。'
          : '此令不在册。';
    return rejectWith(state, hint);
  }
  if (command.kind === '归隐') {
    const blocked = canRetire(state);
    if (blocked) return rejectWith(state, blocked);
  }

  const next = cloneState(state);
  const rollsBefore = next.rolls.length;
  const entries: LogEntry[] = [];
  const costsTurn = TURN_COSTING.has(command.kind);

  if (costsTurn) {
    next.character!.flags.pendingUpkeep = true;
    entries.push(...calamityPhase(next));
    // A 劫 that spawns a fight preempts whatever the player meant to do.
    if (next.phase === 'combat' || next.phase === 'event') {
      entries.push(entry(next.turn, '天机', '你原本的打算,今载是做不成了。', 'calm'));
    } else if (next.character!.hp > 0) {
      entries.push(...runBody(next, command));
    }
  } else {
    entries.push(...runBody(next, command));
  }

  entries.push(...settleTurn(next));

  const ending = checkEndings(next, command.kind === '归隐');
  if (ending) {
    next.ending = ending;
    next.phase = 'ended';
    next.combat = null;
    next.pendingEvent = null;
    entries.push(entry(next.turn, '图录', `【${ending.title}】${ending.summary}`, 'gold'));
  }

  const violation = checkInvariants(next);
  if (violation) {
    return {
      state,
      entries: [],
      rejected: `因果紊乱,此回合作废:${violation}`,
    };
  }

  const rollValues = next.rolls.slice(rollsBefore).map((r) => r.value);
  const chainEntry = buildChainEntry(next.auditHash, next.turn, commandLabel(command), rollValues);
  next.chain.push(chainEntry);
  next.auditHash = chainEntry.hash;
  if (next.chain.length > 400) next.chain.splice(0, next.chain.length - 400);

  pushLog(next, entries);
  return { state: next, entries };
}

// ============================================================================
// Read-only helpers for the UI
// ============================================================================

export function availableCommands(state: GameState): Command['kind'][] {
  const allowed = PHASE_WHITELIST[state.phase];
  return allowed ? [...allowed] : [];
}

export function isMidTurn(state: GameState): boolean {
  return needsUpkeep(state);
}

export function calamityDisplay(state: GameState): number {
  return round1(state.character?.calamity.value ?? 0);
}

/** The free-text guard, exposed so the UI can reject a wish before dispatch. */
export function guardFreeText(input: string): string | null {
  return isForbiddenWish(input) ? WISH_REJECTION : null;
}
