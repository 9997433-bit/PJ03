/**
 * inventory.ts — 储物袋: stacks, use, equip.
 */

import type { GameState, ItemDef } from './types';
import { calcMaxHp } from './attributes';
import { gainExp } from './cultivation';
import { say, sys } from './narrative';
import { ITEMS, getItem, getTechnique, getCombatArt } from '@/data';

/** resolve an item reference by id OR display name */
export function resolveItem(ref: string): ItemDef | undefined {
  const needle = ref.trim();
  return ITEMS.find((i) => i.id === needle) ?? ITEMS.find((i) => i.name === needle);
}

export function countItem(state: GameState, itemId: string): number {
  const c = state.character;
  if (!c) return 0;
  return c.inventory.find((s) => s.itemId === itemId)?.count ?? 0;
}

export function addItem(state: GameState, itemId: string, count = 1, silent = false): void {
  const c = state.character;
  if (!c || count <= 0) return;
  const def = getItem(itemId);
  if (!def) return;
  const stack = c.inventory.find((s) => s.itemId === itemId);
  if (stack) stack.count += count;
  else c.inventory.push({ itemId, count });
  if (!silent) sys(state, `获得【${def.name}】×${count}。`, 'jade');
}

export function removeItem(state: GameState, itemId: string, count = 1): boolean {
  const c = state.character;
  if (!c) return false;
  const stack = c.inventory.find((s) => s.itemId === itemId);
  if (!stack || stack.count < count) return false;
  stack.count -= count;
  if (stack.count === 0) {
    c.inventory = c.inventory.filter((s) => s !== stack);
  }
  return true;
}

export function hasMaterials(state: GameState, materials: { itemId: string; count: number }[]): boolean {
  return materials.every((m) => countItem(state, m.itemId) >= m.count);
}

/**
 * the 使用 command (outside combat; combat consumption goes through combat.ts).
 * Returns true if the item was consumed.
 */
export function useItem(state: GameState, ref: string): boolean {
  const c = state.character;
  if (!c) return false;
  const def = resolveItem(ref);
  if (!def) {
    sys(state, `储物袋中并无「${ref}」。`);
    return false;
  }
  if (countItem(state, def.id) <= 0) {
    sys(state, `储物袋中并无【${def.name}】。`);
    return false;
  }
  const fx = def.effect;
  if (!fx) {
    sys(state, `【${def.name}】非可用之物。`);
    return false;
  }
  if (fx.escape || fx.damage) {
    sys(state, `【${def.name}】乃战斗之物,此刻无处施展。`);
    return false;
  }

  removeItem(state, def.id, 1);
  if (def.kind === 'pill') state.stats.pillsConsumed++;

  if (fx.hp) {
    const before = c.hp;
    c.hp = Math.min(c.maxHp, c.hp + fx.hp);
    sys(state, `服下【${def.name}】,气血 +${c.hp - before}(${c.hp}/${c.maxHp})。`, 'jade');
  }
  if (fx.exp) {
    say(state, `【${def.name}】药力化开,丝丝灵气自四肢百骸涌向丹田。`);
    gainExp(state, fx.exp);
    sys(state, `修为 +${fx.exp}。`, 'jade');
  }
  if (fx.breakthroughBonus) {
    c.breakthroughBonus = Math.max(c.breakthroughBonus, fx.breakthroughBonus);
    say(state, `药力盘踞丹田,引而不发——只待汝叩关之日。`, 'gold');
    sys(state, `下一次突破成功率 +${fx.breakthroughBonus}%。`, 'gold');
  }
  if (fx.attribute) {
    const [attr, delta] = fx.attribute;
    c.attributes[attr] += delta;
    c.maxHp = calcMaxHp(c);
    c.hp = Math.min(c.hp, c.maxHp);
    const names: Record<string, string> = {
      genGu: '根骨',
      wuXing: '悟性',
      xinXing: '心性',
      qiYun: '气运',
      jiYuan: '机缘',
    };
    say(state, `药力涤荡筋骨,汝只觉脱胎换骨,焕然一新。`, 'gold');
    if (attr !== 'jiYuan') {
      sys(state, `${names[attr]} +${delta}。`, 'gold');
    }
  }
  if (fx.cureInjury && c.injuries.length > 0) {
    const worst = [...c.injuries].sort((a, b) => b.severity - a.severity)[0]!;
    c.injuries = c.injuries.filter((i) => i !== worst);
    say(state, `药至伤除,【${worst.name}】尽愈。`, 'jade');
  }
  if (fx.cureStatus) {
    const debuffs = c.statusEffects.filter((s) => s.kind === 'debuff');
    if (debuffs.length > 0) {
      c.statusEffects = c.statusEffects.filter((s) => s.kind !== 'debuff');
      say(state, `丹香入脑,识海霎时清明,阴霾尽散。`, 'jade');
    } else {
      sys(state, `心境本自澄澈,此丹药力空掷。`);
    }
  }
  if (fx.status) {
    const existing = c.statusEffects.find((s) => s.id === fx.status!.id);
    if (existing) existing.turnsLeft = Math.max(existing.turnsLeft, fx.status.turnsLeft);
    else c.statusEffects.push(structuredClone(fx.status));
    sys(state, `获得状态【${fx.status.name}】:${fx.status.desc}`, 'jade');
  }
  if (fx.teachTechnique) {
    const t = getTechnique(fx.teachTechnique);
    if (t) {
      c.techniqueId = t.id;
      say(state, `汝彻夜参读,将《${t.name}》纳入行功路线。${t.desc}`, 'gold');
    }
  }
  if (fx.teachArt) {
    const a = getCombatArt(fx.teachArt);
    if (a && !c.combatArts.includes(a.id)) {
      c.combatArts.push(a.id);
      say(state, `汝习得术法【${a.name}】。${a.desc}`, 'gold');
    }
  }
  return true;
}

/** the 装备 command */
export function equipItem(state: GameState, ref: string): void {
  const c = state.character;
  if (!c) return;
  const def = resolveItem(ref);
  if (!def || countItem(state, def.id) <= 0) {
    sys(state, `储物袋中并无「${ref}」。`);
    return;
  }
  if (def.kind === 'weapon') {
    c.equipped.weapon = def.id;
    sys(state, `汝将【${def.name}】负于身侧。(威能 +${def.power ?? 0})`, 'jade');
  } else if (def.kind === 'armor') {
    c.equipped.armor = def.id;
    sys(state, `汝贴身穿上【${def.name}】。(防御 +${def.defense ?? 0})`, 'jade');
  } else if (def.kind === 'manual') {
    sys(state, `典籍须「使用」参读,不可披挂上阵。`);
  } else {
    sys(state, `【${def.name}】非可装备之物。`);
  }
}
