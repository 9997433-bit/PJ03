/**
 * combat.ts — 斗法: a round-by-round duel phase with the six 战斗式 and four
 * exits (胜 / 劫财 / 夺命 / 遁).
 *
 * 六式
 *  · 力破 — patterns flare: your blow ×1.35, but you eat ×1.25 in return.
 *    Spends a 破绽 (×1.5) and a 蓄势 charge (×1.8) if either is banked.
 *  · 周旋 — probe: both sides deal less (×0.65 / ×0.55); on D20 ≥ 14 you spot
 *    a 破绽 for the next 力破.
 *  · 布纹 — forgo your strike and spend 6 神魂: D20 + 调和/10 ≥ 13 banks a
 *    charge and halves the incoming blow; failure leaves you open (×1.3).
 *  · 摄神 — strike the soul, not the body: damage scales off 神魂 and ignores
 *    the foe's guard entirely. Costs 8 神魂; a clean grip (D20 ≥ 12) also
 *    leaves a 破绽.
 *  · 吞丹 — swallow the strongest elixir you carry. It heals in full, but the
 *    foe gets a free swing (×1.15) while your hands are busy.
 *  · 遁土 — disengage: D100 ≤ 45 + 威势 − 12 per failed attempt. Each failure
 *    emboldens the foe by another 12%.
 *
 * damage = rating × (0.5 + D20/20) × multipliers − guard × 0.3, minimum 1.
 *
 * Defeat is two-tiered: ordinary foes rob you (劫财 — a slice of the treasury,
 * a sliver of health, a shaken soul), 夺命 foes kill outright.
 */

import { ITEMS } from './content';
import { recordDie, recordSpan } from './audit';
import { strikeRating, wardRating } from './power';
import type { CombatTactic, Foe, GameItem, GameState, LogEntry } from './types';
import { COMBAT_TACTICS } from './types';

/** A duel is abandoned as a draw once it drags past this many rounds. */
export const MAX_COMBAT_ROUNDS = 24;
/** 神魂 spent to bank a 蓄势 charge with 布纹. */
export const CHARGE_SOUL_COST = 6;
/** 神魂 spent on a 摄神 soul-strike. */
export const SOUL_GRIP_COST = 8;

export const FOES: Foe[] = [
  {
    id: 'stray-cutpurse', name: '截道游侠', tier: 0, power: 12, hp: 60, guard: 4,
    stones: [8, 22], lethal: false, fleeable: true,
    intro: '一名蒙面游侠自林中横刀而出，只要买路玄玉。',
  },
  {
    id: 'ridge-wolf', name: '青岭啸狼', tier: 0, power: 14, hp: 68, guard: 5,
    stones: [6, 18], loot: 'river-iron', lethal: false, fleeable: true,
    intro: '青岭啸狼压低前肢，喉间滚出雷雨前的低鸣。',
  },
  {
    id: 'rival-disciple', name: '同辈挑战者', tier: 1, power: 20, hp: 130, guard: 12,
    stones: [18, 44], lethal: false, fleeable: true,
    intro: '同辈修士抱剑而立：「听闻你新成道纹，可敢一试？」',
  },
  {
    id: 'marsh-serpent', name: '泽底墨蟒', tier: 1, power: 22, hp: 145, guard: 14,
    stones: [14, 36], loot: 'thunder-horn', lethal: false, fleeable: true,
    intro: '墨蟒破泥而起，鳞片间还挂着上一个不速之客的衣角。',
  },
  {
    id: 'blood-cultivator', name: '血河散修', tier: 2, power: 27, hp: 210, guard: 20,
    stones: [30, 70], loot: 'star-silver', lethal: false, fleeable: true,
    intro: '血河散修抖开一幅人皮幡，幡上还有未散的哀鸣。',
  },
  {
    id: 'ruin-puppet', name: '遗迹守傀', tier: 2, power: 30, hp: 235, guard: 26,
    stones: [24, 58], loot: 'puppet-core', lethal: false, fleeable: false,
    intro: '守傀双目亮起青芒，将退路一并封死。',
  },
  {
    id: 'border-marshal', name: '邻境镇守', tier: 3, power: 35, hp: 300, guard: 32,
    stones: [55, 120], loot: 'dragon-bone', lethal: false, fleeable: true,
    intro: '邻境镇守带着两面战旗前来，旗下是他整座山头的名声。',
  },
  {
    id: 'soul-eater', name: '噬魂老魅', tier: 3, power: 38, hp: 285, guard: 28,
    stones: [40, 96], loot: 'soul-lamp', lethal: true, fleeable: true,
    intro: '老魅不取性命之外的任何东西——它只吃神魂。',
  },
  {
    id: 'thunder-warden', name: '雷泽巡狩', tier: 4, power: 43, hp: 380, guard: 38,
    stones: [80, 175], loot: 'five-thunder-seal', lethal: false, fleeable: true,
    intro: '雷泽巡狩踏雷而至，每一步都在地面烙下焦痕。',
  },
  {
    id: 'void-remnant', name: '太虚残念', tier: 4, power: 46, hp: 350, guard: 34,
    stones: [70, 150], loot: 'void-crystal', lethal: true, fleeable: false,
    intro: '一段太虚残念缠上识海，它没有形体，只有饥饿。',
  },
  {
    id: 'sect-patriarch', name: '大宗老祖', tier: 5, power: 52, hp: 470, guard: 46,
    stones: [140, 280], loot: 'storm-banner', lethal: false, fleeable: true,
    intro: '大宗老祖负手立于云头：「后生，让我看看你的道。」',
  },
  {
    id: 'heaven-envoy', name: '天门使者', tier: 5, power: 56, hp: 500, guard: 50,
    stones: [160, 320], loot: 'heaven-key', lethal: true, fleeable: false,
    intro: '天门使者自雷云中降下，长戟未出鞘，杀意已铺满山河。',
  },
];

function battleLog(state: GameState, text: string, tone: LogEntry['tone'] = 'normal'): void {
  state.logs = [...state.logs, { turn: state.turn, tone, text }].slice(-60);
  if (state.combat) state.combat.log = [...state.combat.log, text].slice(-16);
}

export function getFoe(id: string): Foe | undefined {
  return FOES.find((foe) => foe.id === id);
}

/** Foes worth meeting at this realm: the top two tiers already unlocked. */
export function eligibleFoes(realm: number): Foe[] {
  const unlocked = FOES.filter((foe) => foe.tier <= realm);
  const recent = unlocked.filter((foe) => foe.tier >= realm - 1);
  return recent.length ? recent : unlocked;
}

/** The strongest restorative 丹药 in the bag — what 吞丹 reaches for. */
export function bestElixir(state: GameState): GameItem | null {
  const held = state.inventory
    .map((id) => ITEMS.find((item) => item.id === id))
    .filter((item): item is GameItem => Boolean(item?.consumable && (item.effect.health ?? 0) > 0));
  return held.reduce<GameItem | null>(
    (best, item) => (!best || (item.effect.health ?? 0) > (best.effect.health ?? 0) ? item : best),
    null,
  );
}

export function tacticAvailability(
  state: GameState,
  tactic: CombatTactic,
): { available: boolean; reason: string } {
  const combat = state.combat;
  if (!combat || combat.over) return { available: false, reason: '并无对敌' };
  if (tactic === '布纹') {
    if (combat.charged) return { available: false, reason: '蓄势已成' };
    if (state.soul.power < CHARGE_SOUL_COST) return { available: false, reason: `需 ${CHARGE_SOUL_COST} 神魂` };
  }
  if (tactic === '摄神' && state.soul.power < SOUL_GRIP_COST) {
    return { available: false, reason: `需 ${SOUL_GRIP_COST} 神魂` };
  }
  if (tactic === '吞丹') {
    if (!bestElixir(state)) return { available: false, reason: '囊中无丹' };
    if (state.character.health >= state.character.maxHealth) {
      return { available: false, reason: '气血无损' };
    }
  }
  if (tactic === '遁土' && !(getFoe(combat.foeId)?.fleeable ?? true)) {
    return { available: false, reason: '退路已被封死' };
  }
  return { available: true, reason: '' };
}

/** Tactics the current state can actually pay for. */
export function availableTactics(state: GameState): CombatTactic[] {
  return COMBAT_TACTICS.filter((tactic) => tacticAvailability(state, tactic).available);
}

/** Open a duel against a seeded foe. Mutates the (already cloned) state. */
export function startCombat(state: GameState): Foe {
  const pool = eligibleFoes(state.character.realm);
  const foe = pool[recordSpan(state, 0, pool.length - 1, '斗法·遇敌')]!;
  state.combat = {
    foeId: foe.id,
    foeHp: foe.hp,
    foeMaxHp: foe.hp,
    round: 1,
    opening: false,
    charged: false,
    fleeFailures: 0,
    log: [],
    over: false,
    result: null,
  };
  battleLog(state, foe.intro, 'danger');
  return foe;
}

function playerStrike(state: GameState, multiplier: number, reason: string): number {
  const combat = state.combat!;
  const foe = getFoe(combat.foeId)!;
  const d20 = recordDie(state, 20, `攻击·${reason}`);
  const raw = strikeRating(state) * (0.5 + d20 / 20) * multiplier - foe.guard * 0.3;
  const damage = Math.max(1, Math.round(raw));
  combat.foeHp = Math.max(0, combat.foeHp - damage);
  battleLog(state, `${reason}命中（D20=${d20}），${foe.name}受创 ${damage} 点（余 ${combat.foeHp}/${combat.foeMaxHp}）。`, 'good');
  return damage;
}

function foeStrike(state: GameState, multiplier: number): number {
  const combat = state.combat!;
  const foe = getFoe(combat.foeId)!;
  const boldness = 1 + combat.fleeFailures * 0.12;
  const d20 = recordDie(state, 20, `敌袭·${foe.name}`);
  const raw = foe.power * (0.5 + d20 / 20) * multiplier * boldness - wardRating(state) * 0.3;
  const damage = Math.max(1, Math.round(raw));
  state.character.health = Math.max(0, state.character.health - damage);
  battleLog(state, `${foe.name}反扑（D20=${d20}），你受创 ${damage} 点（余 ${state.character.health}/${state.character.maxHealth}）。`, 'danger');
  return damage;
}

function resolveVictory(state: GameState): void {
  const combat = state.combat!;
  const foe = getFoe(combat.foeId)!;
  combat.over = true;
  combat.result = 'win';

  const [low, high] = foe.stones;
  const loot = recordSpan(state, low, high, '战利·玄玉');
  state.territory.spiritStones = Math.min(9999, state.territory.spiritStones + loot);
  state.character.reputation += 2 + foe.tier;
  state.territory.influence += 1 + Math.floor(foe.tier / 2);
  battleLog(state, `${foe.name}伏诛，搜得 ${loot} 玄玉。`, 'thunder');

  if (foe.loot && ITEMS.some((item) => item.id === foe.loot)) {
    const drop = recordDie(state, 100, `战利·${foe.loot}`);
    if (drop <= 35 + foe.tier * 4) {
      state.inventory = [...state.inventory, foe.loot];
      battleLog(state, `尸骸间拾得${ITEMS.find((item) => item.id === foe.loot)!.name}。`, 'good');
    }
  }
}

function resolveDefeat(state: GameState): void {
  const combat = state.combat!;
  const foe = getFoe(combat.foeId)!;
  combat.over = true;

  if (foe.lethal) {
    combat.result = 'slain';
    state.character.health = 0;
    battleLog(state, `${foe.name}从不留活口——道纹尽碎，此身止于此处。`, 'danger');
    return;
  }

  combat.result = 'robbed';
  const cut = recordSpan(state, 30, 50, '败战·劫财');
  const lost = Math.round((state.territory.spiritStones * cut) / 100);
  state.territory.spiritStones = Math.max(0, state.territory.spiritStones - lost);
  state.character.health = Math.max(1, Math.round(state.character.maxHealth * 0.08));
  state.soul.stability = Math.max(0, state.soul.stability - 6);
  battleLog(state, `力竭倒地，${foe.name}劫走 ${lost} 玄玉，魂魄震荡未平。`, 'danger');
}

function checkCombatEnd(state: GameState): boolean {
  const combat = state.combat!;
  if (combat.foeHp <= 0) {
    resolveVictory(state);
    return true;
  }
  if (state.character.health <= 0) {
    resolveDefeat(state);
    return true;
  }
  return false;
}

/**
 * Resolve one round. Mutates the (already cloned) state; the caller advances
 * the turn once `state.combat.over` is set.
 */
export function combatTurn(state: GameState, tactic: CombatTactic): void {
  const combat = state.combat;
  if (!combat || combat.over) return;
  const foe = getFoe(combat.foeId)!;

  let playerMultiplier = 1;
  let foeMultiplier = 1;

  switch (tactic) {
    case '力破': {
      playerMultiplier *= 1.35;
      foeMultiplier *= 1.25;
      if (combat.charged) {
        playerMultiplier *= 1.8;
        foeMultiplier *= 0.5;
        combat.charged = false;
        battleLog(state, '蓄势雷光倾泻而下，敌手阵脚大乱。', 'thunder');
      }
      if (combat.opening) {
        playerMultiplier *= 1.5;
        combat.opening = false;
        battleLog(state, '破绽既现，一击直取要害。', 'good');
      }
      playerStrike(state, playerMultiplier, '力破');
      if (checkCombatEnd(state)) return;
      foeStrike(state, foeMultiplier);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '周旋': {
      playerStrike(state, 0.65, '周旋');
      if (checkCombatEnd(state)) return;
      const eye = recordDie(state, 20, '周旋·寻隙');
      if (eye >= 14) {
        combat.opening = true;
        battleLog(state, `且战且察（D20=${eye}），你看破了一处破绽。`, 'good');
      }
      foeStrike(state, 0.55);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '布纹': {
      state.soul.power = Math.max(0, state.soul.power - CHARGE_SOUL_COST);
      const d20 = recordDie(state, 20, '布纹·蓄势');
      const bonus = Math.floor(state.daoPattern.harmony / 10);
      if (d20 + bonus >= 13) {
        combat.charged = true;
        battleLog(state, `道纹铺地成阵（D20=${d20}+调和${bonus}=${d20 + bonus}）。`, 'good');
        foeStrike(state, 0.5);
      } else {
        battleLog(state, `纹路未合（D20=${d20}+调和${bonus}=${d20 + bonus} < 13），门户大开。`, 'danger');
        foeStrike(state, 1.3);
      }
      if (checkCombatEnd(state)) return;
      break;
    }
    case '摄神': {
      state.soul.power = Math.max(0, state.soul.power - SOUL_GRIP_COST);
      const d20 = recordDie(state, 20, '摄神·夺魄');
      // A soul-grip bypasses armour entirely; its bite comes from 神魂, not 战力.
      const rating = Math.max(4, Math.round(state.soul.maxPower / 4 + state.soul.stability / 5));
      const damage = Math.max(1, Math.round(rating * (0.5 + d20 / 20)));
      combat.foeHp = Math.max(0, combat.foeHp - damage);
      battleLog(state, `神念直入识海（D20=${d20}），${foe.name}神魂受创 ${damage} 点（余 ${combat.foeHp}/${combat.foeMaxHp}）。`, 'good');
      if (checkCombatEnd(state)) return;
      if (d20 >= 12) {
        combat.opening = true;
        battleLog(state, `${foe.name}心神一滞，破绽随之而生。`, 'good');
      }
      foeStrike(state, 0.9);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '吞丹': {
      const elixir = bestElixir(state);
      if (!elixir) {
        battleLog(state, '摸遍乾坤囊，并无丹药可吞。', 'danger');
        foeStrike(state, 1);
        if (checkCombatEnd(state)) return;
        break;
      }
      const index = state.inventory.indexOf(elixir.id);
      state.inventory = [...state.inventory.slice(0, index), ...state.inventory.slice(index + 1)];
      const healed = Math.min(elixir.effect.health ?? 0, state.character.maxHealth - state.character.health);
      state.character.health += healed;
      if (elixir.effect.soul) {
        state.soul.power = Math.min(state.soul.maxPower, state.soul.power + elixir.effect.soul);
      }
      battleLog(state, `仰头吞下${elixir.name}，气血回复 ${healed} 点（余 ${state.character.health}/${state.character.maxHealth}）。`, 'good');
      foeStrike(state, 1.15);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '遁土': {
      if (!foe.fleeable) {
        battleLog(state, `${foe.name}早已封死退路。`, 'danger');
        foeStrike(state, 1);
        if (checkCombatEnd(state)) return;
        break;
      }
      const odds = Math.max(5, 45 + state.territory.influence - combat.fleeFailures * 12);
      const d100 = recordDie(state, 100, '遁土·潜行');
      if (d100 <= odds) {
        combat.over = true;
        combat.result = 'fled';
        state.soul.stability = Math.max(0, state.soul.stability - 2);
        state.character.qi = Math.max(0, state.character.qi - 4);
        battleLog(state, `遁土而走（D100=${d100} ≤ ${odds}），再回首已在十里之外。`, 'normal');
        return;
      }
      combat.fleeFailures += 1;
      battleLog(state, `遁土失败（D100=${d100} > ${odds}），敌手气焰更盛。`, 'danger');
      foeStrike(state, 1.2);
      if (checkCombatEnd(state)) return;
      break;
    }
  }

  combat.round += 1;
  if (combat.round > MAX_COMBAT_ROUNDS) {
    combat.over = true;
    combat.result = 'fled';
    state.soul.stability = Math.max(0, state.soul.stability - 2);
    battleLog(state, `缠斗至${MAX_COMBAT_ROUNDS}合仍无胜负，${foe.name}拂袖而去。`, 'normal');
  }
}
