import type { Character, GameState, Notice } from './types';
import { getItem, MANUAL_TECHNIQUE } from '@/data/items';
import { getTechnique } from '@/data/techniques';
import { getRealmDef, realmTier } from '@/data/realmData';
import { maxHpFor } from './attributes';
import { log } from './narrative';

export function addItem(c: Character, itemId: string, count = 1): void {
  const stack = c.inventory.find((s) => s.itemId === itemId);
  if (stack) stack.count += count;
  else c.inventory.push({ itemId, count });
}

export function removeItem(c: Character, itemId: string, count = 1): boolean {
  const stack = c.inventory.find((s) => s.itemId === itemId);
  if (!stack || stack.count < count) return false;
  stack.count -= count;
  if (stack.count === 0) c.inventory = c.inventory.filter((s) => s.count > 0);
  return true;
}

export function countItem(c: Character, itemId: string): number {
  return c.inventory.find((s) => s.itemId === itemId)?.count ?? 0;
}

/** 使用 <物品> — pills, manuals, misc. Returns notices for the UI. */
export function useItem(state: GameState, itemId: string): Notice[] {
  const c = state.character!;
  const def = getItem(itemId);
  const notices: Notice[] = [];

  if (def.kind === 'weapon' || def.kind === 'armor') {
    return equipItem(state, itemId);
  }

  if (def.kind === 'manual') {
    if (!removeItem(c, itemId, 1)) {
      log(state, '系统', '储物袋中并无此物。', 'muted');
      return notices;
    }
    if (itemId === 'canjuan') {
      const gain = c.flags.eidetic ? 30 : 15;
      c.realm.exp += gain;
      log(state, '天道', `残卷字迹漫漶，汝逐字参详，略有所得。（修为+${gain}）`);
      return notices;
    }
    const techId = MANUAL_TECHNIQUE[itemId];
    const tech = techId ? getTechnique(techId) : null;
    if (!tech) {
      log(state, '系统', '此典籍尚不可参悟。', 'muted');
      addItem(c, itemId, 1);
      return notices;
    }
    if (realmTier(c.realm.realm) < realmTier(tech.minRealm)) {
      log(state, '天道', `境界不足，强行参悟《${tech.name}》恐伤根基。`, 'muted');
      addItem(c, itemId, 1);
      return notices;
    }
    c.techniqueId = techId;
    log(state, '天道', `汝参悟《${tech.name}》，功法入体，气机为之一变。`, 'jade');
    notices.push({ kind: 'success', title: `习得《${tech.name}》`, desc: tech.desc });
    return notices;
  }

  if (def.kind === 'pill' || def.kind === 'misc' || def.kind === 'talisman') {
    if (!def.effect && def.kind !== 'pill') {
      log(state, '系统', '此物此刻无用。', 'muted');
      return notices;
    }
    if (!removeItem(c, itemId, 1)) {
      log(state, '系统', '储物袋中并无此物。', 'muted');
      return notices;
    }
    const parts: string[] = [];
    const eff = def.effect ?? {};
    if (eff.hp) {
      const before = c.hp;
      c.hp = Math.min(c.maxHp, c.hp + eff.hp);
      parts.push(`气血+${c.hp - before}`);
    }
    if (eff.exp) {
      c.realm.exp += eff.exp;
      parts.push(`修为+${eff.exp}`);
    }
    if (eff.breakthroughBonus) {
      c.flags.pillBreakthroughBonus = (Number(c.flags.pillBreakthroughBonus) || 0) + eff.breakthroughBonus;
      parts.push(`下次突破+${eff.breakthroughBonus}%`);
      notices.push({ kind: 'info', title: `${def.name}药力蕴于丹田`, desc: `下次突破成功率+${eff.breakthroughBonus}%` });
    }
    if (eff.attribute) {
      const [attr, delta] = eff.attribute;
      c.attributes[attr] += delta;
      c.maxHp = maxHpFor(c);
      parts.push(`${attr === 'genGu' ? '根骨' : attr === 'wuXing' ? '悟性' : attr === 'xinXing' ? '心性' : '气运'}+${delta}`);
      notices.push({ kind: 'success', title: `${def.name}生效`, desc: parts[parts.length - 1] });
    }
    if (eff.cureInjury && c.injuries.length > 0) {
      const cured = c.injuries.shift()!;
      parts.push(`【${cured.name}】痊愈`);
      notices.push({ kind: 'success', title: `伤势痊愈`, desc: `【${cured.name}】已愈` });
    }
    log(state, '天道', `汝服下${def.name}。${parts.length ? parts.join('，') + '。' : '无事发生。'}`);
    return notices;
  }

  log(state, '系统', '此物不可直接使用。', 'muted');
  return notices;
}

/** 装备 <物品> */
export function equipItem(state: GameState, itemId: string): Notice[] {
  const c = state.character!;
  const def = getItem(itemId);
  if (countItem(c, itemId) === 0) {
    log(state, '系统', '储物袋中并无此物。', 'muted');
    return [];
  }
  if (def.kind === 'weapon') {
    c.equipped.weapon = itemId;
    log(state, '系统', `已执${def.name}在手。（威能+${def.power ?? 0}）`, 'jade');
  } else if (def.kind === 'armor') {
    c.equipped.armor = itemId;
    log(state, '系统', `已着${def.name}。（防御+${def.defense ?? 0}）`, 'jade');
  } else {
    log(state, '系统', '此物不可装备。', 'muted');
    return [];
  }
  return [];
}

/** Injuries catalog. */
export const INJURY_DEFS: Record<string, { name: string; severity: 1 | 2 | 3; turns: number; effect: { speed?: number; power?: number; breakthrough?: number } }> = {
  xinmo: { name: '心魔暗伤', severity: 2, turns: 8, effect: { speed: 0.3, breakthrough: 10 } },
  jingmai: { name: '经脉受损', severity: 2, turns: 6, effect: { speed: 0.15, power: 0.2 } },
  neishang: { name: '内腑震伤', severity: 1, turns: 4, effect: { speed: 0.1, power: 0.1 } },
};

export function inflictInjury(state: GameState, injuryId: string): void {
  const c = state.character!;
  const def = INJURY_DEFS[injuryId];
  if (!def) return;
  if (c.injuries.some((i) => i.id === injuryId)) return; // no stacking
  const turnReduction = c.flags.hardy ? 1 : 0;
  c.injuries.push({
    id: injuryId,
    name: def.name,
    severity: def.severity,
    turnsLeft: Math.max(1, def.turns - turnReduction),
    effect: def.effect,
  });
  log(state, '天道', `汝落下【${def.name}】。伤不致命，然道途更艰。`, 'danger');
}

/** Called once per time-advancing turn: injuries slowly heal. */
export function tickInjuries(state: GameState): void {
  const c = state.character!;
  for (const inj of c.injuries) inj.turnsLeft -= 1;
  const healed = c.injuries.filter((i) => i.turnsLeft <= 0);
  c.injuries = c.injuries.filter((i) => i.turnsLeft > 0);
  for (const h of healed) log(state, '系统', `【${h.name}】已自愈。`, 'jade');
}

/** Storage-bag realm gate helper for market stock. */
export function marketStockFor(state: GameState) {
  const tier = realmTier(state.character!.realm.realm);
  return tier;
}

export function currentRealmName(state: GameState): string {
  return getRealmDef(state.character!.realm.realm).name;
}
