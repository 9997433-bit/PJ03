/**
 * quests.ts — main story (3-choice nodes) + objective side quests.
 * Objectives are re-scanned after every command (turn.ts), so no trigger
 * plumbing is needed at every mutation site.
 */

import type { GameState, Quest, QuestObjective } from './types';
import { realmAtLeast } from './audit';
import { realmTier } from './realms';
import { applyEventEffect } from './effects';
import { countItem, removeItem } from './inventory';
import { say, sys } from './prose';

export function activeQuests(state: GameState): Quest[] {
  return state.quests.filter((q) => q.status === 'active');
}

/** the 任务 command (free action) */
export function viewQuests(state: GameState): void {
  const active = activeQuests(state);
  const done = state.quests.filter((q) => q.status === 'done').length;
  if (active.length === 0) {
    sys(state, `眼下因果两清,无事缠身。(已了结${done}桩)`);
    return;
  }
  const lines = active
    .map((q) => {
      const tag = q.kind === 'main' ? `主线·第${q.chapter}章` : '支线';
      const choiceHint = q.choices ? `(抉择:${q.choices.map((c, i) => `${i + 1}.${c.text}`).join(' / ')})` : '';
      return `  【${tag}】${q.title} — ${q.narrative}${choiceHint}`;
    })
    .join('\n');
  sys(state, `未了之事:\n${lines}`);
}

function objectiveMet(state: GameState, obj: QuestObjective): boolean {
  const c = state.character;
  if (!c) return false;
  switch (obj.type) {
    case 'reachRealm':
      return !!obj.target && realmAtLeast(c.realm.realm, obj.target);
    case 'killEnemy':
      return Number(c.flags[`kills_${obj.target ?? ''}`] ?? 0) >= (obj.n ?? 1);
    case 'killCount':
      return (state.killCount ?? 0) >= (obj.n ?? 1);
    case 'obtainItem':
      return !!obj.target && countItem(state, obj.target) >= (obj.n ?? 1);
    case 'favor': {
      const npc = obj.target ? state.npcs[obj.target] : undefined;
      return !!npc && npc.favor >= (obj.n ?? 50);
    }
    default:
      return false;
  }
}

function completeQuest(state: GameState, quest: Quest): void {
  quest.status = 'done';
  say(state, `【${quest.title}】已了。`, 'gold');
  // hand-in quests consume the collected goods
  if (quest.objective?.type === 'obtainItem' && quest.objective.target) {
    removeItem(state, quest.objective.target, quest.objective.n ?? 1);
  }
  applyEventEffect(state, quest.reward);

  // main story advances chapter by chapter
  if (quest.kind === 'main' && quest.chapter) {
    const next = state.quests.find((q) => q.kind === 'main' && q.chapter === quest.chapter! + 1);
    if (next && next.status === 'locked') {
      next.status = 'active';
      say(state, `因果流转,新的一章已然翻开——【${next.title}】。`, 'jade');
    }
  }
}

/** unlock gating: predecessor done + realm floor reached */
function questUnlockable(state: GameState, quest: Quest): boolean {
  const c = state.character;
  if (!c) return false;
  if (quest.unlockAfter) {
    const prev = state.quests.find((q) => q.id === quest.unlockAfter);
    if (!prev || prev.status !== 'done') return false;
  }
  if (quest.minRealm && realmTier(c.realm.realm) < realmTier(quest.minRealm)) return false;
  return true;
}

/** scan all quests; unlock what has opened, complete any whose conditions are met */
export function checkQuestProgress(state: GameState): void {
  if (!state.character || state.phase === 'ended') return;
  for (const quest of state.quests) {
    if (quest.status === 'locked' && (quest.unlockAfter || quest.minRealm) && questUnlockable(state, quest)) {
      quest.status = 'active';
      say(state, `新的因果落于汝身——【${quest.title}】。`, 'jade');
    }
    if (quest.status !== 'active' || !quest.objective) continue;
    if (objectiveMet(state, quest.objective)) {
      completeQuest(state, quest);
    }
  }
}

/** narrow trigger used by modules that want an immediate check */
export function checkQuestTrigger(
  state: GameState,
  _trigger: { type: QuestObjective['type']; target: string },
): void {
  checkQuestProgress(state);
}

/** the 抉择 command for main-story 3-choice nodes */
export function chooseQuestOption(state: GameState, questId: string, choiceIndex: number): void {
  const quest = state.quests.find((q) => q.id === questId);
  if (!quest || quest.status !== 'active' || !quest.choices) {
    sys(state, '此事无从抉择。');
    return;
  }
  const choice = quest.choices[choiceIndex];
  if (!choice) {
    sys(state, `抉择须在 1 与 ${quest.choices.length} 之间。`);
    return;
  }
  say(state, `汝之抉择:${choice.text}。`, 'muted');
  quest.status = 'done';
  if (choice.effect) applyEventEffect(state, choice.effect);
  if (choice.outcomeQuestId) {
    const follow = state.quests.find((q) => q.id === choice.outcomeQuestId);
    if (follow && follow.status === 'locked') {
      follow.status = 'active';
      say(state, `新的因果落于汝身——【${follow.title}】。`, 'jade');
    }
  } else if (quest.kind === 'main' && quest.chapter) {
    const next = state.quests.find((q) => q.kind === 'main' && q.chapter === quest.chapter! + 1);
    if (next && next.status === 'locked') {
      next.status = 'active';
      say(state, `因果流转,新的一章已然翻开——【${next.title}】。`, 'jade');
    }
  }
}
