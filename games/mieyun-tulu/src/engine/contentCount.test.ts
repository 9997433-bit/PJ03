import { describe, expect, it } from 'vitest';
import { CALAMITY_STRIKES, INJURIES, MITIGATIONS } from '@/data/calamities';
import { ENEMIES } from '@/data/enemies';
import { ENDINGS } from '@/data/endings';
import { EVENTS } from '@/data/events';
import { FATES } from '@/data/fates';
import { ITEMS } from '@/data/items';
import { ORIGINS } from '@/data/origins';
import { SPIRIT_ROOT_TABLE } from '@/data/spiritRoots';
import { TECHNIQUES } from '@/data/techniques';

/**
 * The content floor. These are the numbers the design brief promises a player,
 * asserted so a refactor cannot quietly thin the game out.
 */
describe('content · 分量', () => {
  const floors: [string, readonly unknown[], number][] = [
    ['事件', EVENTS, 30],
    ['物品', ITEMS, 20],
    ['结局', ENDINGS, 12],
    ['敌手', ENEMIES, 10],
    ['功法', TECHNIQUES, 15],
    ['命格', FATES, 8],
    ['出身', ORIGINS, 6],
    ['灵根', SPIRIT_ROOT_TABLE, 5],
    ['劫难', CALAMITY_STRIKES, 8],
    ['伤势', INJURIES, 5],
    ['化解之法', MITIGATIONS, 3],
  ];

  for (const [label, table, floor] of floors) {
    it(`ships at least ${floor} ${label}`, () => {
      expect(table.length).toBeGreaterThanOrEqual(floor);
    });
  }

  it('puts a real fork in at least twenty events', () => {
    const forks = EVENTS.filter((e) => (e.choices?.length ?? 0) >= 2);
    expect(forks.length).toBeGreaterThanOrEqual(20);
  });

  it('gives every event either choices or an automatic outcome', () => {
    for (const ev of EVENTS) {
      expect((ev.choices?.length ?? 0) > 0 || ev.autoEffect !== undefined).toBe(true);
    }
  });

  it('writes narration for every event and labels every choice', () => {
    for (const ev of EVENTS) {
      expect(ev.narrative.length).toBeGreaterThan(10);
      for (const choice of ev.choices ?? []) {
        expect(choice.text.length).toBeGreaterThan(0);
        expect(choice.upside.length).toBeGreaterThan(0);
      }
    }
  });

  it('names the risk on every choice that can actually fail', () => {
    for (const ev of EVENTS) {
      for (const choice of ev.choices ?? []) {
        if (choice.check || choice.failure) {
          expect(choice.downside.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
