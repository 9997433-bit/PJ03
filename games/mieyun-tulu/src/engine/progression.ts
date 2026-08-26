/**
 * progression.ts — 功法 与 门派
 *
 * Learning a tier-1 technique *commits* the character to that route and closes
 * the other trunks permanently. 灭运图录道 is the single exception: it is
 * hidden until the three fragments wake, and it stacks on top of whatever the
 * character already walks, which is exactly why it is worth hunting.
 *
 * Sects screen applicants on both meters — 大梵寺 will not take a man dripping
 * with 劫运, 血蕴宗 will not take a saint — and pay a stipend against a 声望
 * ledger that only rises if you keep doing their kind of work.
 */

import { itemById } from '@/data/items';
import { realmDef, realmOrder } from '@/data/realms';
import { SECTS, sectById } from '@/data/sects';
import { ROUTE_BY_ID, techniqueById, TECHNIQUES } from '@/data/techniques';
import { derive } from './derived';
import { roll } from './rng';
import type { GameState, LogEntry, SectCreed, TechniqueNode } from './types';
import { addItem, clamp, entry } from './util';

// ============================================================================
// 功法
// ============================================================================

export interface TechniqueOffer {
  node: TechniqueNode;
  routeName: string;
  /** Published D100 target for the 悟性 check. */
  chance: number;
  affordable: boolean;
  blocked: string | null;
}

export function learnChance(state: GameState, node: TechniqueNode): number {
  const d = derive(state.character!);
  return clamp(Math.round(45 + d.learningBonus - node.difficulty), 5, 95);
}

export function techniqueOffers(state: GameState): TechniqueOffer[] {
  const c = state.character!;
  const order = realmOrder(c.realm.realm);
  const offers: TechniqueOffer[] = [];

  for (const node of TECHNIQUES) {
    if (c.learned.includes(node.id)) continue;
    const route = ROUTE_BY_ID[node.route];
    if (route.hidden && !(route.unlockFlag && c.flags[route.unlockFlag])) continue;
    if (node.tier === 1) {
      // 图录 stacks; every other trunk is mutually exclusive.
      if (c.routeId && c.routeId !== node.route && node.route !== 'tulu') continue;
    } else if (!node.requires || !c.learned.includes(node.requires)) {
      continue;
    }

    let blocked: string | null = null;
    if (order < realmOrder(node.minRealm)) {
      blocked = `需 ${realmDef(node.minRealm).name} 以上`;
    }
    offers.push({
      node,
      routeName: route.name,
      chance: learnChance(state, node),
      affordable: c.spiritStones >= node.costStones,
      blocked,
    });
  }
  return offers;
}

export function learnTechnique(state: GameState, techniqueId: string): LogEntry[] {
  const c = state.character!;
  const node = techniqueById(techniqueId);
  if (!node) return [entry(state.turn, '系统', '无此功法。', 'danger')];
  if (c.learned.includes(node.id)) {
    return [entry(state.turn, '系统', '此法已在身。', 'normal')];
  }
  const offer = techniqueOffers(state).find((o) => o.node.id === node.id);
  if (!offer) return [entry(state.turn, '系统', '此法与你无缘——路已择,或卷未开。', 'danger')];
  if (offer.blocked) return [entry(state.turn, '系统', offer.blocked, 'danger')];
  if (c.spiritStones < node.costStones) {
    return [entry(state.turn, '系统', `玄晶不足(需 ${node.costStones})。`, 'danger')];
  }

  c.spiritStones -= node.costStones;
  const target = offer.chance;
  const d100 = roll(state, 'D100', `习法·${node.name}`);
  const out = [
    entry(state.turn, '系统', `研习《${node.name}》:需 D100 ≤ ${target},掷得 ${d100}。`, 'normal'),
  ];
  if (d100 > target) {
    c.realm.exp = Math.max(0, c.realm.exp - Math.round(c.realm.expNeeded * 0.05));
    out.push(entry(state.turn, '图录', '读了三年,读不通。玄晶已付,岁月不返。', 'danger'));
    return out;
  }

  c.learned.push(node.id);
  if (node.tier === 1 && node.route !== 'tulu') c.routeId = node.route;
  if (node.route === 'tulu' && node.tier === 1) c.flags.tuluWalker = true;

  const d = derive(c);
  c.maxHp = d.maxHp;
  c.maxMana = d.maxMana;
  c.hp = clamp(c.hp, 0, c.maxHp);
  c.mana = clamp(c.mana, 0, c.maxMana);
  out.push(entry(state.turn, '图录', `《${node.name}》既成。${node.desc}`, 'gold'));
  if (node.tier === 1 && node.route !== 'tulu') {
    out.push(
      entry(state.turn, '天机', `自此走 ${ROUTE_BY_ID[node.route].name}。其余四门,门已阖。`, 'calm'),
    );
  }
  return out;
}

// ============================================================================
// 门派
// ============================================================================

export interface SectOffer {
  id: string;
  name: string;
  desc: string;
  routeName: string;
  tuition: number;
  stipend: number;
  discount: number;
  eligible: boolean;
  reason: string | null;
}

export function sectOffers(state: GameState): SectOffer[] {
  const c = state.character!;
  const order = realmOrder(c.realm.realm);
  return SECTS.map((s) => {
    let reason: string | null = null;
    if (s.route === 'tulu' && !c.flags.tuluTrace && !c.flags.tuluAwake) {
      reason = '此脉不收生人';
    } else if (order < s.minRealmOrder) {
      reason = `需 ${realmDef('yinqi').name} 以上`;
    } else if (c.calamity.value > s.maxCalamity) {
      reason = `劫运过重(上限 ${s.maxCalamity})`;
    } else if (c.merit < s.minMerit) {
      reason = `功德不足(需 ${s.minMerit})`;
    } else if (c.spiritStones < s.tuition) {
      reason = `束脩不足(需 ${s.tuition})`;
    } else if (c.sectId === s.id) {
      reason = '已在门中';
    }
    return {
      id: s.id,
      name: s.name,
      desc: s.desc,
      routeName: ROUTE_BY_ID[s.route].name,
      tuition: s.tuition,
      stipend: s.stipend,
      discount: s.discount,
      eligible: reason === null,
      reason,
    };
  });
}

export function joinSect(state: GameState, sectId: string): LogEntry[] {
  const c = state.character!;
  const offer = sectOffers(state).find((o) => o.id === sectId);
  const sect = sectById(sectId);
  if (!sect || !offer) return [entry(state.turn, '系统', '无此门派。', 'danger')];
  if (!offer.eligible) return [entry(state.turn, '系统', offer.reason ?? '不合规矩。', 'danger')];

  c.spiritStones -= sect.tuition;
  c.sectId = sect.id;
  c.sectRankIndex = -1;
  c.reputation = Math.max(c.reputation, 0);
  return [
    entry(state.turn, '图录', `入 ${sect.name}。${sect.desc}`, 'violet'),
    entry(state.turn, '系统', `束脩 ${sect.tuition};此后每载得月俸 ${sect.stipend} 玄晶。`, 'normal'),
  ];
}

export function leaveSect(state: GameState): LogEntry[] {
  const c = state.character!;
  if (!c.sectId) return [entry(state.turn, '系统', '你本无门无派。', 'normal')];
  const name = sectById(c.sectId)?.name ?? c.sectId;
  c.sectId = null;
  c.sectRankIndex = -1;
  c.reputation = Math.round(c.reputation * 0.4);
  c.merit -= 10;
  return [entry(state.turn, '图录', `自 ${name} 除名。声望折半,功德 −10。`, 'danger')];
}

/**
 * Credit (or debit) the 声望 ledger for a deed the character's sect cares about.
 * A non-member does nothing worth reporting to anybody, so this is a no-op.
 * Returns the entries to fold into whatever log the deed already produces.
 */
export function creditDeed(
  state: GameState,
  deed: keyof SectCreed,
  multiplier = 1,
): LogEntry[] {
  const c = state.character!;
  const sect = sectById(c.sectId);
  if (!sect) return [];
  const delta = Math.round(sect.creed[deed] * multiplier * derive(c).reputationMult);
  if (delta === 0) return [];
  const before = c.reputation;
  c.reputation = Math.max(0, c.reputation + delta);
  if (c.reputation === before) return [];
  return [
    entry(
      state.turn,
      '系统',
      `${sect.name}记了这一笔:声望 ${delta > 0 ? '+' : ''}${c.reputation - before}(共 ${c.reputation})。`,
      delta > 0 ? 'normal' : 'danger',
    ),
  ];
}

/** Upkeep hook: pay the stipend and promote when the 声望 ledger allows. */
export function sectUpkeep(state: GameState): LogEntry[] {
  const c = state.character!;
  const sect = sectById(c.sectId);
  if (!sect) return [];
  const out: LogEntry[] = [];
  c.spiritStones += sect.stipend;
  state.stats.stonesEarned += sect.stipend;

  while (c.sectRankIndex + 1 < sect.ranks.length) {
    const nextRank = sect.ranks[c.sectRankIndex + 1]!;
    if (c.reputation < nextRank.reputation) break;
    c.sectRankIndex += 1;
    const parts: string[] = [];
    if (nextRank.reward.stones) {
      c.spiritStones += nextRank.reward.stones;
      state.stats.stonesEarned += nextRank.reward.stones;
      parts.push(`玄晶 ${nextRank.reward.stones}`);
    }
    if (nextRank.reward.merit) {
      c.merit = clamp(c.merit + nextRank.reward.merit, -300, 600);
      parts.push(`功德 ${nextRank.reward.merit}`);
    }
    if (nextRank.reward.itemId) {
      addItem(c.inventory, nextRank.reward.itemId, 1);
      parts.push(itemById(nextRank.reward.itemId)?.name ?? nextRank.reward.itemId);
    }
    if (nextRank.reward.techniqueId && !c.learned.includes(nextRank.reward.techniqueId)) {
      c.learned.push(nextRank.reward.techniqueId);
      parts.push(techniqueById(nextRank.reward.techniqueId)?.name ?? nextRank.reward.techniqueId);
    }
    out.push(
      entry(
        state.turn,
        '图录',
        `${sect.name}升你为「${nextRank.title}」${parts.length > 0 ? `,赐 ${parts.join('、')}` : ''}。`,
        'gold',
      ),
    );
  }
  return out;
}

export function sectRankTitle(state: GameState): string | null {
  const c = state.character!;
  const sect = sectById(c.sectId);
  if (!sect || c.sectRankIndex < 0) return null;
  return sect.ranks[c.sectRankIndex]?.title ?? null;
}
