/**
 * derived.ts — 推算 (every number the rest of the engine reads)
 *
 * Nothing in this module mutates. Given a `Character` it folds together six
 * layers of modifiers — 灵根, 命格, 出身, 功法路线, 装备/遗物, 伤势 — into one
 * flat `Derived` record. Every other module asks *this* file what the numbers
 * are, so a balance change happens in one place and the combat, cultivation and
 * calamity maths cannot drift apart.
 *
 * Origin and fate specials are spelled out here rather than in `data/`, because
 * a special is a rule, and rules belong in the engine. The data files carry the
 * player-facing prose for each; the two are kept in step by `dataIntegrity`.
 */

import { fateById } from '@/data/fates';
import { itemById } from '@/data/items';
import { originById } from '@/data/origins';
import { realmDef, realmOrder } from '@/data/realms';
import { sectById } from '@/data/sects';
import { techniqueById } from '@/data/techniques';
import type { Character, RouteEffects } from './types';

export interface Derived {
  maxHp: number;
  maxMana: number;
  power: number;
  defense: number;
  /** Multiplier applied to a 修炼 turn's base exp. */
  cultivationMult: number;
  /** Multiplier applied to passive 劫运 accrual. */
  calamityRate: number;
  /** Multiplier applied to every 气运 gain. */
  fortuneGainMult: number;
  /** Flat addition to the D100 target of a 突破. */
  breakthroughBonus: number;
  /** Flat addition to the D100 target of a 化解劫运 attempt. */
  mitigationBonus: number;
  /** Flat addition to the D20 target of a 习功法 check. */
  learningBonus: number;
  /** Flat addition to the D20 target of a 遁走 check. */
  fleeBonus: number;
  /** Fraction off 推演 costs, 0–0.8. */
  divinationDiscount: number;
  /** Extra 天机反噬 relief, in calamity points. */
  backlashRelief: number;
  /** Fraction off market buy prices, 0–0.6. */
  marketDiscount: number;
  /** Bonus fraction added to market sell prices. */
  sellBonus: number;
  /** Multiplier on 声望 gains. */
  reputationMult: number;
  /** Multiplier on the 气运 taken by 灭运. */
  extinguishMult: number;
  /** Multiplier on pill effects. */
  pillMult: number;
  /** 功德 accrued each turn from route and relics. */
  meritPerTurn: number;
}

function accumulate(target: RouteEffects, add: RouteEffects | undefined): void {
  if (!add) return;
  target.cultivationMult = (target.cultivationMult ?? 1) * (add.cultivationMult ?? 1);
  target.calamityRateMult = (target.calamityRateMult ?? 1) * (add.calamityRateMult ?? 1);
  target.fortuneGainMult = (target.fortuneGainMult ?? 1) * (add.fortuneGainMult ?? 1);
  target.powerBonus = (target.powerBonus ?? 0) + (add.powerBonus ?? 0);
  target.hpBonus = (target.hpBonus ?? 0) + (add.hpBonus ?? 0);
  target.manaBonus = (target.manaBonus ?? 0) + (add.manaBonus ?? 0);
  target.meritPerTurn = (target.meritPerTurn ?? 0) + (add.meritPerTurn ?? 0);
  target.breakthroughBonus = (target.breakthroughBonus ?? 0) + (add.breakthroughBonus ?? 0);
  target.mitigationBonus = (target.mitigationBonus ?? 0) + (add.mitigationBonus ?? 0);
  target.divinationDiscount = (target.divinationDiscount ?? 0) + (add.divinationDiscount ?? 0);
  target.marketDiscount = (target.marketDiscount ?? 0) + (add.marketDiscount ?? 0);
  target.reputationMult = (target.reputationMult ?? 1) * (add.reputationMult ?? 1);
}

/**
 * Fold learned techniques, equipped gear and carried relics into one bundle.
 * Relics work from the pack — they are not worn, they are simply *had*.
 */
export function aggregateEffects(character: Character): RouteEffects {
  const acc: RouteEffects = {};
  for (const id of character.learned) accumulate(acc, techniqueById(id)?.effects);
  for (const slot of ['weapon', 'robe', 'charm'] as const) {
    const id = character.equipped[slot];
    if (id) accumulate(acc, itemById(id)?.passive);
  }
  for (const stack of character.inventory) {
    const def = itemById(stack.itemId);
    if (def?.kind === 'relic') accumulate(acc, def.passive);
  }
  return acc;
}

function injuryFactors(character: Character): {
  cultivation: number;
  power: number;
  breakthrough: number;
  calamity: number;
} {
  let cultivation = 1;
  let power = 1;
  let breakthrough = 0;
  let calamity = 1;
  for (const inj of character.injuries) {
    cultivation *= 1 + (inj.effect.cultivation ?? 0);
    power *= 1 + (inj.effect.power ?? 0);
    breakthrough += inj.effect.breakthrough ?? 0;
    calamity *= 1 + (inj.effect.calamity ?? 0);
  }
  return {
    cultivation: Math.max(0.15, cultivation),
    power: Math.max(0.2, power),
    breakthrough,
    calamity: Math.max(0.5, calamity),
  };
}

export function derive(character: Character): Derived {
  const rd = realmDef(character.realm.realm);
  const order = rd.order;
  const a = character.attributes;
  const fx = aggregateEffects(character);
  const inj = injuryFactors(character);
  const origin = originById(character.originId);
  const fate = fateById(character.fateId);
  const sect = sectById(character.sectId);

  const weapon = character.equipped.weapon ? itemById(character.equipped.weapon) : null;
  const robe = character.equipped.robe ? itemById(character.equipped.robe) : null;

  // ---- 出身 / 命格 specials ------------------------------------------------
  const isChihou = character.originId === 'chihou';
  const isShanghang = character.originId === 'shanghang';
  const isGuanxing = character.originId === 'guanxing';
  const isYaotong = character.originId === 'yaotong';
  const isZuichen = character.originId === 'zuichen';
  const isShusheng = character.originId === 'shusheng';

  const fateId = character.fateId;
  const soloBonus = fateId === 'tiansha' && character.sectId === null ? 1.1 : 1;

  // ---- 气血 / 法力 ---------------------------------------------------------
  const maxHp = Math.round(
    (40 + a.tiPo * 12 + rd.powerBase * 2.2 + (fx.hpBonus ?? 0)) * (1 + order * 0.05),
  );
  const maxMana = Math.round(20 + a.shenHun * 10 + order * 18 + (fx.manaBonus ?? 0));

  // ---- 斗法 ---------------------------------------------------------------
  const rawPower =
    rd.powerBase +
    a.tiPo * 2.2 +
    a.shenHun * 1.6 +
    (weapon?.power ?? 0) +
    (fx.powerBonus ?? 0);
  const powerMult =
    inj.power * (isChihou ? 1.08 : 1) * (fateId === 'pojun' ? 1.12 : 1);
  const power = Math.max(1, Math.round(rawPower * powerMult));

  const defense = Math.max(
    0,
    Math.round(rd.powerBase * 0.22 + a.tiPo * 0.9 + (robe?.defense ?? 0) + (weapon?.defense ?? 0)),
  );

  // ---- 修炼 ---------------------------------------------------------------
  const cultivationMult =
    character.spiritRoot.speedMultiplier *
    (1 + a.wuXing * 0.055) *
    (fx.cultivationMult ?? 1) *
    inj.cultivation *
    soloBonus *
    (1 + character.fortune * 0.003);

  // ---- 劫运 ---------------------------------------------------------------
  const calamityRate =
    character.spiritRoot.calamityAffinity *
    (fate?.calamityRate ?? 1) *
    (fx.calamityRateMult ?? 1) *
    inj.calamity;

  // ---- 其余 ---------------------------------------------------------------
  const fortuneGainMult = (fate?.fortuneRate ?? 1) * (fx.fortuneGainMult ?? 1);

  const breakthroughBonus =
    (fx.breakthroughBonus ?? 0) + a.dingLi * 1.6 + inj.breakthrough + character.breakthroughBuff;

  const mitigationBonus =
    (fx.mitigationBonus ?? 0) +
    a.dingLi * 1.4 +
    a.shenHun * 0.8 +
    (isZuichen ? 10 : 0) +
    (fateId === 'tianfu' ? 12 : 0);

  const learningBonus =
    a.wuXing * 4 + (isShusheng ? 8 : 0) + (fateId === 'wenqu' ? 10 : 0);

  const fleeBonus = a.jiBian * 2 + (isChihou ? 10 : 0) + (fateId === 'guhong' ? 12 : 0);

  const divinationDiscount = Math.min(
    0.8,
    (fx.divinationDiscount ?? 0) + (isGuanxing ? 0.25 : 0) + (fateId === 'taiyin' ? 0.3 : 0),
  );
  const backlashRelief = (isGuanxing ? 1 : 0) + (fateId === 'taiyin' ? 2 : 0);

  const marketDiscount = Math.min(
    0.6,
    (fx.marketDiscount ?? 0) + (sect?.discount ?? 0) + (isShanghang ? 0.12 : 0),
  );
  const sellBonus = isShanghang ? 0.1 : 0;

  const reputationMult = fx.reputationMult ?? 1;

  const extinguishMult =
    (fateId === 'tanlang' ? 1.3 : 1) *
    (fateId === 'mieyun' ? 1.5 : 1) *
    (character.flags.tuluAwake ? 1.4 : 1);

  const pillMult = isYaotong ? 1.2 : 1;

  return {
    maxHp,
    maxMana,
    power,
    defense,
    cultivationMult,
    calamityRate,
    fortuneGainMult,
    breakthroughBonus,
    mitigationBonus,
    learningBonus,
    fleeBonus,
    divinationDiscount,
    backlashRelief,
    marketDiscount,
    sellBonus,
    reputationMult,
    extinguishMult,
    pillMult,
    meritPerTurn: fx.meritPerTurn ?? 0,
  };
}

/** Total lifespan granted by the highest realm reached. */
export function lifespanFor(character: Character): number {
  return realmDef(character.realm.realm).lifespan + Math.round(character.attributes.tiPo * 1.5);
}

export function currentRealmOrder(character: Character): number {
  return realmOrder(character.realm.realm);
}
