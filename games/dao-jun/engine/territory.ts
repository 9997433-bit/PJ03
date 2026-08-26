import type { TerritoryState } from './types';

export function createTerritory(): TerritoryState {
  return { nodes: 0, control: 30, food: 80, spiritStones: 35, influence: 0 };
}

export function claimDifficulty(nodes: number): number {
  return 32 + Math.max(0, nodes) * 18;
}

export function canClaim(territory: TerritoryState): boolean {
  return territory.food >= 10 && territory.control >= 10;
}

export function claimTerritory(territory: TerritoryState, margin: number): TerritoryState {
  if (!canClaim(territory) || margin < 0) return territory;
  return {
    nodes: territory.nodes + 1,
    control: Math.min(100, territory.control + Math.min(12, 5 + Math.floor(margin / 10))),
    food: territory.food - 10,
    spiritStones: territory.spiritStones + 18 + territory.nodes * 4,
    influence: territory.influence + 8 + territory.nodes * 2,
  };
}

export function loseTerritory(territory: TerritoryState, severity: number): TerritoryState {
  const loss = Math.max(0, severity);
  return {
    ...territory,
    control: Math.max(0, territory.control - loss),
    food: Math.max(0, territory.food - (loss > 0 ? 5 : 0)),
  };
}

export function harvestTerritory(territory: TerritoryState): TerritoryState {
  return {
    ...territory,
    food: Math.min(999, territory.food + 2 + territory.nodes * 3),
    spiritStones: Math.min(9999, territory.spiritStones + territory.nodes * 2),
    control: Math.max(0, territory.control - (territory.nodes > 0 ? 1 : 0)),
  };
}

export function territoryPower(territory: TerritoryState): number {
  return territory.nodes * 16 + Math.floor(territory.control / 4) + Math.floor(territory.influence / 5);
}
