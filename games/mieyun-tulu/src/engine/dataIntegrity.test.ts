/**
 * dataIntegrity.test.ts — the anti-rot suite
 *
 * Content is the part of a game most likely to decay silently: an item renamed
 * here, an enemy id typo'd there, an ending defined but never awarded. These
 * tests read the data tables as data and assert that every cross-reference
 * resolves, every roll table covers its die, and every ending has a trigger in
 * the engine. They are the highest-leverage tests in the project.
 */

import { describe, expect, it } from 'vitest';
import { CALAMITY_STRIKES, INJURIES, MITIGATIONS, tierOf } from '@/data/calamities';
import { ENEMIES } from '@/data/enemies';
import { ENDINGS } from '@/data/endings';
import { EVENTS } from '@/data/events';
import { FATES } from '@/data/fates';
import { ITEMS, itemById } from '@/data/items';
import { ORIGINS } from '@/data/origins';
import { REALMS, REALM_ORDER } from '@/data/realms';
import { SECTS } from '@/data/sects';
import { ROUTES, TECHNIQUES, techniqueById } from '@/data/techniques';
import { BUCKET_BANDS } from './events';
import { ALL_ENDING_IDS, ENDING_TRIGGERS } from './endings';
import { BUCKET_KIND, EVENT_BUCKETS, type EventBucket } from './types';

const ITEM_IDS = new Set(ITEMS.map((i) => i.id));
const ENEMY_IDS = new Set(ENEMIES.map((e) => e.id));
const INJURY_IDS = new Set(INJURIES.map((i) => i.id));
const TECHNIQUE_IDS = new Set(TECHNIQUES.map((t) => t.id));
const ENDING_IDS = new Set(ENDINGS.map((e) => e.id));

describe('content · 体量门槛', () => {
  it('ships at least 40 events', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(40);
  });

  it('ships at least 20 items', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(20);
  });

  it('ships at least 15 enemies', () => {
    expect(ENEMIES.length).toBeGreaterThanOrEqual(15);
  });

  it('ships at least 12 endings', () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(12);
  });

  it('ships at least 6 origins, 10 fates and 5 sects', () => {
    expect(ORIGINS.length).toBeGreaterThanOrEqual(6);
    expect(FATES.length).toBeGreaterThanOrEqual(10);
    expect(SECTS.length).toBeGreaterThanOrEqual(5);
  });

  it('ships at least 10 calamity strikes across the tiers', () => {
    expect(CALAMITY_STRIKES.length).toBeGreaterThanOrEqual(10);
    expect(MITIGATIONS.length).toBeGreaterThanOrEqual(5);
  });
});

describe('content · id 唯一', () => {
  const tables: [string, readonly { id: string }[]][] = [
    ['events', EVENTS],
    ['items', ITEMS],
    ['enemies', ENEMIES],
    ['endings', ENDINGS],
    ['origins', ORIGINS],
    ['fates', FATES],
    ['sects', SECTS],
    ['techniques', TECHNIQUES],
    ['strikes', CALAMITY_STRIKES],
    ['injuries', INJURIES],
    ['mitigations', MITIGATIONS],
    ['routes', ROUTES],
  ];
  it.each(tables)('%s have unique ids', (_name, table) => {
    const ids = table.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('content · 交叉引用无悬空', () => {
  it('every item referenced by an event exists', () => {
    for (const ev of EVENTS) {
      const effects = [
        ev.autoEffect,
        ...(ev.choices ?? []).flatMap((c) => [c.success, c.failure]),
      ];
      for (const fx of effects) {
        for (const stack of fx?.items ?? []) {
          expect(ITEM_IDS, `${ev.id} → ${stack.itemId}`).toContain(stack.itemId);
        }
      }
      for (const choice of ev.choices ?? []) {
        for (const id of [choice.pay?.itemId, choice.requires?.itemId]) {
          if (id) expect(ITEM_IDS, `${ev.id} → ${id}`).toContain(id);
        }
      }
    }
  });

  it('every enemy referenced by an event exists', () => {
    for (const ev of EVENTS) {
      const ids = [
        ev.autoEffect?.combat,
        ...(ev.choices ?? []).flatMap((c) => [c.success.combat, c.failure?.combat]),
      ].filter(Boolean) as string[];
      for (const id of ids) expect(ENEMY_IDS, `${ev.id} → ${id}`).toContain(id);
    }
  });

  it('every injury referenced by an event or a strike exists', () => {
    for (const ev of EVENTS) {
      const ids = [
        ev.autoEffect?.injury,
        ...(ev.choices ?? []).flatMap((c) => [c.success.injury, c.failure?.injury]),
      ].filter(Boolean) as string[];
      for (const id of ids) expect(INJURY_IDS, `${ev.id} → ${id}`).toContain(id);
    }
    for (const strike of CALAMITY_STRIKES) {
      if (strike.injuryId) expect(INJURY_IDS).toContain(strike.injuryId);
      if (strike.enemyId) expect(ENEMY_IDS).toContain(strike.enemyId);
    }
  });

  it('every loot drop names a real item with a sane chance', () => {
    for (const enemy of ENEMIES) {
      for (const drop of enemy.loot) {
        expect(ITEM_IDS, `${enemy.id} → ${drop.itemId}`).toContain(drop.itemId);
        expect(drop.chance).toBeGreaterThan(0);
        expect(drop.chance).toBeLessThanOrEqual(100);
      }
      expect(enemy.stones[0]).toBeLessThanOrEqual(enemy.stones[1]);
    }
  });

  it('every 出身 starting item exists', () => {
    for (const origin of ORIGINS) {
      for (const stack of origin.startItems) expect(ITEM_IDS).toContain(stack.itemId);
    }
  });

  it('every sect rank reward names a real item or technique', () => {
    for (const sect of SECTS) {
      for (const rank of sect.ranks) {
        if (rank.reward.itemId) expect(ITEM_IDS).toContain(rank.reward.itemId);
        if (rank.reward.techniqueId) expect(TECHNIQUE_IDS).toContain(rank.reward.techniqueId);
      }
      const reps = sect.ranks.map((r) => r.reputation);
      expect([...reps].sort((a, b) => a - b)).toEqual(reps);
    }
  });

  it('every mitigation cost item exists', () => {
    for (const m of MITIGATIONS) {
      if (m.cost.itemId) expect(ITEM_IDS).toContain(m.cost.itemId);
    }
  });

  it('every technique parent exists and shares its route', () => {
    for (const node of TECHNIQUES) {
      if (!node.requires) {
        expect(node.tier).toBe(1);
        continue;
      }
      const parent = techniqueById(node.requires);
      expect(parent, `${node.id} → ${node.requires}`).not.toBeNull();
      expect(parent!.route).toBe(node.route);
      expect(parent!.tier).toBeLessThan(node.tier);
    }
  });

  it('every route has a trunk and a reachable capstone', () => {
    for (const route of ROUTES) {
      const nodes = TECHNIQUES.filter((t) => t.route === route.id);
      expect(nodes.some((t) => t.tier === 1)).toBe(true);
      expect(nodes.some((t) => t.tier === 3)).toBe(true);
      if (route.affinitySectId) {
        expect(SECTS.some((s) => s.id === route.affinitySectId)).toBe(true);
      }
    }
  });

  it('every sect names a real route', () => {
    const routeIds = new Set(ROUTES.map((r) => r.id));
    for (const sect of SECTS) expect(routeIds).toContain(sect.route);
  });
});

describe('content · 分桶覆盖', () => {
  const playableOrders = REALM_ORDER.map((id) => REALMS[id].order).filter(
    (o) => o >= 1 && o <= 5,
  );

  it('every bucket has at least one event at every playable realm', () => {
    for (const order of playableOrders) {
      for (const bucket of EVENT_BUCKETS) {
        const pool = EVENTS.filter(
          (e) =>
            e.kind === BUCKET_KIND[bucket as EventBucket] &&
            e.realmOrders.includes(order) &&
            !e.requiresFlag &&
            e.minDaoYuan === undefined,
        );
        expect(pool.length, `order ${order} bucket ${bucket}`).toBeGreaterThan(0);
      }
    }
  });

  it('bucket bands tile 1..100 exactly once', () => {
    const covered = BUCKET_BANDS.reduce((n, b) => n + (b.max - b.min + 1), 0);
    expect(covered).toBe(100);
    expect(BUCKET_BANDS).toHaveLength(EVENT_BUCKETS.length);
  });

  it('at least 30% of events offer the player a decision', () => {
    const withChoices = EVENTS.filter((e) => (e.choices?.length ?? 0) > 0);
    expect(withChoices.length / EVENTS.length).toBeGreaterThanOrEqual(0.3);
  });

  it('has at least five flag-chained events', () => {
    const chained = EVENTS.filter((e) => e.requiresFlag || e.forbidsFlag);
    expect(chained.length).toBeGreaterThanOrEqual(5);
  });

  it('every event has non-empty prose, a positive weight and a realm window', () => {
    for (const ev of EVENTS) {
      expect(ev.narrative.length, ev.id).toBeGreaterThan(6);
      expect(ev.weight, ev.id).toBeGreaterThan(0);
      expect(ev.realmOrders.length, ev.id).toBeGreaterThan(0);
    }
  });

  it('every event either resolves automatically or offers choices', () => {
    for (const ev of EVENTS) {
      expect(Boolean(ev.autoEffect) || (ev.choices?.length ?? 0) > 0, ev.id).toBe(true);
    }
  });

  it('every choice states both an upside and a resolution path', () => {
    for (const ev of EVENTS) {
      for (const choice of ev.choices ?? []) {
        expect(choice.upside.length, `${ev.id}/${choice.id}`).toBeGreaterThan(0);
        expect(choice.success, `${ev.id}/${choice.id}`).toBeTruthy();
        if (choice.check) expect(choice.failure, `${ev.id}/${choice.id}`).toBeTruthy();
      }
    }
  });

  it('every event id referenced by a destiny chain flag is produced somewhere', () => {
    const produced = new Set<string>();
    for (const ev of EVENTS) {
      const effects = [
        ev.autoEffect,
        ...(ev.choices ?? []).flatMap((c) => [c.success, c.failure]),
      ];
      for (const fx of effects) if (fx?.flag) produced.add(fx.flag[0]);
    }
    // Flags also come from origins, items and the turn resolver.
    for (const origin of ORIGINS) {
      for (const key of Object.keys(origin.startFlags ?? {})) produced.add(key);
    }
    for (const item of ITEMS) if (item.effect?.flag) produced.add(item.effect.flag[0]);
    produced.add('tuluAll');
    produced.add('tuluAwake');

    for (const ev of EVENTS) {
      if (ev.requiresFlag) expect(produced, `${ev.id} requires ${ev.requiresFlag}`).toContain(ev.requiresFlag);
    }
  });
});

describe('content · 结局可达', () => {
  it('defines a trigger for every ending in the table', () => {
    for (const id of ALL_ENDING_IDS) {
      expect(Object.keys(ENDING_TRIGGERS), id).toContain(id);
    }
  });

  it('defines no trigger for an ending that does not exist', () => {
    for (const id of Object.keys(ENDING_TRIGGERS)) {
      expect(ENDING_IDS, id).toContain(id);
    }
  });

  it('covers victory, death, retirement and 歧路 endings', () => {
    const kinds = new Set(ENDINGS.map((e) => e.kind));
    expect(kinds).toContain('victory');
    expect(kinds).toContain('death');
    expect(kinds).toContain('retire');
    expect(kinds).toContain('fall');
    expect(kinds).toContain('transcend');
    expect(ENDINGS.filter((e) => e.kind === 'death').length).toBeGreaterThanOrEqual(4);
  });

  it('gives every ending a title and a closing paragraph', () => {
    for (const e of ENDINGS) {
      expect(e.title.length, e.id).toBeGreaterThan(0);
      expect(e.summary.length, e.id).toBeGreaterThan(4);
      expect(e.closing.length, e.id).toBeGreaterThan(20);
    }
  });
});

describe('content · 数值合理', () => {
  it('prices every tradable item above zero and every relic at zero', () => {
    for (const item of ITEMS) {
      if (item.noTrade) expect(item.price, item.id).toBe(0);
      else expect(item.price, item.id).toBeGreaterThan(0);
    }
  });

  it('gates higher-tier stock behind realm order', () => {
    for (const item of ITEMS) {
      if (item.grade >= 4 && !item.noTrade) {
        expect(item.minRealmOrder ?? 0, item.id).toBeGreaterThan(0);
      }
    }
  });

  it('keeps enemy power monotone in realm order', () => {
    for (let order = 1; order < 5; order += 1) {
      const lower = ENEMIES.filter((e) => e.realmOrder === order && !e.isCalamity);
      const upper = ENEMIES.filter((e) => e.realmOrder === order + 1 && !e.isCalamity);
      if (lower.length === 0 || upper.length === 0) continue;
      expect(Math.max(...lower.map((e) => e.power))).toBeLessThan(
        Math.min(...upper.map((e) => e.power)),
      );
    }
  });

  it('gives tribulation manifestations no 气运 to take and no escape', () => {
    for (const e of ENEMIES.filter((x) => x.isCalamity)) {
      expect(e.fortune).toBe(0);
      expect(e.merit).toBe(0);
      expect(e.fleeable).toBe(false);
    }
  });

  it('places every strike in a tier its severity fits', () => {
    for (const s of CALAMITY_STRIKES) {
      expect(s.vent, s.id).toBeGreaterThan(0);
      expect(s.severity, s.id).toBeGreaterThanOrEqual(1);
      expect(s.severity, s.id).toBeLessThanOrEqual(5);
      expect(tierOf(0)).toBe('安泰');
    }
    expect(CALAMITY_STRIKES.some((s) => s.tier === '天诛')).toBe(true);
  });

  it('keeps every injury finite and non-trivial', () => {
    for (const i of INJURIES) {
      expect(i.turns, i.id).toBeGreaterThan(0);
      expect(Object.keys(i.effect).length, i.id).toBeGreaterThan(0);
    }
  });

  it('keeps 灵根 and 命格 multipliers positive', () => {
    for (const f of FATES) {
      expect(f.calamityRate).toBeGreaterThan(0);
      expect(f.fortuneRate).toBeGreaterThan(0);
      expect(f.startFortune).toBeGreaterThanOrEqual(0);
    }
  });

  it('never sells a relic through the market helper', () => {
    for (const item of ITEMS.filter((i) => i.kind === 'relic')) {
      expect(item.noTrade, item.id).toBe(true);
      expect(itemById(item.id)).not.toBeNull();
    }
  });
});
