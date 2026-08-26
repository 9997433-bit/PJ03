import { patternPower } from './daoPattern';
import { soulCombatPower } from './soulPower';
import { territoryPower } from './territory';
import type { GameState } from './types';

/**
 * 战力 — the single number every contest (斗法 / 占地) is measured against:
 * realm, engraved patterns, soul, held territory, and a flat path affinity.
 */
export function totalPower(state: GameState): number {
  const { character } = state;
  const pathBonus = character.path === '剑' ? 16 : character.path === '体' ? 14 : 0;
  return (
    20 +
    character.realm * 30 +
    patternPower(state.daoPattern) +
    soulCombatPower(state.soul, character.path) +
    territoryPower(state.territory) +
    pathBonus
  );
}

/** Offensive rating used per combat strike. */
export function strikeRating(state: GameState): number {
  return Math.max(6, Math.round(totalPower(state) / 3));
}

/** Defensive rating: body bulk plus a settled soul turn blows aside. */
export function wardRating(state: GameState): number {
  return Math.round(state.character.maxHealth / 8 + state.soul.stability / 6);
}
