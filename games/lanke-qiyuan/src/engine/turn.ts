/**
 * turn.ts — the SINGLE WRITER.
 *
 * `executeCommand` is the only function permitted to produce a new GameState
 * during play. Pipeline:
 *
 *   phase guards → dispatch → advance the season (for time commands) →
 *   life-end check → audit hash chain → invariants
 *
 * An invariant violation rolls the entire turn back to the previous state, so
 * a bad rule can cost the player a season but can never corrupt a life.
 */

import type { Command, GameState } from './types';
import { buildAuditTable, chainAuditHash, checkInvariants } from './audit';
import { LIFE_OVER, MATCH_PENDING, NOT_PLAYING, UNKNOWN_COMMAND, formatRealm, note, say } from './prose';
import { attemptBreakthrough } from './breakthrough';
import { cultivate, sitForget, spectate } from './cultivation';
import { playHand, resignMatch, startMatch } from './chess';
import { resolveEventChoice, travel } from './travel';
import {
  buyItem,
  giftItem,
  learnManual,
  sellItem,
  studyManual,
  useItem,
  viewSatchel,
  visitMarket,
} from './market';
import { advanceSeason, checkLifeEnd, endLife } from './lifecycle';
import { getOrigin } from '@/data/origins';
import { getPlace } from '@/data/places';
import { getManual } from '@/data/manuals';
import { ATTRIBUTE_LABELS } from './types';

/** Commands that consume a season. */
const TIME_COMMANDS = new Set<Command['kind']>([
  'cultivate',
  'travel',
  'spectate',
  'sitForget',
  'market',
  'breakthrough',
]);

/** Free looks permitted while an event awaits a choice. */
const ALLOWED_WHEN_PENDING = new Set<Command['kind']>([
  'eventChoice',
  'panel',
  'satchel',
  'register',
  'audit',
]);

/** Commands permitted mid-match. */
const ALLOWED_IN_MATCH = new Set<Command['kind']>([
  'play',
  'resign',
  'panel',
  'satchel',
  'register',
  'audit',
]);

/** A stable string key per command, for the hash chain. */
export function commandKey(cmd: Command): string {
  switch (cmd.kind) {
    case 'travel':
      return `travel:${cmd.placeId ?? '-'}`;
    case 'match':
      return `match:${cmd.opponentId ?? '-'}`;
    case 'play':
      return `play:${cmd.style}`;
    case 'buy':
      return `buy:${cmd.itemId}x${cmd.count ?? 1}`;
    case 'sell':
      return `sell:${cmd.itemId}x${cmd.count ?? 1}`;
    case 'use':
      return `use:${cmd.itemId}`;
    case 'gift':
      return `gift:${cmd.spiritId}:${cmd.itemId}`;
    case 'study':
      return `study:${cmd.manualId}`;
    case 'learn':
      return `learn:${cmd.manualId}`;
    case 'eventChoice':
      return `choice:${cmd.choiceIndex}`;
    case 'unknown':
      return 'unknown';
    default:
      return cmd.kind;
  }
}

function isEnded(state: GameState): boolean {
  return state.phase === 'ended';
}

export function executeCommand(prev: GameState, cmd: Command): GameState {
  const state = structuredClone(prev);

  // ---- phase guards ----
  if (state.phase === 'ended') {
    note(state, LIFE_OVER, 'muted');
    return state;
  }
  if (state.phase === 'creation' || !state.character) {
    note(state, NOT_PLAYING, 'muted');
    return state;
  }
  if (state.pendingEvent && !ALLOWED_WHEN_PENDING.has(cmd.kind)) {
    note(state, '眼下之事未了,须先抉择。', 'dusk');
    return state;
  }
  if (state.phase === 'match' && !ALLOWED_IN_MATCH.has(cmd.kind)) {
    note(state, MATCH_PENDING, 'dusk');
    return state;
  }
  if (state.phase !== 'match' && (cmd.kind === 'play' || cmd.kind === 'resign')) {
    note(state, '枰上无局,汝要与谁手谈?', 'dusk');
    return state;
  }

  const prevRollSeq = prev.rollSeq;

  // ---- dispatch ----
  switch (cmd.kind) {
    case 'cultivate':
      cultivate(state);
      break;
    case 'travel':
      travel(state, cmd.placeId);
      break;
    case 'spectate':
      spectate(state);
      break;
    case 'sitForget':
      sitForget(state);
      break;
    case 'match':
      startMatch(state, cmd.opponentId);
      break;
    case 'play':
      playHand(state, cmd.style);
      break;
    case 'resign':
      resignMatch(state);
      break;
    case 'market':
      visitMarket(state);
      break;
    case 'buy':
      buyItem(state, cmd.itemId, cmd.count);
      break;
    case 'sell':
      sellItem(state, cmd.itemId, cmd.count);
      break;
    case 'use':
      useItem(state, cmd.itemId);
      break;
    case 'gift':
      giftItem(state, cmd.spiritId, cmd.itemId);
      break;
    case 'study':
      studyManual(state, cmd.manualId);
      break;
    case 'learn':
      learnManual(state, cmd.manualId);
      break;
    case 'breakthrough':
      attemptBreakthrough(state);
      break;
    case 'eventChoice':
      resolveEventChoice(state, cmd.choiceIndex);
      break;
    case 'panel':
      viewPanel(state);
      break;
    case 'satchel':
      viewSatchel(state);
      break;
    case 'register':
      viewRegister(state);
      break;
    case 'audit':
      viewAudit(state);
      break;
    case 'unknown':
      note(state, UNKNOWN_COMMAND, 'dusk');
      break;
  }

  // ---- the season turns ----
  // A match opened this turn holds time still until the last stone is played.
  if (TIME_COMMANDS.has(cmd.kind) && !isEnded(state) && state.phase !== 'match') {
    advanceSeason(state);
  }

  // ---- does the life close here? ----
  if (!isEnded(state)) {
    const pending = state.pendingEnding;
    state.pendingEnding = undefined;
    const endingId = pending ?? checkLifeEnd(state);
    if (endingId) endLife(state, endingId);
  }

  // ---- audit hash chain ----
  const rollValues: number[] = [];
  for (const r of state.rolls) {
    if (r.id > prevRollSeq) rollValues.push(r.value);
  }
  state.auditHash = chainAuditHash(prev.auditHash, state.turn, commandKey(cmd), rollValues);

  // ---- invariants: a violation rolls the turn back ----
  const violation = checkInvariants(state);
  if (violation) {
    const rollback = structuredClone(prev);
    note(rollback, `天道回溯——此番因果不谐,尽数作废。(${violation})`, 'dusk');
    return rollback;
  }

  return state;
}

// ============================================================================
// Free looks
// ============================================================================

/** 面板 — 缘法 must NEVER appear here. */
function viewPanel(state: GameState): void {
  const c = state.character!;
  const origin = getOrigin(c.originId);
  const place = getPlace(state.placeId);
  const manual = c.studyingId ? getManual(c.studyingId) : null;
  const a = c.attributes;
  const moods = c.moods.length > 0
    ? c.moods.map((m) => `${m.name}(余${m.turnsLeft < 0 ? '∞' : m.turnsLeft}季)`).join('、')
    : '无';

  note(
    state,
    [
      '——【命枰】——',
      `${c.name} · 道号${c.courtesy} · ${origin?.name ?? ''}`,
      `境界:${formatRealm(c.realm)}(${c.realm.exp}/${c.realm.expNeeded})`,
      `年岁:${c.age}/${c.lifespan} · 现在:${place?.name ?? '—'}`,
      `心神:${c.spirit}/${c.maxSpirit} · 心尘:${c.dust}/100 · 银钱:${c.coin}`,
      `棋道:${c.chessDao}/100 · 悟:${c.insight}`,
      `${ATTRIBUTE_LABELS.xinJing}${a.xinJing} · ${ATTRIBUTE_LABELS.wuXing}${a.wuXing} · ${ATTRIBUTE_LABELS.caiXue}${a.caiXue} · ${ATTRIBUTE_LABELS.qiYun}${a.qiYun}`,
      `棋缘:${c.chessAffinity.grade}【${c.chessAffinity.affinities.join('·')}】×${c.chessAffinity.speedMultiplier}`,
      `所参:${manual ? manual.name : '无'} · 已悟 ${c.manuals.length} 部`,
      `心境:${moods}`,
    ].join('\n'),
  );
}

/** 精怪录 — only beings you have actually met. */
function viewRegister(state: GameState): void {
  const met = Object.values(state.spirits).filter((s) => s.met);
  if (met.length === 0) {
    note(state, '精怪录尚是白纸。汝还没遇见过谁。');
    return;
  }
  const lines = met
    .map((s) => `  【${s.name}·${s.title}】好感 ${s.favor} — ${s.desc}`)
    .join('\n');
  note(state, `——【精怪录】——(共 ${met.length} 位)\n${lines}`);
}

/** 审计 — every roll, with the sealed ones redacted. */
function viewAudit(state: GameState): void {
  const recent = buildAuditTable(state.rolls.slice(-30));
  const lines = recent
    .map((r) => `  ${r.recordId} 第${r.turn}季 ${r.die}=${r.display} · ${r.reason}`)
    .join('\n');
  note(
    state,
    `——【天道棋录】——(共掷 ${state.stats.totalRolls} 次,校验链 ${state.auditHash.slice(0, 8)}…)\n` +
      `${lines}\n(封=缘法暗掷,只证其有,不示其值)`,
  );
}

/** Convenience for the store: narrate the opening season. */
export function greet(state: GameState): void {
  const place = getPlace(state.placeId);
  say(state, place?.desc ?? '');
}
