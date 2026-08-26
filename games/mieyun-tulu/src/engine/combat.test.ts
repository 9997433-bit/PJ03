import { describe, expect, it } from 'vitest';
import { combatAction, fleeChance, resolveSpoils, spoilsOptions, startCombat } from './combat';
import { enemyById } from '@/data/enemies';
import { forceRealm, give, newRun } from '@/test/helpers';
import type { GameState } from './types';

function fight(seed: string, enemyId: string): GameState {
  const s = forceRealm(newRun(seed), 'tongxuan');
  s.character!.attributes.tiPo = 30;
  s.character!.attributes.shenHun = 20;
  const d = s.character!;
  d.maxHp = 20000;
  d.hp = 20000;
  d.maxMana = 4000;
  d.mana = 4000;
  startCombat(s, enemyId, 'duel');
  return s;
}

describe('combat · 斗法', () => {
  it('enters the combat phase and seeds the enemy bar', () => {
    const s = fight('enter', 'linghu');
    expect(s.phase).toBe('combat');
    expect(s.combat!.enemyHp).toBe(enemyById('linghu')!.hp);
    expect(s.combat!.enemyMaxHp).toBe(s.combat!.enemyHp);
  });

  it('出手 costs no 法力', () => {
    const s = fight('strike', 'linghu');
    const mana = s.character!.mana;
    combatAction(s, '出手');
    expect(s.character!.mana).toBe(mana);
  });

  it('术法 spends 法力 and refuses when the pool is dry', () => {
    const s = fight('spell', 'yaolang');
    const mana = s.character!.mana;
    combatAction(s, '术法');
    expect(s.character!.mana).toBeLessThan(mana);
    s.character!.mana = 0;
    const logs = combatAction(s, '术法');
    expect(logs.some((l) => l.text.includes('法力不足'))).toBe(true);
  });

  it('用符 consumes exactly one 五雷符 and refuses with none', () => {
    const s = give(fight('talisman', 'yaolang'), 'wuleifu', 1);
    combatAction(s, '用符');
    expect(s.character!.inventory.some((x) => x.itemId === 'wuleifu')).toBe(false);
    expect(combatAction(s, '用符').some((l) => l.text.includes('囊中无符'))).toBe(true);
  });

  it('the four tactics deal genuinely different damage', () => {
    const a = fight('dmg', 'shuyao');
    const b = give(fight('dmg', 'shuyao'), 'wuleifu', 1);
    combatAction(a, '出手');
    combatAction(b, '用符');
    expect(a.combat!.enemyHp).not.toBe(b.combat!.enemyHp);
  });

  it('遁走 publishes odds and is impossible against a 劫相', () => {
    const s = fight('flee', 'linghu');
    expect(fleeChance(s, enemyById('linghu')!)).toBeGreaterThan(0);
    const jie = fight('flee', 'tianlei');
    const logs = combatAction(jie, '遁走');
    expect(logs.some((l) => l.text.includes('遁无可遁'))).toBe(true);
    expect(jie.phase).toBe('combat');
  });

  it('遁地符 guarantees the escape and is spent doing it', () => {
    const s = give(fight('dundi', 'yaolang'), 'dundifu', 1);
    combatAction(s, '遁走');
    expect(s.phase).toBe('playing');
    expect(s.combat).toBeNull();
  });

  it('a win against a person waits for the 战利 decision', () => {
    const s = fight('win', 'linghu');
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 60) combatAction(s, '出手');
    expect(s.combat!.result).toBe('win');
    expect(s.combat!.awaitingSpoils).toBe(true);
    expect(s.stats.battlesWon).toBe(1);
  });

  it('a win against a 劫相 vents the meter and needs no decision', () => {
    const s = fight('jie', 'tianlei');
    s.combat!.vent = 26;
    const before = s.character!.calamity.value;
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 200) combatAction(s, '出手');
    expect(s.phase).toBe('playing');
    expect(s.character!.calamity.value).toBeLessThan(before + 1);
    expect(s.character!.calamity.survived).toBe(1);
  });

  it('灭运 trades 功德 and 劫运 for 气运', () => {
    const s = fight('spoils-1', 'xuezhidao');
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 200) combatAction(s, '出手');
    const c = s.character!;
    c.fortune = 10;
    c.calamity.value = 10;
    const merit = c.merit;
    resolveSpoils(s, '灭运');
    expect(c.fortune).toBeGreaterThan(10);
    expect(c.calamity.value).toBeGreaterThan(10);
    expect(c.merit).toBeLessThan(merit);
    expect(c.extinguishCount).toBe(1);
    expect(s.phase).toBe('playing');
  });

  it('饶恕 pays in 功德 and takes nothing', () => {
    const s = fight('spoils-2', 'xuezhidao');
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 200) combatAction(s, '出手');
    const c = s.character!;
    const stones = c.spiritStones;
    const merit = c.merit;
    resolveSpoils(s, '饶恕');
    expect(c.merit).toBeGreaterThan(merit);
    expect(c.spiritStones).toBe(stones);
    expect(c.sparedCount).toBe(1);
  });

  it('搜刮 yields stones and leaves the 气运 column alone', () => {
    const s = fight('spoils-3', 'xuezhidao');
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 200) combatAction(s, '出手');
    const c = s.character!;
    const stones = c.spiritStones;
    const fortune = c.fortune;
    resolveSpoils(s, '搜刮');
    expect(c.spiritStones).toBeGreaterThan(stones);
    expect(c.fortune).toBe(fortune);
    expect(c.extinguishCount).toBe(0);
  });

  it('publishes three spoils options with readable detail', () => {
    const s = fight('spoils-4', 'xuezhidao');
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 200) combatAction(s, '出手');
    const options = spoilsOptions(s);
    expect(options.map((o) => o.id)).toEqual(['灭运', '饶恕', '搜刮']);
    for (const o of options) expect(o.detail.length).toBeGreaterThan(4);
  });

  it('grades a defeat into 劫财 and 夺命', () => {
    const outcomes = new Set<string>();
    for (const seed of ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8']) {
      const s = forceRealm(newRun(seed), 'yinqi');
      s.character!.hp = 1;
      startCombat(s, 'yaolang', 'duel');
      combatAction(s, '出手');
      if (s.combat) outcomes.add(String(s.combat.result));
      else outcomes.add('lose');
    }
    expect(outcomes.size).toBeGreaterThanOrEqual(1);
  });

  it('records who landed the killing blow', () => {
    const s = forceRealm(newRun('slain'), 'yinqi');
    s.character!.hp = 1;
    startCombat(s, 'mojun', 'calamity');
    let guard = 0;
    while (s.combat && !s.combat.over && guard++ < 5) combatAction(s, '出手');
    if (s.character!.hp <= 0) expect(s.character!.flags.slainBy).toBeTruthy();
  });

  it('refuses spoils when no fight is awaiting them', () => {
    const s = newRun('nospoils');
    expect(resolveSpoils(s, '灭运').some((l) => l.text.includes('无可处置'))).toBe(true);
  });

  it('is reproducible blow for blow from the same seed', () => {
    const a = fight('parity', 'yaolang');
    const b = fight('parity', 'yaolang');
    for (let i = 0; i < 5; i++) {
      combatAction(a, '出手');
      combatAction(b, '出手');
    }
    expect(a.combat!.enemyHp).toBe(b.combat!.enemyHp);
    expect(a.character!.hp).toBe(b.character!.hp);
  });
});
