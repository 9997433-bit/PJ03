/**
 * seal.ts — 封印 (the sealed 道缘 roll)
 *
 * 道缘 is rolled once, in the dark, at the end of character creation. It gates
 * the 图录 chain and nudges a handful of destiny draws, and the player is never
 * told the number — not in the status panel, not in the 天机录, not in a log
 * line. The audit entry for the roll exists (the dice authority files every
 * roll), but its reason string is deliberately opaque.
 *
 * Everything that may legitimately read the value lives here, so `seal.test.ts`
 * can assert that no other module reaches for `character.daoYuan`.
 */

import type { Character, GameEvent } from './types';

export const SEAL_REASON = '暗掷·封';

/** Does the character clear an event's hidden 道缘 gate? */
export function passesDaoYuanGate(character: Character, event: GameEvent): boolean {
  if (event.minDaoYuan === undefined) return true;
  return character.daoYuan >= event.minDaoYuan;
}

/**
 * A coarse, non-numeric hint the narrator may use. Deliberately three buckets
 * wide so repeated observation cannot reconstruct the roll.
 */
export function daoYuanOmen(character: Character): string {
  if (character.daoYuan >= 85) return '你偶尔觉得,有一册书正在翻到你这一页。';
  if (character.daoYuan >= 55) return '夜里偶有墨香,来处不明。';
  return '天地待你如待众人。';
}

/** The one sanctioned numeric reader: the ending screen, after the run is over. */
export function revealDaoYuan(character: Character): number {
  return character.daoYuan;
}
