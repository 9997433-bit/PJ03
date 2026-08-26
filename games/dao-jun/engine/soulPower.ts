import type { DaoPath, SoulState } from './types';

export function createSoul(path: DaoPath): SoulState {
  const bonus = path === '神' ? 20 : path === '法' ? 8 : 0;
  return { power: 50 + bonus, maxPower: 50 + bonus, stability: path === '神' ? 65 : 55 };
}

export function canSpendSoul(soul: SoulState, amount: number): boolean {
  return amount >= 0 && soul.power >= amount;
}

export function spendSoul(soul: SoulState, amount: number): SoulState {
  if (!canSpendSoul(soul, amount)) return soul;
  return { ...soul, power: soul.power - amount, stability: Math.max(0, soul.stability - Math.ceil(amount / 8)) };
}

export function restoreSoul(soul: SoulState, amount: number): SoulState {
  return { ...soul, power: Math.min(soul.maxPower, soul.power + Math.max(0, amount)) };
}

export function temperSoul(soul: SoulState, gain: number): SoulState {
  const safeGain = Math.max(0, gain);
  if (safeGain === 0) return soul;
  const maxPower = soul.maxPower + safeGain;
  return {
    power: Math.min(maxPower, soul.power + Math.ceil(safeGain / 2)),
    maxPower,
    stability: Math.min(100, soul.stability + Math.max(1, Math.floor(safeGain / 3))),
  };
}

export function shakeSoul(soul: SoulState, severity: number): SoulState {
  return {
    ...soul,
    power: Math.max(0, soul.power - Math.max(0, severity)),
    stability: Math.max(0, soul.stability - Math.ceil(Math.max(0, severity) / 2)),
  };
}

export function soulCombatPower(soul: SoulState, path: DaoPath): number {
  const affinity = path === '神' ? 1.35 : path === '法' ? 1.12 : 1;
  return Math.floor((soul.maxPower * 0.45 + soul.stability * 0.25) * affinity);
}
