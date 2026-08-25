/**
 * npc.ts — 人物好感 (favor) system: -100…100, thresholds unlock flags.
 */

import type { GameState, Npc } from './types';
import { say, sys } from './prose';
import { countItem, removeItem, resolveItem } from './inventory';
import { applyEventEffect } from './effects';

export function resolveNpc(state: GameState, ref: string): Npc | undefined {
  const needle = ref.trim();
  return state.npcs[needle] ?? Object.values(state.npcs).find((n) => n.name === needle);
}

export function changeFavor(state: GameState, npcId: string, delta: number): void {
  const npc = state.npcs[npcId];
  if (!npc || delta === 0) return;
  const before = npc.favor;
  npc.favor = Math.max(-100, Math.min(100, npc.favor + delta));
  if (npc.favor === before) return;

  sys(state, `${npc.name}对汝的态度${delta > 0 ? '亲近' : '冷淡'}了几分。(好感 ${before} → ${npc.favor})`, delta > 0 ? 'jade' : 'danger');

  // threshold crossings fire once, tracked by flagKey (falls back to a derived key)
  for (const th of npc.thresholds) {
    const crossedUp = th.at >= 0 && before < th.at && npc.favor >= th.at;
    const crossedDown = th.at < 0 && before > th.at && npc.favor <= th.at;
    const flagKey = th.flagKey ?? `npc_${npc.id}_${th.at}`;
    if ((crossedUp || crossedDown) && !th.done && !state.character?.flags[flagKey]) {
      th.done = true;
      if (state.character) state.character.flags[flagKey] = true;
      say(state, `【${npc.name}】—— ${th.unlock}`, th.at >= 0 ? 'gold' : 'danger');
      if (th.effect) applyEventEffect(state, th.effect);
    }
  }
}

/** the 赠礼 command — favor gain scales with item grade */
export function giftItem(state: GameState, npcRef: string, itemRef?: string): void {
  const c = state.character;
  if (!c) return;
  const npc = resolveNpc(state, npcRef);
  if (!npc) {
    sys(state, `汝识得的人里,没有「${npcRef}」。`);
    return;
  }
  if (!itemRef) {
    sys(state, `空手登门,礼数不周。(用法:赠礼 ${npc.name} 物品名)`);
    return;
  }
  const def = resolveItem(itemRef);
  if (!def || countItem(state, def.id) <= 0) {
    sys(state, `储物袋中并无「${itemRef}」。`);
    return;
  }
  removeItem(state, def.id, 1);
  const gain = def.grade * 5;
  say(state, `汝将【${def.name}】奉上。${npc.name}端详片刻,收下了。`);
  changeFavor(state, npc.id, gain);
}
