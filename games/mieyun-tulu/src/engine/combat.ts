/**
 * combat.ts — 斗法
 *
 * Four tactics, and they are genuinely different resources: 出手 spends
 * nothing, 术法 spends 法力 for reach, 用符 spends a consumable for a burst
 * that ignores how weak you are, 遁走 spends the fight itself.
 *
 * The part that belongs to this game and no other is what happens *after* a
 * win. A defeated cultivator still has a 气运 column behind them, and the
 * player must decide what to do with it:
 *
 *   灭运 — take it. Large 气运 gain, large 劫运 deposit, 功德 loss.
 *   饶恕 — leave them everything, including their belongings. 功德 only.
 *   搜刮 — take the goods, leave the column. Stones and loot.
 *
 * Every run is a ledger of those three buttons, and the endings read it back.
 */

import { enemyById } from '@/data/enemies';
import { itemById } from '@/data/items';
import { realmDef } from '@/data/realms';
import { derive } from './derived';
import { creditDeed } from './progression';
import { roll, rollRange } from './rng';
import type {
  CombatAction,
  EnemyDef,
  GameState,
  LogEntry,
  SpoilsChoice,
} from './types';
import { addItem, adjustCalamity, clamp, countItem, entry, removeItem } from './util';

export const COMBAT_ACTIONS: readonly CombatAction[] = ['出手', '术法', '用符', '遁走'];

export const ACTION_HINTS: Record<CombatAction, string> = {
  出手: '以体魄近身。不耗法力,伤害稳定。',
  术法: '引神魂为刃。耗法力,威能更高。',
  用符: '燃一张五雷符。无视自身强弱,直取其身。',
  遁走: '认输走人。以机变定成败,劫数所化者不可遁。',
};

export function manaCostOf(state: GameState): number {
  const order = realmDef(state.character!.realm.realm).order;
  return 12 + order * 8;
}

export function fleeChance(state: GameState, enemy: EnemyDef): number {
  const d = derive(state.character!);
  return clamp(Math.round(42 + d.fleeBonus * 2 - enemy.realmOrder * 7), 5, 95);
}

export function startCombat(
  state: GameState,
  enemyId: string,
  source: 'event' | 'explore' | 'calamity' | 'duel',
): LogEntry[] {
  const enemy = enemyById(enemyId);
  if (!enemy) return [entry(state.turn, '系统', '对手不见了。', 'normal')];
  state.combat = {
    enemyId: enemy.id,
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    round: 1,
    log: [enemy.taunt],
    over: false,
    awaitingSpoils: false,
    source,
    vent: 0,
  };
  state.phase = 'combat';
  return [entry(state.turn, '斗法', `${enemy.name}(${enemy.identity})拦路。${enemy.taunt}`, 'danger')];
}

function variance(state: GameState, reason: string): number {
  return rollRange(state, 82, 122, reason) / 100;
}

function enemyStrike(state: GameState, enemy: EnemyDef): LogEntry[] {
  const c = state.character!;
  const d = derive(c);
  const raw = enemy.power * variance(state, '斗法·敌手') - d.defense * 0.7;
  const dmg = Math.max(1, Math.round(raw));
  c.hp = Math.max(0, c.hp - dmg);
  state.combat!.log.push(`${enemy.name}还手,气血 −${dmg}。`);
  return [entry(state.turn, '斗法', `${enemy.name}还手:气血 −${dmg}(余 ${c.hp}/${c.maxHp})。`, 'danger')];
}

function finishWin(state: GameState, enemy: EnemyDef): LogEntry[] {
  const combat = state.combat!;
  combat.over = true;
  combat.result = 'win';
  combat.awaitingSpoils = !enemy.isCalamity;
  state.stats.battlesWon += 1;
  const out = [entry(state.turn, '斗法', `${enemy.name}倒下了。`, 'gold')];

  if (enemy.isCalamity) {
    const c = state.character!;
    const vent = combat.vent > 0 ? combat.vent : 20;
    adjustCalamity(state, -vent);
    c.calamity.survived += 1;
    state.stats.calamitiesSurvived += 1;
    delete c.flags.pendingStrike;
    const expGain = Math.round(c.realm.expNeeded * 0.12);
    c.realm.exp = Math.min(c.realm.expNeeded, c.realm.exp + expGain);
    out.push(
      entry(state.turn, '劫', `劫相溃散。劫运 −${vent},历劫所得修为 +${expGain}。`, 'violet'),
    );
    out.push(...creditDeed(state, 'calamity'));
    state.phase = 'playing';
    state.combat = null;
  } else {
    // A duel won on the sect's behalf. Beating your betters counts for more.
    out.push(...creditDeed(state, 'duel', 1 + enemy.realmOrder * 0.5));
  }
  return out;
}

function finishLoss(state: GameState, enemy: EnemyDef): LogEntry[] {
  const c = state.character!;
  const combat = state.combat!;
  combat.over = true;
  const out: LogEntry[] = [];

  if (enemy.isCalamity) {
    combat.result = 'dead';
    c.flags.slainBy = enemy.id;
    out.push(entry(state.turn, '劫', `${enemy.name}没有留手的道理。`, 'danger'));
    return out;
  }

  const d100 = roll(state, 'D100', '败北·生死');
  if (d100 <= 55) {
    combat.result = 'lose';
    const lost = Math.round(c.spiritStones * 0.5);
    c.spiritStones -= lost;
    c.hp = 1;
    adjustCalamity(state, 2);
    out.push(
      entry(
        state.turn,
        '斗法',
        `你倒下了,但对方只取了财物(D100=${d100} ≤ 55):灵石 −${lost}。`,
        'danger',
      ),
    );
    state.phase = 'playing';
    state.combat = null;
  } else {
    combat.result = 'dead';
    c.hp = 0;
    c.flags.slainBy = enemy.id;
    out.push(entry(state.turn, '斗法', `对方没有停手的意思(D100=${d100} > 55)。`, 'danger'));
  }
  return out;
}

export function combatAction(state: GameState, action: CombatAction): LogEntry[] {
  const combat = state.combat;
  const c = state.character;
  if (!combat || !c || combat.over) {
    return [entry(state.turn, '系统', '此刻无战可斗。', 'normal')];
  }
  const enemy = enemyById(combat.enemyId);
  if (!enemy) return [entry(state.turn, '系统', '对手不见了。', 'normal')];

  const d = derive(c);
  const out: LogEntry[] = [];
  combat.round += 1;

  if (action === '遁走') {
    if (!enemy.fleeable) {
      return [entry(state.turn, '斗法', '此物非人,遁无可遁。', 'danger')];
    }
    const hasTalisman = countItem(c.inventory, 'dundifu') > 0;
    if (hasTalisman) {
      removeItem(c.inventory, 'dundifu', 1);
      combat.over = true;
      combat.result = 'fled';
      state.phase = 'playing';
      state.combat = null;
      return [entry(state.turn, '斗法', '遁地符化作黄光。你入地三尺,再出来时已在十里外。', 'normal')];
    }
    const target = fleeChance(state, enemy);
    const d100 = roll(state, 'D100', '斗法·遁走');
    out.push(entry(state.turn, '斗法', `遁走:需 D100 ≤ ${target},掷得 ${d100}。`, 'normal'));
    if (d100 <= target) {
      combat.over = true;
      combat.result = 'fled';
      c.fortune = clamp(c.fortune - 2, 0, 100);
      state.phase = 'playing';
      state.combat = null;
      out.push(entry(state.turn, '斗法', '你走了。走得不体面,但是走了。气运 −2。', 'normal'));
      return out;
    }
    out.push(entry(state.turn, '斗法', '走不掉。', 'danger'));
    out.push(...enemyStrike(state, enemy));
  } else {
    let dmg = 0;
    if (action === '出手') {
      dmg = Math.max(1, Math.round(d.power * variance(state, '斗法·出手') - enemy.defense * 0.6));
      out.push(entry(state.turn, '斗法', `你近身而上:伤 ${dmg}。`, 'normal'));
    } else if (action === '术法') {
      const cost = manaCostOf(state);
      if (c.mana < cost) {
        return [entry(state.turn, '斗法', `法力不足(需 ${cost})。`, 'danger')];
      }
      c.mana -= cost;
      const magic = d.power * 0.75 + c.attributes.shenHun * 5 + realmDef(c.realm.realm).order * 24;
      dmg = Math.max(1, Math.round(magic * variance(state, '斗法·术法') - enemy.defense * 0.3));
      out.push(entry(state.turn, '斗法', `术法及体:伤 ${dmg}(法力 −${cost})。`, 'violet'));
    } else {
      if (countItem(c.inventory, 'wuleifu') < 1) {
        return [entry(state.turn, '斗法', '囊中无符。', 'danger')];
      }
      removeItem(c.inventory, 'wuleifu', 1);
      const fu = itemById('wuleifu')!;
      const order = realmDef(c.realm.realm).order;
      dmg = Math.max(
        1,
        Math.round((fu.power ?? 55) * (1 + order * 0.85) * variance(state, '斗法·用符')),
      );
      out.push(entry(state.turn, '斗法', `五雷符炸开:伤 ${dmg}。`, 'violet'));
    }

    combat.enemyHp = Math.max(0, combat.enemyHp - dmg);
    combat.log.push(`${action} → ${dmg}`);
    if (combat.enemyHp <= 0) {
      out.push(...finishWin(state, enemy));
      return out;
    }
    out.push(...enemyStrike(state, enemy));
  }

  if (c.hp <= 0) out.push(...finishLoss(state, enemy));
  return out;
}

// ============================================================================
// 战后
// ============================================================================

export interface SpoilsOption {
  id: SpoilsChoice;
  label: string;
  detail: string;
}

export function spoilsOptions(state: GameState): SpoilsOption[] {
  const combat = state.combat;
  const enemy = combat ? enemyById(combat.enemyId) : null;
  if (!enemy) return [];
  const d = derive(state.character!);
  const fortune = Math.round(enemy.fortune * d.extinguishMult);
  return [
    {
      id: '灭运',
      label: '灭运',
      detail: `夺其气运 +${fortune},劫运 +${Math.round(enemy.fortune * 0.55)},功德 −${enemy.merit}`,
    },
    { id: '饶恕', label: '饶恕', detail: `功德 +${enemy.merit},劫运 −2,不取分文` },
    { id: '搜刮', label: '搜刮', detail: '取其财物与遗落之器,气运功德两不动' },
  ];
}

export function resolveSpoils(state: GameState, choice: SpoilsChoice): LogEntry[] {
  const combat = state.combat;
  const c = state.character!;
  if (!combat || !combat.awaitingSpoils) {
    return [entry(state.turn, '系统', '尸骨已寒,无可处置。', 'normal')];
  }
  const enemy = enemyById(combat.enemyId);
  if (!enemy) return [entry(state.turn, '系统', '对手不见了。', 'normal')];

  const d = derive(c);
  const out: LogEntry[] = [];

  if (choice === '灭运') {
    const gain = Math.round(enemy.fortune * d.extinguishMult * d.fortuneGainMult);
    const cost = Math.round(enemy.fortune * 0.55);
    c.fortune = clamp(c.fortune + gain, 0, 100);
    adjustCalamity(state, cost);
    c.merit -= enemy.merit;
    c.extinguishCount += 1;
    state.stats.extinguished += 1;
    const stones = Math.round(rollRange(state, enemy.stones[0], enemy.stones[1], '战利·灵石') * 0.5);
    c.spiritStones += stones;
    state.stats.stonesEarned += stones;
    out.push(
      entry(
        state.turn,
        '图录',
        `你在他身后那根柱子上落了一笔。气运 +${gain},劫运 +${cost},功德 −${enemy.merit},拾灵石 ${stones}。`,
        'violet',
      ),
    );
    out.push(...creditDeed(state, 'extinguish'));
  } else if (choice === '饶恕') {
    c.merit += enemy.merit;
    adjustCalamity(state, -2);
    c.sparedCount += 1;
    out.push(
      entry(state.turn, '系统', `你收了手。功德 +${enemy.merit},劫运 −2,分文未取。`, 'calm'),
    );
    out.push(...creditDeed(state, 'spare'));
  } else {
    const stones = rollRange(state, enemy.stones[0], enemy.stones[1], '战利·灵石');
    c.spiritStones += stones;
    state.stats.stonesEarned += stones;
    const got: string[] = [];
    for (const drop of enemy.loot) {
      const d100 = roll(state, 'D100', `战利·${drop.itemId}`);
      if (d100 <= drop.chance) {
        addItem(c.inventory, drop.itemId, 1);
        got.push(itemById(drop.itemId)?.name ?? drop.itemId);
      }
    }
    out.push(
      entry(
        state.turn,
        '系统',
        `搜得灵石 ${stones}${got.length > 0 ? `,并 ${got.join('、')}` : ''}。`,
        'normal',
      ),
    );
  }

  const expGain = Math.round(c.realm.expNeeded * 0.08);
  c.realm.exp = Math.min(c.realm.expNeeded, c.realm.exp + expGain);
  out.push(entry(state.turn, '系统', `斗法所得修为 +${expGain}。`, 'normal'));

  state.combat = null;
  state.phase = 'playing';
  return out;
}
