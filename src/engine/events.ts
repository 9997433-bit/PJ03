/**
 * events.ts — the per-turn D100 event engine.
 *
 * effective = clamp(D100 + (气运−5)×2, 1, 100)
 * buckets: 1–10 大凶 · 11–30 小凶 · 31–70 平 · 71–90 小吉 · 91–100 大吉
 * A weighted pick within the bucket, filtered by realm tier, flags and the
 * hidden 机缘 gate (机缘 ≥ minJiYuan unlocks destiny events).
 */

import type { EventBucket, GameEvent, GameState } from './types';
import { recordRoll } from './audit';
import { applyEventEffect } from './effects';
import { say, sys } from './prose';
import { EVENTS, getEvent } from '@/data';

export function bucketOf(effective: number): EventBucket {
  if (effective <= 10) return '大凶';
  if (effective <= 30) return '小凶';
  if (effective <= 70) return '平';
  if (effective <= 90) return '小吉';
  return '大吉';
}

const BUCKET_TONE: Record<EventBucket, 'danger' | 'muted' | 'normal' | 'jade' | 'gold'> = {
  大凶: 'danger',
  小凶: 'danger',
  平: 'muted',
  小吉: 'jade',
  大吉: 'gold',
};

function eligibleEvents(state: GameState, bucket: EventBucket): GameEvent[] {
  const c = state.character!;
  return EVENTS.filter((e) => {
    if (e.bucket !== bucket) return false;
    if (!e.realmTier.includes(c.realm.realm)) return false;
    if (e.minJiYuan && c.attributes.jiYuan < e.minJiYuan) return false;
    if (e.once && c.flags[`evt_${e.id}`]) return false;
    if (e.requiresFlag) {
      if (typeof e.requiresFlag === 'string') {
        if (!c.flags[e.requiresFlag]) return false;
      } else if (c.flags[e.requiresFlag[0]] !== e.requiresFlag[1]) {
        return false;
      }
    }
    return true;
  });
}

/** end-of-turn event roll — called by turn.ts after time advances */
export function rollTurnEvent(state: GameState): void {
  const c = state.character;
  if (!c || state.phase !== 'playing' || state.pendingEvent) return;

  const roll = recordRoll(state, 'D100', '遭遇事件');
  const effective = Math.max(1, Math.min(100, roll + (c.attributes.qiYun - 5) * 2));
  const bucket = bucketOf(effective);

  const pool = eligibleEvents(state, bucket);
  if (pool.length === 0) return; // a quiet season

  // weighted pick, audited
  const totalWeight = pool.reduce((a, e) => a + e.weight, 0);
  const pickRoll = recordRoll(state, 'D100', '事件抉择');
  let cursor = ((pickRoll - 1) / 99) * totalWeight;
  let chosen: GameEvent = pool[0]!;
  for (const e of pool) {
    if (cursor < e.weight) {
      chosen = e;
      break;
    }
    cursor -= e.weight;
  }

  fireEvent(state, chosen, bucket);
}

function fireEvent(state: GameState, event: GameEvent, bucket: EventBucket): void {
  const c = state.character!;
  sys(state, `—— ${bucket} · ${event.name} ——`, BUCKET_TONE[bucket]);
  say(state, event.narrative, bucket === '大凶' ? 'danger' : bucket === '大吉' ? 'gold' : 'normal');

  if (event.once) c.flags[`evt_${event.id}`] = true;

  if (event.choices && event.choices.length > 0) {
    state.pendingEvent = {
      eventId: event.id,
      narrative: event.narrative,
      choices: event.choices.map((ch) => ({
        text: ch.text,
        ...(ch.check ? { check: ch.check } : {}),
      })),
    };
    const lines = event.choices.map((ch, i) => `  ${i + 1}. ${ch.text}`).join('\n');
    sys(state, `何去何从?\n${lines}\n(输入序号抉择)`);
    return;
  }
  if (event.autoEffect) {
    applyEventEffect(state, event.autoEffect);
  }
}

/** resolve the player's pending event choice */
export function resolveEventChoice(state: GameState, choiceIndex: number): void {
  const c = state.character;
  const pending = state.pendingEvent;
  if (!c || !pending) {
    sys(state, '眼下并无待决之事。');
    return;
  }
  const event = getEvent(pending.eventId);
  if (!event || !event.choices) {
    state.pendingEvent = null;
    return;
  }
  const choice = event.choices[choiceIndex];
  if (!choice) {
    sys(state, `抉择须在 1 与 ${event.choices.length} 之间。`);
    return;
  }

  state.pendingEvent = null;
  say(state, `汝之抉择:${choice.text}。`, 'muted');

  if (choice.check) {
    const { attr, dc } = choice.check;
    const names: Record<string, string> = {
      genGu: '根骨',
      wuXing: '悟性',
      xinXing: '心性',
      qiYun: '气运',
      jiYuan: '机缘',
    };
    const d20 = recordRoll(state, 'D20', `事件检定·${event.name}`, attr === 'jiYuan');
    const total = d20 + c.attributes[attr];
    const passed = total >= dc;
    if (attr === 'jiYuan') {
      // hidden attribute: show the roll, never the modifier or total
      sys(state, `冥冥之中,自有定数。(D20=${d20})`, passed ? 'jade' : 'danger');
    } else {
      sys(state, `检定:D20=${d20} + ${names[attr]}${c.attributes[attr]} = ${total},须 ≥ ${dc}——${passed ? '成' : '败'}。`, passed ? 'jade' : 'danger');
    }
    if (passed) {
      applyEventEffect(state, choice.success);
    } else if (choice.failure) {
      applyEventEffect(state, choice.failure);
    } else {
      say(state, '此事无果而终。');
    }
  } else {
    applyEventEffect(state, choice.success);
  }
}
