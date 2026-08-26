/**
 * combat.ts — dice combat with tactical depth.
 *
 * Tactics (design improvement over the doc):
 *  · 强攻 all-out attack — your damage ×1.3, but you eat ×1.25 in return.
 *  · 游斗 probing — both sides deal less (×0.7 / ×0.6); on a D20 ≥ 14 you
 *    spot a 破绽 (opening): your next 强攻 strikes true at ×1.6.
 *  · 设伏 feint-trap — forfeit your attack; D20 + 心性 vs 13. Success arms a
 *    trap: next round enemy damage ×0.5 AND your strike ×1.8. Failure leaves
 *    you exposed (enemy hits ×1.3 immediately).
 *  · 术法 — cast a combat art for burst power (requires a learned art).
 *  · 服药 — consume a pill/talisman mid-fight (enemy still acts, softer).
 *  · 遁走 — flee: D100 ≤ 40 + 气运×3 − 10×failed attempts. Failure emboldens
 *    the enemy (+10% damage per failed attempt).
 *
 * damage = power × (0.5 + D20/20) × tacticMults − defense×0.3, min 1.
 */

import type { CombatState, CombatTactic, Enemy, GameState } from './types';
import { recordRoll } from './audit';
import { combatPower as calcPower, defenseValue as calcDefense } from './attributes';
import { addItem, countItem, removeItem, resolveItem } from './inventory';
import { checkDeath, finishGame } from './lifecycle';
import {
  COMBAT_FLEE_FAIL,
  COMBAT_FLEE_SUCCESS,
  COMBAT_LOSE_ROBBED,
  COMBAT_TACTIC_FLAVOR,
  COMBAT_WIN_LINES,
  battle as battleLine,
  bumpStat,
  pick,
  say,
  sys,
} from './prose';
import { getCombatArt, getEnemy, makeInjury } from '@/data';

/** the frozen enemy snapshot taken at startCombat (data edits can't touch a live fight) */
function foeOf(cb: CombatState): Enemy {
  return cb.enemy ?? (getEnemy(cb.enemyId) as Enemy);
}

/** battle narration goes to both the main log and the round-by-round combat log */
function battle(state: GameState, text: string, tone?: 'normal' | 'gold' | 'danger' | 'jade' | 'muted'): void {
  battleLine(state, text, tone ?? 'normal');
  state.combat?.log.push(text);
}

export function startCombat(state: GameState, enemyId: string): void {
  const enemy = getEnemy(enemyId);
  if (!enemy || !state.character) return;
  state.combat = {
    enemyId,
    enemy: structuredClone(enemy),
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    playerHp: state.character.hp,
    round: 1,
    log: [],
    opening: false,
    trapArmed: false,
    fleeFailures: 0,
    over: false,
  };
  state.phase = 'combat';
  if (enemy.intro) say(state, enemy.intro, 'danger');
  sys(
    state,
    `【${enemy.name}】(${enemy.rank ?? '来历不明'})拦在面前——威能${enemy.power},气血${enemy.hp}。` +
      `可选:强攻 / 游斗 / 设伏 / 术法 / 服药 / 遁走${enemy.fleeable ? '' : '(此敌不容遁走)'}。`,
    'danger',
  );
}

function playerStrike(state: GameState, mult: number, reason: string): number {
  const cb = state.combat!;
  const c = state.character!;
  const foe = foeOf(cb);
  const d20 = recordRoll(state, 'D20', `攻击·${reason}`);
  const raw = calcPower(c) * (0.5 + d20 / 20) * mult - (foe.defense ?? 0) * 0.3;
  const dmg = Math.max(1, Math.round(raw));
  cb.enemyHp = Math.max(0, cb.enemyHp - dmg);
  battle(state, `汝出手(D20=${d20}),予敌 ${dmg} 点创伤。敌方气血 ${cb.enemyHp}/${foe.hp}。`);
  return dmg;
}

function enemyStrike(state: GameState, mult: number): number {
  const cb = state.combat!;
  const c = state.character!;
  const foe = foeOf(cb);
  const boldness = 1 + (cb.fleeFailures ?? 0) * 0.1;
  const d20 = recordRoll(state, 'D20', `敌袭·${foe.name}`);
  const raw = foe.power * (0.5 + d20 / 20) * mult * boldness - calcDefense(c) * 0.3;
  const dmg = Math.max(1, Math.round(raw));
  c.hp = Math.max(0, c.hp - dmg);
  cb.playerHp = c.hp;
  battle(state, `【${foe.name}】反扑(D20=${d20}),汝受 ${dmg} 点创伤。汝之气血 ${c.hp}/${c.maxHp}。`, 'danger');
  return dmg;
}

function checkCombatEnd(state: GameState): boolean {
  const cb = state.combat;
  const c = state.character;
  if (!cb || !c) return true;

  if (cb.enemyHp <= 0) {
    resolveVictory(state);
    return true;
  }
  if (c.hp <= 0) {
    resolveDefeat(state);
    return true;
  }
  return false;
}

function resolveVictory(state: GameState): void {
  const cb = state.combat!;
  const c = state.character!;
  const foe = foeOf(cb);
  cb.over = true;
  cb.result = 'win';

  say(state, pick(state, COMBAT_WIN_LINES), 'jade');
  bumpStat(state, 'enemiesSlain', 1);
  state.killCount = (state.killCount ?? 0) + 1;
  const killKey = `kills_${cb.enemyId}`;
  c.flags[killKey] = Number(c.flags[killKey] ?? 0) + 1;

  // spoils: stones (气运 nudges the take), then loot table
  const [lo, hi] = foe.spiritStones;
  if (hi > 0) {
    const roll = recordRoll(state, 'D100', '战利·灵石');
    const shifted = Math.min(100, roll + (c.attributes.qiYun - 5) * 2);
    const stones = Math.round(lo + ((hi - lo) * Math.max(0, shifted - 1)) / 99);
    if (stones > 0) {
      c.spiritStones += stones;
      bumpStat(state, 'stonesEarned', stones);
      sys(state, `搜得灵石 ${stones} 枚。`, 'gold');
    }
  }
  for (const drop of foe.loot) {
    const roll = recordRoll(state, 'D100', `战利·${drop.itemId}`);
    if (roll <= drop.chance + (c.attributes.qiYun - 5)) {
      addItem(state, drop.itemId, 1);
    }
  }

  state.combat = null;
  state.phase = 'playing';
}

function resolveDefeat(state: GameState): void {
  const cb = state.combat!;
  const c = state.character!;
  const foe = foeOf(cb);
  cb.over = true;

  if (foe.lethal) {
    cb.result = 'dead';
    say(state, `【${foe.name}】从不留手。至死,方休。`, 'danger');
    finishGame(state, 'combatDeath');
    return;
  }

  // robbed & wounded, but alive
  cb.result = 'lose';
  const lossRoll = recordRoll(state, 'D100', '败战·失财');
  const frac = 0.3 + (0.2 * (lossRoll - 1)) / 99;
  const lost = Math.round(c.spiritStones * frac);
  c.spiritStones -= lost;
  c.hp = Math.max(1, Math.round(c.maxHp * 0.1));

  const injury = makeInjury('pirou_shang');
  if (injury) c.injuries.push(injury);

  say(state, pick(state, COMBAT_LOSE_ROBBED), 'danger');
  if (lost > 0) sys(state, `失灵石 ${lost} 枚,身负【皮肉之伤】。`, 'danger');

  state.combat = null;
  state.phase = 'playing';
}

/** one combat round driven by the player's tactic */
export function combatTurn(state: GameState, tactic: CombatTactic, itemRef?: string): void {
  const cb = state.combat;
  const c = state.character;
  if (!cb || !c || cb.over) return;
  const foe = foeOf(cb);

  // 伏势 from last round applies to this round's exchange
  let playerMult = 1;
  let enemyMult = 1;
  if (cb.trapArmed) {
    playerMult *= 1.8;
    enemyMult *= 0.5;
    cb.trapArmed = false;
    battle(state, '伏势骤发!敌方一脚踏空,阵脚大乱。', 'jade');
  }

  switch (tactic) {
    case '出手':
    case '强攻': {
      say(state, pick(state, COMBAT_TACTIC_FLAVOR['强攻'] ?? []));
      let mult = playerMult * 1.3;
      if (cb.opening) {
        mult *= 1.6;
        cb.opening = false;
        battle(state, '破绽既现,汝一击直取要害!', 'gold');
      }
      playerStrike(state, mult, '强攻');
      if (checkCombatEnd(state)) return;
      enemyStrike(state, enemyMult * 1.25);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '游斗': {
      say(state, pick(state, COMBAT_TACTIC_FLAVOR['游斗'] ?? []));
      playerStrike(state, playerMult * 0.7, '游斗');
      if (checkCombatEnd(state)) return;
      const eye = recordRoll(state, 'D20', '游斗·寻隙');
      if (eye >= 14) {
        cb.opening = true;
        battle(state, `汝且战且察(D20=${eye}),看破了敌方一处破绽!(下次强攻威力大增)`, 'jade');
      }
      enemyStrike(state, enemyMult * 0.6);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '设伏': {
      say(state, pick(state, COMBAT_TACTIC_FLAVOR['设伏'] ?? []));
      const d20 = recordRoll(state, 'D20', '设伏·心计');
      const total = d20 + c.attributes.xinXing;
      if (total >= 13) {
        cb.trapArmed = true;
        battle(state, `汝不动声色布下伏势(D20=${d20}+心性${c.attributes.xinXing}=${total})。且看下一合。`, 'jade');
        enemyStrike(state, enemyMult);
        if (checkCombatEnd(state)) return;
      } else {
        battle(state, `心计被看穿(D20=${d20}+心性${c.attributes.xinXing}=${total} < 13),汝露了后背!`, 'danger');
        enemyStrike(state, enemyMult * 1.3);
        if (checkCombatEnd(state)) return;
      }
      break;
    }
    case '术法': {
      const artId = c.combatArts[c.combatArts.length - 1];
      const art = artId ? getCombatArt(artId) : undefined;
      if (!art) {
        sys(state, '汝尚未习得任何术法。(典籍可授,机缘可得)');
        return; // no round consumed
      }
      say(state, pick(state, COMBAT_TACTIC_FLAVOR['术法'] ?? []));
      battle(state, `【${art.name}】既出,声势夺人。`, 'jade');
      const bonus = 1 + art.power / Math.max(1, calcPower(c));
      playerStrike(state, playerMult * bonus, `术法·${art.name}`);
      if (checkCombatEnd(state)) return;
      enemyStrike(state, enemyMult);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '服药': {
      if (!itemRef) {
        sys(state, '要用何物?(服药 物品名)');
        return;
      }
      const def = resolveItem(itemRef);
      if (!def || countItem(state, def.id) <= 0) {
        sys(state, `储物袋中并无「${itemRef}」。`);
        return;
      }
      const fx = def.effect;
      if (!fx || (!fx.escape && !fx.damage && !fx.hp)) {
        sys(state, `【${def.name}】临阵无用。`);
        return;
      }
      removeItem(state, def.id, 1);
      if (def.kind === 'pill') bumpStat(state, 'pillsConsumed', 1);

      if (fx.escape) {
        say(state, `汝拍碎【${def.name}】,遁光乍起——再回首,已在十里之外。`, 'jade');
        cb.over = true;
        cb.result = 'fled';
        state.combat = null;
        state.phase = 'playing';
        return;
      }
      if (fx.damage) {
        cb.enemyHp = Math.max(0, cb.enemyHp - fx.damage);
        battle(state, `【${def.name}】轰然炸开,予敌 ${fx.damage} 点创伤!敌方气血 ${cb.enemyHp}/${foe.hp}。`, 'gold');
        if (checkCombatEnd(state)) return;
      }
      if (fx.hp) {
        const before = c.hp;
        c.hp = Math.min(c.maxHp, c.hp + fx.hp);
        cb.playerHp = c.hp;
        battle(state, `汝吞下【${def.name}】,气血 +${c.hp - before}(${c.hp}/${c.maxHp})。`, 'jade');
      }
      // using an item leaves a smaller window for the enemy
      enemyStrike(state, enemyMult * 0.8);
      if (checkCombatEnd(state)) return;
      break;
    }
    case '遁走': {
      if (!foe.fleeable) {
        say(state, `退路早已被封死。【${foe.name}】没打算让任何人离开。`, 'danger');
        enemyStrike(state, enemyMult);
        if (checkCombatEnd(state)) return;
        break;
      }
      const chance = Math.max(5, 40 + c.attributes.qiYun * 3 - (cb.fleeFailures ?? 0) * 10);
      const roll = recordRoll(state, 'D100', '遁走');
      if (roll <= chance) {
        say(state, pick(state, COMBAT_FLEE_SUCCESS), 'jade');
        cb.over = true;
        cb.result = 'fled';
        state.combat = null;
        state.phase = 'playing';
        return;
      }
      cb.fleeFailures = (cb.fleeFailures ?? 0) + 1;
      say(state, pick(state, COMBAT_FLEE_FAIL), 'danger');
      sys(state, `遁走失败(D100=${roll} > ${chance}),敌方气焰更盛。`, 'danger');
      enemyStrike(state, enemyMult * 1.2);
      if (checkCombatEnd(state)) return;
      break;
    }
  }

  if (state.combat && !state.combat.over) {
    state.combat.round += 1;
  }
  checkDeath(state);
}
