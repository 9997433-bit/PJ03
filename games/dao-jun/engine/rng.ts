export interface Roll {
  value: number;
  seed: number;
}

/** Mulberry32's integer step, kept explicit so every game action is replayable. */
export function nextRandom(seed: number): Roll {
  let t = (seed + 0x6d2b79f5) | 0;
  const nextSeed = t >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: nextSeed };
}

export function rollInt(seed: number, min: number, max: number): Roll {
  const roll = nextRandom(seed);
  return {
    value: Math.floor(roll.value * (max - min + 1)) + min,
    seed: roll.seed,
  };
}

export function chance(seed: number, probability: number): Roll {
  const roll = nextRandom(seed);
  return { value: roll.value < Math.max(0, Math.min(1, probability)) ? 1 : 0, seed: roll.seed };
}

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  const normalized = Math.abs(Math.trunc(seed)) >>> 0;
  return normalized || 1;
}
