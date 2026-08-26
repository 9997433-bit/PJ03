/**
 * naming.test.ts — G8「术语零重合」regression.
 *
 * Round 3 renamed 道君's realms, currency, market and 战斗式 away from the terms
 * the root game and its three siblings already own (ARCHITECTURE §10, recorded
 * in NAMING_R3). Nothing enforces that at the type level, so a stray 灵石 in a
 * new event string would silently re-open the collision. This suite reads the
 * shipped source and fails if any reserved term comes back.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMBAT_TACTICS, REALMS } from './types';

const GAME_ROOT = join(import.meta.dirname, '..');
const SCANNED_DIRS = ['engine', 'components', 'app'];

/** Terms owned by another game in the monorepo — none may appear in 道君. */
const RESERVED: Record<string, string> = {
  天道: '根游戏叙述者（道君用 道枢）',
  坊市: '根游戏市场（道君用 法会）',
  灵石: '根游戏/灭运货币（道君用 玄玉）',
  炼气: '根游戏境界',
  筑基: '根游戏境界',
  金丹: '根游戏境界',
  元婴: '根游戏境界',
  化神: '根游戏境界',
  弈者: '烂柯叙述者',
  棋录: '烂柯叙述者',
  墟市: '烂柯市场',
  万法坊: '灭运市场',
  玄晶: '灭运货币',
  窥命: '灭运境界',
  服丹: '灭运战术（道君用 吞丹）',
};

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(path);
      } else if (/\.(ts|tsx|css)$/.test(entry.name) && entry.name !== 'naming.test.ts') {
        found.push(path);
      }
    }
  };
  for (const dir of SCANNED_DIRS) walk(join(GAME_ROOT, dir));
  return found;
}

describe('G8 术语零重合', () => {
  const files = sourceFiles();

  it('scans the whole shipped surface', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  for (const [term, owner] of Object.entries(RESERVED)) {
    it(`never says 「${term}」(${owner})`, () => {
      const offenders = files
        .filter((path) => readFileSync(path, 'utf8').includes(term))
        .map((path) => path.slice(GAME_ROOT.length + 1));
      expect(offenders, `「${term}」 belongs to ${owner}`).toEqual([]);
    });
  }
});

describe('道君 keeps its own vocabulary', () => {
  it('names the seven realms as ARCHITECTURE §10 fixed them', () => {
    expect(REALMS).toEqual(['观纹', '铭纹', '织络', '凝魂', '御土', '合道', '道君']);
  });

  it('names the six 战斗式 as ARCHITECTURE §10 fixed them', () => {
    expect(COMBAT_TACTICS).toEqual(['力破', '周旋', '布纹', '摄神', '吞丹', '遁土']);
  });
});
