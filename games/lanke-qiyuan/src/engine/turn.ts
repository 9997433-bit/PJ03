/**
 * turn.ts — the single writer.
 *
 * Nothing outside this file may hand a mutated GameState back to the store.
 * The pipeline is always the same:
 *
 *   clone → 许愿 refusal → parse → phase guard → dispatch
 *        → (time verbs only) season upkeep → ending scan
 *        → hash chain → invariant check → commit or roll back
 *
 * An invariant violation discards the whole clone, so a bad content entry
 * costs the player nothing but a refusal line.
 */

import { chainAuditHash, checkInvariants, isForbiddenWish, WISH_REJECTION } from './audit';
import { attemptBreakthrough } from './breakthrough';
import { openMatch, playHand, resign } from './board';
import { commandKey, isFreeCommand, isTimeCommand, parseCommand } from './commands';
import { deriveMaxSpirit } from './attributes';
import { cultivate, settleStageUps, tickMoods } from './cultivation';
import { buy, sell } from './economy';
import { checkLivingEndings, chooseDeathEnding, finishGame, isPastLifespan } from './endings';
import { resolveChoice } from './events';
import { giftItem, useItem } from './inventory';
import { learnManual, sitForget, spectate, studyManual } from './insight';
import {
  addDust,
  EVENT_PENDING,
  LIFE_OVER,
  MATCH_PENDING,
  NOT_PLAYING,
  UNKNOWN_COMMAND,
  formatSeason,
  note,
  say,
} from './prose';
import { travel } from './travel';
import type { Command, GameState } from './types';
import { TURNS_PER_YEAR } from './types';

export type NoticeTone = 'info' | 'good' | 'bad';

export interface Notice {
  tone: NoticeTone;
  text: string;
}

export interface TurnResult {
  state: GameState;
  /** false when the command was refused and the state is unchanged */
  accepted: boolean;
  notices: Notice[];
  /** true when the season advanced */
  advanced: boolean;
  /** set when this turn closed the life */
  endingId: string | null;
  /** set when a 破境 was rolled — the modal listens for this */
  breakthrough?: { success: boolean; d100: number; chance: number; backlash: boolean };
}

function clone(state: GameState): GameState {
  const g = globalThis as { structuredClone?: <T>(v: T) => T };
  return g.structuredClone ? g.structuredClone(state) : (JSON.parse(JSON.stringify(state)) as GameState);
}

const info = (text: string): Notice => ({ tone: 'info', text });
const good = (text: string): Notice => ({ tone: 'good', text });
const bad = (text: string): Notice => ({ tone: 'bad', text });

function refuse(state: GameState, text: string): TurnResult {
  return { state, accepted: false, notices: [bad(text)], advanced: false, endingId: null };
}

// ============================================================================
// Entry point
// ============================================================================

export function executeCommand(prev: GameState, raw: string): TurnResult {
  if (isForbiddenWish(raw)) return refuse(prev, WISH_REJECTION);
  const cmd = parseCommand(raw);
  if (cmd.kind === 'unknown') return refuse(prev, UNKNOWN_COMMAND);
  return runCommand(prev, cmd);
}

export function runCommand(prev: GameState, cmd: Command): TurnResult {
  // ---- phase guards (checked against the untouched state) --------------
  if (prev.phase === 'ended') return refuse(prev, LIFE_OVER);
  if (prev.phase === 'creation') return refuse(prev, NOT_PLAYING);
  if (prev.pendingEvent && cmd.kind !== 'eventChoice' && !isFreeCommand(cmd)) {
    return refuse(prev, EVENT_PENDING);
  }
  if (prev.phase === 'match' && cmd.kind !== 'play' && cmd.kind !== 'resign' && !isFreeCommand(cmd)) {
    return refuse(prev, MATCH_PENDING);
  }
  if (prev.phase !== 'match' && (cmd.kind === 'play' || cmd.kind === 'resign')) {
    return refuse(prev, '此刻并无棋局。');
  }
  if (cmd.kind === 'eventChoice' && !prev.pendingEvent) {
    return refuse(prev, '眼下并无待决之事。');
  }

  const state = clone(prev);
  const rollsBefore = state.rolls.length;
  const notices: Notice[] = [];
  let endingId: string | null = null;
  let breakthrough: TurnResult['breakthrough'];
  let accepted = true;

  // ---- dispatch --------------------------------------------------------
  switch (cmd.kind) {
    case 'cultivate': {
      const out = cultivate(state);
      notices.push(good(`修为 +${out.gained}`));
      for (const up of out.stageUps) notices.push(good(`${up.from} → ${up.to}`));
      break;
    }
    case 'spectate': {
      const out = spectate(state);
      if (out.epiphany) notices.push(good(`顿悟!棋道 +${out.chessDaoGained}`));
      else if (out.success) notices.push(good(`棋道 +${out.chessDaoGained}`));
      else notices.push(info('未有所得'));
      break;
    }
    case 'sitForget': {
      const c = state.character;
      if (c) c.flags['坐忘次数'] = Number(c.flags['坐忘次数'] ?? 0) + 1;
      const out = sitForget(state);
      notices.push(good(`心神 +${out.spiritRestored} · 心尘 −${out.dustShed}`));
      break;
    }
    case 'travel': {
      const out = travel(state, cmd.placeId);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(info(out.message));
      if (out.event?.ending) endingId = out.event.ending;
      if (out.event?.match) {
        const opened = openMatch(state, out.event.match);
        if (!opened.ok) note(state, opened.message, 'muted');
      }
      break;
    }
    case 'breakthrough': {
      const out = attemptBreakthrough(state);
      if (!out.attempted) return refuse(prev, out.message);
      breakthrough = {
        success: out.success === true,
        d100: out.d100 ?? 0,
        chance: out.chance ?? 0,
        backlash: out.backlash === true,
      };
      notices.push(out.success ? good(out.message) : bad(out.message));
      if (out.ending) endingId = out.ending;
      break;
    }
    case 'match': {
      const opponentId = cmd.opponentId;
      if (!opponentId) return refuse(prev, '与谁对弈?请指名。');
      const out = openMatch(state, opponentId);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(info(out.message));
      break;
    }
    case 'play': {
      const out = playHand(state, cmd.style);
      if (!out.ok) return refuse(prev, out.message);
      if (out.outcome) {
        const r = out.outcome.result;
        notices.push(r === 'win' ? good(`胜 ${out.outcome.margin} 目`) : r === 'draw' ? info('和局') : bad(r === 'resigned' ? '投子认负' : `负 ${Math.abs(out.outcome.margin)} 目`));
        if (out.outcome.ending) endingId = out.outcome.ending;
      }
      break;
    }
    case 'resign': {
      const out = resign(state);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(bad('投子认负'));
      break;
    }
    case 'eventChoice': {
      const out = resolveChoice(state, cmd.choiceIndex);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(out.passed === false ? bad(out.message) : good(out.message));
      if (out.ending) endingId = out.ending;
      if (out.match) {
        const opened = openMatch(state, out.match);
        if (!opened.ok) note(state, opened.message, 'muted');
      }
      break;
    }
    case 'buy': {
      const out = buy(state, cmd.itemId, cmd.count ?? 1);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(good(out.message));
      break;
    }
    case 'sell': {
      const out = sell(state, cmd.itemId, cmd.count ?? 1);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(good(out.message));
      break;
    }
    case 'use': {
      const out = useItem(state, cmd.itemId);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(good(out.message));
      break;
    }
    case 'gift': {
      const out = giftItem(state, cmd.spiritId, cmd.itemId);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(good(out.message));
      break;
    }
    case 'study': {
      const out = studyManual(state, cmd.manualId);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(good(out.message));
      break;
    }
    case 'learn': {
      const out = learnManual(state, cmd.manualId);
      if (!out.ok) return refuse(prev, out.message);
      notices.push(good(out.message));
      break;
    }
    case 'market':
    case 'panel':
    case 'satchel':
    case 'register':
    case 'audit': {
      // Free looks are rendered by the UI from state; nothing to write.
      accepted = true;
      break;
    }
    default: {
      accepted = false;
      break;
    }
  }

  if (!accepted) return refuse(prev, UNKNOWN_COMMAND);

  // ---- season upkeep ---------------------------------------------------
  const advanced = isTimeCommand(cmd) && state.phase !== 'ended';
  if (advanced) {
    advanceSeason(state);
  }

  // ---- ending scan -----------------------------------------------------
  if (!endingId && state.phase !== 'ended') {
    endingId = checkLivingEndings(state);
  }
  if (!endingId && isPastLifespan(state)) {
    say(state, '汝算了算年岁,发现该走了。', 'dusk');
    endingId = chooseDeathEnding(state);
  }
  if (endingId) finishGame(state, endingId);

  // ---- audit chain -----------------------------------------------------
  const newRolls = state.rolls.slice(rollsBefore).map((r) => r.value);
  state.auditHash = chainAuditHash(prev.auditHash, state.turn, commandKey(cmd), newRolls);

  // ---- invariants ------------------------------------------------------
  const violation = checkInvariants(state);
  if (violation) {
    return {
      state: prev,
      accepted: false,
      notices: [bad(`天道不容:${violation}。此手作废。`)],
      advanced: false,
      endingId: null,
    };
  }

  return {
    state,
    accepted: true,
    notices,
    advanced,
    endingId: endingId ?? null,
    ...(breakthrough ? { breakthrough } : {}),
  };
}

// ============================================================================
// Season upkeep
// ============================================================================

function advanceSeason(state: GameState): void {
  const c = state.character;
  state.turn += 1;
  if (!c) return;

  tickMoods(state);

  // One year per four seasons.
  if ((state.turn - 1) % TURNS_PER_YEAR === 0) {
    c.age += 1;
    if (c.age % 10 === 0) note(state, `${c.age} 岁了。`, 'muted');
  }

  // Idleness gathers dust; a very dusty mind gathers it faster.
  addDust(c, c.dust >= 60 ? 2 : 1, c.flags['静者'] === true);

  // 心神 recovers a little on its own, unless the mind is already empty.
  if (c.spirit <= 0) {
    c.flags['枯坐'] = Number(c.flags['枯坐'] ?? 0) + 1;
    if (Number(c.flags['枯坐']) === 3) {
      say(state, '汝已经很久没有真正睡着过了。手抖得握不住子。', 'dusk');
    }
  } else {
    c.flags['枯坐'] = 0;
  }

  c.maxSpirit = deriveMaxSpirit(c.realm.realm, c.attributes);
  if (c.spirit > c.maxSpirit) c.spirit = c.maxSpirit;
  settleStageUps(state);

  if ((state.turn - 1) % TURNS_PER_YEAR === 0) {
    note(state, `——${formatSeason(state.turn)}`, 'muted');
  }
}

// ============================================================================
// Free-look view builders (pure reads, used by the UI and the tests)
// ============================================================================

export function seasonLabel(state: GameState): string {
  return formatSeason(state.turn);
}
