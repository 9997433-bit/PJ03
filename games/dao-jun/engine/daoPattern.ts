import type { DaoPath, DaoPatternState } from './types';

const PATH_PATTERNS: Record<DaoPath, string[]> = {
  剑: ['断岳剑纹', '流光剑纹', '无回剑纹', '万锋归一纹'],
  法: ['五雷法纹', '玄冰法纹', '离火法纹', '周天法纹'],
  体: ['镇山体纹', '龙象体纹', '不灭体纹', '混元体纹'],
  神: ['照魂神纹', '寂念神纹', '太虚神纹', '万念神纹'],
};

export function createDaoPattern(): DaoPatternState {
  return { insight: 0, engraved: 0, harmony: 50, namedPatterns: [] };
}

export function insightNeeded(engraved: number): number {
  return 12 + Math.max(0, Math.trunc(engraved)) * 4;
}

export function canEngrave(pattern: DaoPatternState): boolean {
  return pattern.insight >= insightNeeded(pattern.engraved) && pattern.harmony >= 20;
}

export function comprehend(pattern: DaoPatternState, amount: number): DaoPatternState {
  const gain = Math.max(0, Math.trunc(amount));
  return {
    ...pattern,
    insight: pattern.insight + gain,
    harmony: Math.min(100, pattern.harmony + (gain > 0 ? Math.max(1, Math.floor(gain / 5)) : 0)),
  };
}

export function engravePattern(pattern: DaoPatternState, path: DaoPath): DaoPatternState {
  if (!canEngrave(pattern)) return pattern;
  const cost = insightNeeded(pattern.engraved);
  const names = PATH_PATTERNS[path];
  const name = names[pattern.engraved % names.length]!;
  return {
    insight: pattern.insight - cost,
    engraved: pattern.engraved + 1,
    harmony: Math.max(0, pattern.harmony - 8),
    namedPatterns: [...pattern.namedPatterns, name],
  };
}

export function patternPower(pattern: DaoPatternState): number {
  return pattern.engraved * 12 + Math.floor(pattern.insight / 3) + Math.floor(pattern.harmony / 10);
}

export function patternsForBreakthrough(realm: number): number {
  return realm + 1;
}

export function harmonize(pattern: DaoPatternState, amount: number): DaoPatternState {
  return { ...pattern, harmony: Math.max(0, Math.min(100, pattern.harmony + amount)) };
}
