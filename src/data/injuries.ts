/**
 * 伤势 templates — instantiated (cloned) onto the character by the engine.
 */
import type { Injury } from '@/engine/types';

export const INJURIES: Record<string, Omit<Injury, 'turnsLeft'> & { baseTurns: number }> = {
  pirou_shang: {
    id: 'pirou_shang',
    name: '皮肉之伤',
    severity: 1,
    baseTurns: 3,
    effect: { powerMod: -3 },
  },
  jingmai_shang: {
    id: 'jingmai_shang',
    name: '经脉受损',
    severity: 2,
    baseTurns: 6,
    effect: { speedMult: 0.8, breakthroughMod: -5, powerMod: -8 },
  },
  daoji_shang: {
    id: 'daoji_shang',
    name: '道基受创',
    severity: 3,
    baseTurns: 10,
    effect: { speedMult: 0.6, breakthroughMod: -12, powerMod: -15 },
  },
};

export function makeInjury(id: string, turnDiscount = 0): Injury | null {
  const t = INJURIES[id];
  if (!t) return null;
  const { baseTurns, ...rest } = t;
  return { ...rest, effect: { ...t.effect }, turnsLeft: Math.max(1, baseTurns - turnDiscount) };
}
