/**
 * events.ts — 遭遇解析
 *
 * Two audited rolls per 探索, in a fixed order:
 *
 *   1. **定桶** — D100, offset by `+气运×0.35 − 劫运×0.3`, lands in one of five
 *      omen buckets. High 气运 pushes the whole distribution rightward; a heavy
 *      劫运 drags it back, which is why a lucky-but-doomed character keeps
 *      meeting 小凶 on the way to something worse.
 *   2. **抽取** — a weighted pick inside the bucket.
 *
 * Destiny events bypass the wheel: they are checked first, and if the flag
 * chain is already satisfied one of them fires on a coin-weighted roll. This is
 * what gives the 图录 hunt its shape — the fragments arrive in order, but not
 * on a schedule.
 *
 * Choices publish their odds through `resolveChoices`, which computes the exact
 * D20 window before the player commits. The UI never recomputes anything.
 */

import { EVENTS, eventById } from '@/data/events';
import { INJURY_BY_ID } from '@/data/calamities';
import { itemById } from '@/data/items';
import { realmDef } from '@/data/realms';
import { startCombat } from './combat';
import { derive } from './derived';
import { roll, weightedPick } from './rng';
import { passesDaoYuanGate } from './seal';
import {
  BUCKET_KIND,
  type EventBucket,
  type EventChoice,
  type EventEffect,
  type GameEvent,
  type GameState,
  type LogEntry,
  type ResolvedChoice,
} from './types';
import { addItem, adjustCalamity, clamp, countItem, entry, removeItem } from './util';

// ============================================================================
// 定桶
// ============================================================================

export interface BucketBand {
  bucket: EventBucket;
  min: number;
  max: number;
}

/** The D100 → bucket ladder. Contiguous and total over 1..100 by construction. */
export const BUCKET_BANDS: readonly BucketBand[] = [
  { bucket: '大凶', min: 1, max: 12 },
  { bucket: '小凶', min: 13, max: 32 },
  { bucket: '平', min: 33, max: 66 },
  { bucket: '小吉', min: 67, max: 88 },
  { bucket: '大吉', min: 89, max: 100 },
];

export function fortuneOffset(state: GameState): number {
  const c = state.character!;
  return Math.round(c.fortune * 0.35 - c.calamity.value * 0.3);
}

export function bucketForRoll(value: number): EventBucket {
  const v = clamp(Math.round(value), 1, 100);
  for (const band of BUCKET_BANDS) {
    if (v >= band.min && v <= band.max) return band.bucket;
  }
  return '平';
}

// ============================================================================
// 资格
// ============================================================================

export function isEligible(state: GameState, ev: GameEvent): boolean {
  const c = state.character!;
  const order = realmDef(c.realm.realm).order;
  if (!ev.realmOrders.includes(order)) return false;
  if (ev.once && c.seenEvents.includes(ev.id)) return false;
  if (ev.requiresFlag && !c.flags[ev.requiresFlag]) return false;
  if (ev.forbidsFlag && c.flags[ev.forbidsFlag]) return false;
  if (ev.requiresRoute && c.routeId !== ev.requiresRoute) return false;
  if (ev.calamityRange) {
    const [lo, hi] = ev.calamityRange;
    if (c.calamity.value < lo || c.calamity.value > hi) return false;
  }
  if (ev.fortuneRange) {
    const [lo, hi] = ev.fortuneRange;
    if (c.fortune < lo || c.fortune > hi) return false;
  }
  if (!passesDaoYuanGate(c, ev)) return false;
  return true;
}

export function eventsInBucket(state: GameState, bucket: EventBucket): GameEvent[] {
  const kind = BUCKET_KIND[bucket];
  return EVENTS.filter((e) => e.kind === kind && isEligible(state, e));
}

export function eligibleDestiny(state: GameState): GameEvent[] {
  return EVENTS.filter((e) => e.kind === 'destiny' && isEligible(state, e));
}

// ============================================================================
// 抉择赔率
// ============================================================================

export function choiceChance(state: GameState, choice: EventChoice): number | null {
  if (!choice.check) return null;
  const c = state.character!;
  const attr = c.attributes[choice.check.attr];
  const successes = clamp(21 - choice.check.dc + attr, 0, 20);
  return successes * 5;
}

function costLabel(choice: EventChoice): string | null {
  if (!choice.pay) return null;
  const parts: string[] = [];
  if (choice.pay.stones) parts.push(`灵石 ${choice.pay.stones}`);
  if (choice.pay.merit) parts.push(`功德 ${choice.pay.merit}`);
  if (choice.pay.fortune) parts.push(`气运 ${choice.pay.fortune}`);
  if (choice.pay.itemId) parts.push(`${itemById(choice.pay.itemId)?.name ?? choice.pay.itemId} ×1`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function affordable(state: GameState, choice: EventChoice): boolean {
  const c = state.character!;
  const need = { ...(choice.requires ?? {}), ...(choice.pay ?? {}) };
  if (need.stones && c.spiritStones < need.stones) return false;
  if (need.merit && c.merit < need.merit) return false;
  if (need.fortune && c.fortune < need.fortune) return false;
  if (need.itemId && countItem(c.inventory, need.itemId) < 1) return false;
  if (choice.requires?.flag && !c.flags[choice.requires.flag]) return false;
  return true;
}

export function resolveChoices(state: GameState, ev: GameEvent): ResolvedChoice[] {
  return (ev.choices ?? []).map((choice) => ({
    id: choice.id,
    text: choice.text,
    chance: choiceChance(state, choice),
    checkLabel: choice.check
      ? `D20+${choice.check.attr === 'shenHun' ? '神魂' : choice.check.attr === 'tiPo' ? '体魄' : choice.check.attr === 'wuXing' ? '悟性' : choice.check.attr === 'dingLi' ? '定力' : '机变'} ≥ ${choice.check.dc}`
      : null,
    upside: choice.upside,
    downside: choice.downside,
    costLabel: costLabel(choice),
    affordable: affordable(state, choice),
  }));
}

// ============================================================================
// 效果
// ============================================================================

export function applyEventEffect(state: GameState, fx: EventEffect): LogEntry[] {
  const c = state.character!;
  const d = derive(c);
  const out: LogEntry[] = [];
  const notes: string[] = [];

  if (fx.narrative) out.push(entry(state.turn, '图录', fx.narrative, 'violet'));

  if (fx.exp) {
    const before = c.realm.exp;
    c.realm.exp = clamp(c.realm.exp + fx.exp, 0, c.realm.expNeeded);
    notes.push(`修为 ${c.realm.exp >= before ? '+' : '−'}${Math.abs(c.realm.exp - before)}`);
  }
  if (fx.hp) {
    c.hp = clamp(c.hp + fx.hp, 0, c.maxHp);
    notes.push(`气血 ${fx.hp > 0 ? '+' : '−'}${Math.abs(fx.hp)}`);
  }
  if (fx.mana) {
    c.mana = clamp(c.mana + fx.mana, 0, c.maxMana);
    notes.push(`法力 ${fx.mana > 0 ? '+' : '−'}${Math.abs(fx.mana)}`);
  }
  if (fx.stones) {
    c.spiritStones = Math.max(0, c.spiritStones + fx.stones);
    if (fx.stones > 0) state.stats.stonesEarned += fx.stones;
    notes.push(`灵石 ${fx.stones > 0 ? '+' : '−'}${Math.abs(fx.stones)}`);
  }
  if (fx.fortune) {
    const scaled = fx.fortune > 0 ? Math.round(fx.fortune * d.fortuneGainMult) : fx.fortune;
    c.fortune = clamp(c.fortune + scaled, 0, 100);
    notes.push(`气运 ${scaled > 0 ? '+' : '−'}${Math.abs(scaled)}`);
  }
  if (fx.calamity) {
    const scaled = fx.calamity > 0 ? Math.round(fx.calamity * d.calamityRate) : fx.calamity;
    adjustCalamity(state, scaled);
    notes.push(`劫运 ${scaled > 0 ? '+' : '−'}${Math.abs(scaled)}`);
  }
  if (fx.merit) {
    c.merit = clamp(c.merit + fx.merit, -300, 600);
    notes.push(`功德 ${fx.merit > 0 ? '+' : '−'}${Math.abs(fx.merit)}`);
  }
  if (fx.reputation) {
    const scaled = Math.round(fx.reputation * (fx.reputation > 0 ? d.reputationMult : 1));
    c.reputation = Math.max(0, c.reputation + scaled);
    notes.push(`声望 ${scaled > 0 ? '+' : '−'}${Math.abs(scaled)}`);
  }
  if (fx.attribute) {
    const [key, delta] = fx.attribute;
    c.attributes[key] = clamp(c.attributes[key] + delta, 0, 40);
    notes.push(`资质 ${key} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`);
  }
  if (fx.items) {
    for (const stack of fx.items) {
      addItem(c.inventory, stack.itemId, stack.count);
      notes.push(`得 ${itemById(stack.itemId)?.name ?? stack.itemId}×${stack.count}`);
    }
  }
  if (fx.injury) {
    const def = INJURY_BY_ID[fx.injury];
    if (def && !c.injuries.some((i) => i.id === def.id)) {
      c.injuries.push({
        id: def.id,
        name: def.name,
        severity: def.severity,
        turnsLeft: def.turns,
        effect: { ...def.effect },
      });
      notes.push(`伤势:${def.name}`);
    }
  }
  if (fx.flag) {
    const [key, value] = fx.flag;
    c.flags[key] = value;
  }

  // Equipment/HP ceilings can move when attributes or relics change.
  const d2 = derive(c);
  c.maxHp = d2.maxHp;
  c.maxMana = d2.maxMana;
  c.hp = clamp(c.hp, 0, c.maxHp);
  c.mana = clamp(c.mana, 0, c.maxMana);

  if (notes.length > 0) out.push(entry(state.turn, '系统', notes.join(' · '), 'normal'));
  if (fx.combat) out.push(...startCombat(state, fx.combat, 'event'));
  if (fx.death) c.flags.scriptedDeath = fx.death;
  return out;
}

// ============================================================================
// 探索
// ============================================================================

function present(state: GameState, ev: GameEvent): LogEntry[] {
  const c = state.character!;
  if (!c.seenEvents.includes(ev.id)) c.seenEvents.push(ev.id);
  const out = [entry(state.turn, '图录', `【${ev.name}】${ev.narrative}`, 'violet')];
  const options = resolveChoices(state, ev);
  // Only hand the player the wheel when they can actually turn it. An event
  // whose every option is out of reach passes by instead of trapping the phase.
  if (options.some((o) => o.affordable)) {
    state.pendingEvent = { eventId: ev.id, options };
    state.phase = 'event';
    return out;
  }
  if (options.length > 0) {
    out.push(entry(state.turn, '天机', '你站了一会儿,什么也做不了,于是走开。', 'calm'));
    return out;
  }
  if (ev.autoEffect) out.push(...applyEventEffect(state, ev.autoEffect));
  return out;
}

export function explore(state: GameState): LogEntry[] {
  const out: LogEntry[] = [];

  const destiny = eligibleDestiny(state);
  if (destiny.length > 0) {
    const d100 = roll(state, 'D100', '遭遇·因果');
    if (d100 <= 55) {
      const picked = weightedPick(state, destiny, (e) => e.weight, '遭遇·抽取〔因果〕');
      if (picked) {
        out.push(entry(state.turn, '天机', '有一条线绷紧了。', 'calm'));
        out.push(...present(state, picked));
        return out;
      }
    }
  }

  const base = roll(state, 'D100', '遭遇·定桶');
  const offset = fortuneOffset(state);
  const bucket = bucketForRoll(base + offset);
  out.push(
    entry(
      state.turn,
      '系统',
      `遭遇:D100=${base}${offset >= 0 ? '+' : '−'}${Math.abs(offset)} → 〔${bucket}〕。`,
      'normal',
    ),
  );

  const pool = eventsInBucket(state, bucket);
  if (pool.length === 0) {
    out.push(entry(state.turn, '图录', '走了很远,天地无话。', 'calm'));
    return out;
  }
  const picked = weightedPick(state, pool, (e) => e.weight, `遭遇·抽取〔${bucket}〕`);
  if (!picked) {
    out.push(entry(state.turn, '图录', '走了很远,天地无话。', 'calm'));
    return out;
  }
  out.push(...present(state, picked));
  return out;
}

// ============================================================================
// 抉择
// ============================================================================

export function chooseEventOption(state: GameState, choiceId: string): LogEntry[] {
  const pending = state.pendingEvent;
  const c = state.character!;
  if (!pending) return [entry(state.turn, '系统', '当前无待决之事。', 'normal')];
  const ev = eventById(pending.eventId);
  const choice = ev?.choices?.find((x) => x.id === choiceId);
  if (!ev || !choice) return [entry(state.turn, '系统', '无此抉择。', 'normal')];
  if (!affordable(state, choice)) {
    return [entry(state.turn, '系统', '力有不逮,此路不通。', 'danger')];
  }

  const out: LogEntry[] = [entry(state.turn, '系统', `你选择:${choice.text}。`, 'normal')];

  if (choice.pay) {
    if (choice.pay.stones) c.spiritStones -= choice.pay.stones;
    if (choice.pay.merit) c.merit -= choice.pay.merit;
    if (choice.pay.fortune) c.fortune = clamp(c.fortune - choice.pay.fortune, 0, 100);
    if (choice.pay.itemId) removeItem(c.inventory, choice.pay.itemId, 1);
  }

  state.pendingEvent = null;
  state.phase = 'playing';

  if (!choice.check) {
    out.push(...applyEventEffect(state, choice.success));
    return out;
  }

  const target = choice.check.dc - c.attributes[choice.check.attr];
  const d20 = roll(state, 'D20', `抉择·${ev.name}`);
  const passed = d20 >= target;
  out.push(
    entry(
      state.turn,
      '系统',
      `检定:D20=${d20},需 ≥ ${target}(DC ${choice.check.dc} − 属性 ${c.attributes[choice.check.attr]})→ ${passed ? '成' : '败'}。`,
      passed ? 'normal' : 'danger',
    ),
  );
  out.push(...applyEventEffect(state, passed ? choice.success : (choice.failure ?? {})));
  return out;
}
