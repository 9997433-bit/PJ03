/**
 * turn.ts — the SINGLE WRITER (anti-cheat layer 8).
 *
 * The only function allowed to produce a new GameState during play is
 * executeCommand. Pipeline:
 *   validate → dispatch to module → advance time (time commands) →
 *   per-turn event roll → quest scan → audit hash → invariant check
 *   (violation ⇒ the whole turn is rolled back).
 */

import type { Command, GameState } from './types';
import { chainAuditHash, checkInvariants } from './audit';
import { commandKey, looksLikeWish } from './commands';
import { attemptBreakthrough } from './breakthrough';
import { cultivate } from './cultivation';
import { explore } from './exploration';
import { visitMarket, buyItem, sellItem } from './economy';
import { viewAlchemy, craftPill } from './alchemy';
import { useItem as consumeItem, equipItem } from './inventory';
import { giftItem } from './npc';
import { combatTurn } from './combat';
import { resolveEventChoice, rollTurnEvent } from './events';
import { checkQuestProgress, chooseQuestOption, viewQuests } from './quests';
import { advanceAge, checkAscension, checkDeath } from './lifecycle';
import {
  NO_WISHING,
  REST_LINES,
  UNKNOWN_COMMAND,
  ensureStats,
  formatRealm,
  pick,
  say,
  sys,
} from './prose';
import { getItem, getOrigin, getTechnique } from '@/data';

/** phase check through a function call, immune to control-flow narrowing */
function isEnded(state: GameState): boolean {
  return state.phase === 'ended';
}

/**
 * One season passes: statuses tick (with per-turn hp drift), injuries count
 * down and heal, a sliver of natural recovery, then age / 寿元 / ascension.
 */
function advanceTime(state: GameState): void {
  const c = state.character;
  if (!c || isEnded(state)) return;
  state.turn += 1;

  // status effects tick
  const kept: NonNullable<typeof c.statusEffects> = [];
  for (const s of c.statusEffects ?? []) {
    if (s.hpPerTurn) c.hp = Math.max(0, Math.min(c.maxHp, c.hp + s.hpPerTurn));
    if (s.turnsLeft > 0) s.turnsLeft -= 1;
    if (s.turnsLeft === 0) {
      sys(state, `状态【${s.name}】已然消散。`, 'muted');
      continue;
    }
    kept.push(s);
  }
  c.statusEffects = kept;

  // injuries tick (permanent injuries carry turnsLeft −1)
  const healed: string[] = [];
  c.injuries = c.injuries
    .map((inj) => (inj.turnsLeft < 0 ? inj : { ...inj, turnsLeft: inj.turnsLeft - 1 }))
    .filter((inj) => {
      if (inj.turnsLeft === 0) {
        healed.push(inj.name);
        return false;
      }
      return true;
    });
  for (const name of healed) sys(state, `旧伤渐愈:${name}已无碍。`, 'jade');

  // a sliver of natural recovery each season
  if (c.hp > 0 && c.hp < c.maxHp) {
    c.hp = Math.min(c.maxHp, c.hp + Math.max(1, Math.round(c.maxHp * 0.05)));
  }

  if (checkDeath(state)) return;
  advanceAge(state);
  if (!isEnded(state)) checkAscension(state);
}

/** 静养 — heal 30% max hp and hasten the worst recovering injury */
function rest(state: GameState): void {
  const c = state.character;
  if (!c) return;
  say(state, pick(state, REST_LINES));
  const heal = Math.max(5, Math.round(c.maxHp * 0.3));
  const before = c.hp;
  c.hp = Math.min(c.maxHp, c.hp + heal);
  if (c.hp > before) sys(state, `气血 +${c.hp - before}(${c.hp}/${c.maxHp})。`, 'jade');
  const worst = c.injuries.filter((i) => i.turnsLeft > 1).sort((a, b) => b.turnsLeft - a.turnsLeft)[0];
  if (worst) {
    worst.turnsLeft = Math.max(1, Math.ceil(worst.turnsLeft / 2));
    sys(state, `将养得法,【${worst.name}】愈期缩短(余${worst.turnsLeft}季)。`, 'jade');
  }
}

/** commands that consume a season (and thus trigger the event roll) */
const TIME_COMMANDS = new Set<Command['kind']>([
  'cultivate',
  'breakthrough',
  'explore',
  'market',
  'craft',
  'rest',
]);

/** free looks allowed while an event choice is pending */
const ALLOWED_WHEN_PENDING = new Set<Command['kind']>([
  'eventChoice',
  'panel',
  'inventory',
  'quests',
  'audit',
  'save',
]);

/** commands allowed mid-combat */
const ALLOWED_IN_COMBAT = new Set<Command['kind']>(['combat', 'panel', 'inventory', 'audit', 'save']);

export function executeCommand(prev: GameState, cmd: Command): GameState {
  const state = structuredClone(prev);

  // ---- phase guards ----
  if (state.phase === 'ended') {
    sys(state, '此生已了,青史合卷。唯「重开」可再入轮回。');
    return state;
  }
  if (state.phase === 'creation' || !state.character) {
    sys(state, '命格未定,不可妄动。');
    return state;
  }
  if (state.pendingEvent && !ALLOWED_WHEN_PENDING.has(cmd.kind)) {
    sys(state, '眼下之事未了,须先抉择。(输入序号)');
    return state;
  }
  if (state.phase === 'combat' && !ALLOWED_IN_COMBAT.has(cmd.kind)) {
    sys(state, '刀兵未歇,不容分神。(强攻 / 游斗 / 设伏 / 术法 / 服药 / 遁走)');
    return state;
  }
  if (state.phase !== 'combat' && cmd.kind === 'combat') {
    sys(state, '四下无敌手,汝欲与何人过招?');
    return state;
  }

  const prevRollSeq = prev.rollSeq ?? 0;

  // ---- dispatch ----
  switch (cmd.kind) {
    case 'cultivate':
      cultivate(state);
      break;
    case 'breakthrough':
      attemptBreakthrough(state);
      break;
    case 'explore':
      explore(state, cmd.locationId);
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
    case 'alchemy':
      viewAlchemy(state);
      break;
    case 'craft':
      craftPill(state, cmd.recipeId);
      break;
    case 'use':
      consumeItem(state, cmd.item);
      break;
    case 'equip':
      equipItem(state, cmd.item);
      break;
    case 'gift':
      giftItem(state, cmd.npc, cmd.item);
      break;
    case 'panel':
      viewPanel(state);
      break;
    case 'inventory':
      viewInventory(state);
      break;
    case 'quests':
      viewQuests(state);
      break;
    case 'questChoice':
      chooseQuestOption(state, cmd.questId, cmd.choiceIndex);
      break;
    case 'eventChoice':
      resolveEventChoice(state, cmd.choiceIndex);
      break;
    case 'audit':
      viewAudit(state);
      break;
    case 'save':
      sys(state, '天道已录此卷。(每回合亦自动存档)', 'jade');
      break;
    case 'combat':
      combatTurn(state, cmd.tactic, cmd.item);
      break;
    case 'rest':
      rest(state);
      break;
    case 'unknown':
      sys(state, looksLikeWish(cmd.raw) ? NO_WISHING : UNKNOWN_COMMAND);
      break;
  }

  // ---- time & the world breathing ----
  if (TIME_COMMANDS.has(cmd.kind) && !isEnded(state)) {
    advanceTime(state);
    if (state.phase === 'playing' && !state.pendingEvent) {
      rollTurnEvent(state);
    }
  }

  // ---- quest scan ----
  if (!isEnded(state)) {
    checkQuestProgress(state);
  }

  // ---- audit hash chain (layer 5) ----
  const rollValues: number[] = [];
  for (const r of state.rolls) {
    if (r.id > prevRollSeq) rollValues.push(r.value);
  }
  state.auditHash = chainAuditHash(prev.auditHash, state.turn, commandKey(cmd), rollValues);

  // ---- invariants (layer 7): violation rolls the turn back ----
  const violation = checkInvariants(state);
  if (violation) {
    const rollback = structuredClone(prev);
    sys(rollback, `天道回溯——此番因果不谐,尽数作废。(${violation})`, 'danger');
    return rollback;
  }

  return state;
}

// ============================================================================
// Free-look views (面板 / 背包 / 审计) — text renderings for the log
// ============================================================================

/** 面板 — anti-cheat layer 3: 机缘 must NEVER appear here */
function viewPanel(state: GameState): void {
  const c = state.character!;
  const origin = getOrigin(c.originId);
  const technique = c.techniqueId ? getTechnique(c.techniqueId) : null;
  const weapon = c.equipped.weapon ? getItem(c.equipped.weapon) : null;
  const armor = c.equipped.armor ? getItem(c.equipped.armor) : null;
  const a = c.attributes;

  const injuries =
    c.injuries.length > 0
      ? c.injuries.map((i) => `${i.name}(余${i.turnsLeft === -1 ? '∞' : i.turnsLeft}季)`).join('、')
      : '无';
  const statuses =
    (c.statusEffects ?? []).length > 0
      ? c.statusEffects!.map((s) => `${s.name}(余${s.turnsLeft === -1 ? '∞' : s.turnsLeft}季)`).join('、')
      : '无';

  sys(
    state,
    [
      `——【命盘】——`,
      `${c.name} · ${c.gender} · ${origin?.name ?? ''}`,
      `境界:${formatRealm(c.realm)}(${c.realm.exp}/${c.realm.expNeeded})`,
      `年岁:${c.age}/${c.lifespan} · 气血:${c.hp}/${c.maxHp} · 灵石:${c.spiritStones}`,
      `根骨${a.genGu} · 悟性${a.wuXing} · 心性${a.xinXing} · 气运${a.qiYun}`,
      `灵根:${c.spiritRoot.grade}·${c.spiritRoot.elements.join('')}(×${c.spiritRoot.speedMultiplier})`,
      `功法:${technique ? `《${technique.name}》(${technique.grade})` : '无'}`,
      `兵刃:${weapon?.name ?? '赤手'} · 甲胄:${armor?.name ?? '布衣'}`,
      `伤势:${injuries} · 状态:${statuses}`,
      (c.breakthroughBonus ?? 0) > 0 ? `丹力蓄势:下次突破 +${c.breakthroughBonus}%` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

function viewInventory(state: GameState): void {
  const c = state.character!;
  if (c.inventory.length === 0) {
    sys(state, `储物袋空空如也,唯余${c.spiritStones}枚灵石。`);
    return;
  }
  const lines = c.inventory
    .map((s) => {
      const def = getItem(s.itemId);
      return `  【${def?.name ?? s.itemId}】×${s.count} — ${def?.desc ?? ''}`;
    })
    .join('\n');
  sys(state, `——【储物袋】——(灵石${c.spiritStones})\n${lines}\n(使用 物品名 / 装备 物品名)`);
}

/** 审计 — anti-cheat layer 9: the player can verify every roll */
function viewAudit(state: GameState): void {
  const recent = state.rolls.slice(-30);
  const lines = recent
    .map((r) => {
      const value = r.sealed ? '【封】' : String(r.value);
      return `  #${r.id} 回合${r.turn} ${r.die}=${value} · ${r.reason}`;
    })
    .join('\n');
  sys(
    state,
    `——【天道审计】——(共掷${ensureStats(state).totalRolls}次,校验链 ${state.auditHash.slice(0, 8)}…)\n` +
      `${lines}\n(封=天机暗掷,只证其有,不示其值)`,
  );
}
