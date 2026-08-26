/**
 * content.test.ts — the content ledger.
 *
 * These tests are less about logic than about the promise the game makes to
 * the player: enough places to wander, enough events to be surprised by, and
 * no dangling id anywhere in the web of references.
 */

import { describe, expect, it } from 'vitest';
import {
  ENDINGS,
  EVENTS,
  ITEMS,
  MANUALS,
  OPPONENTS,
  ORIGINS,
  PLACES,
  REALMS,
  REALM_IDS,
  SPIRITS,
  STARTING_PLACE,
  getEnding,
  getEvent,
  getItem,
  getManual,
  getOpponent,
  getOrigin,
  getPlace,
  getRealm,
  getSpirit,
  initialSpirits,
  nextRealmId,
  opponentsAt,
  realmTier,
} from '@/data';
import type { EventEffect, RealmId } from '@/engine';

const placeIds = new Set(PLACES.map((p) => p.id));
const itemIds = new Set(ITEMS.map((i) => i.id));
const manualIds = new Set(MANUALS.map((m) => m.id));
const spiritIds = new Set(SPIRITS.map((s) => s.id));
const opponentIds = new Set(OPPONENTS.map((o) => o.id));
const endingIds = new Set(ENDINGS.map((e) => e.id));
const realmIds = new Set<string>(REALM_IDS);

/** Every effect an event can hand out, flattened for reference checking. */
function allEffects(): EventEffect[] {
  const out: EventEffect[] = [];
  for (const ev of EVENTS) {
    if (ev.autoEffect) out.push(ev.autoEffect);
    for (const ch of ev.choices ?? []) {
      out.push(ch.success);
      if (ch.failure) out.push(ch.failure);
    }
  }
  return out;
}

function uniqueIds(list: readonly { id: string }[]): boolean {
  return new Set(list.map((x) => x.id)).size === list.length;
}

describe('内容规模 — the content promised', () => {
  it('ships at least 30 游历事件', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(30);
  });

  it('ships at least 20 物品', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(20);
  });

  it('ships at least 10 结局', () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(10);
  });

  it('offers exactly 6 出身 at creation', () => {
    expect(ORIGINS).toHaveLength(6);
  });

  it('ships a full ladder of 境界, 去处, 棋谱, 精怪 and 棋手', () => {
    expect(REALMS.length).toBeGreaterThanOrEqual(7);
    expect(PLACES.length).toBeGreaterThanOrEqual(10);
    expect(MANUALS.length).toBeGreaterThanOrEqual(8);
    expect(SPIRITS.length).toBeGreaterThanOrEqual(10);
    expect(OPPONENTS.length).toBeGreaterThanOrEqual(10);
  });

  it('gives every table unique ids', () => {
    expect(uniqueIds(EVENTS)).toBe(true);
    expect(uniqueIds(ITEMS)).toBe(true);
    expect(uniqueIds(ENDINGS)).toBe(true);
    expect(uniqueIds(ORIGINS)).toBe(true);
    expect(uniqueIds(PLACES)).toBe(true);
    expect(uniqueIds(MANUALS)).toBe(true);
    expect(uniqueIds(SPIRITS)).toBe(true);
    expect(uniqueIds(OPPONENTS)).toBe(true);
  });
});

describe('境界 — the ladder', () => {
  it('climbs from 凡尘 to 天人 without a broken rung', () => {
    for (let i = 0; i < REALMS.length - 1; i++) {
      expect(nextRealmId(REALMS[i]!.id)).toBe(REALMS[i + 1]!.id);
    }
    expect(nextRealmId(REALMS[REALMS.length - 1]!.id)).toBeNull();
  });

  it('grows 寿元 and 修为 monotonically with tier', () => {
    const totalExp = (i: number) => REALMS[i]!.expPerStage.reduce((a, b) => a + b, 0);
    for (let i = 1; i < REALMS.length; i++) {
      expect(REALMS[i]!.lifespan).toBeGreaterThan(REALMS[i - 1]!.lifespan);
      expect(totalExp(i)).toBeGreaterThan(totalExp(i - 1));
    }
  });

  it('gives every realm three stages of 修为', () => {
    for (const r of REALMS) {
      expect(r.expPerStage).toHaveLength(3);
      for (let i = 1; i < r.expPerStage.length; i++) {
        expect(r.expPerStage[i]!).toBeGreaterThan(r.expPerStage[i - 1]!);
      }
    }
  });

  it('ranks tiers in table order', () => {
    REALMS.forEach((r, i) => expect(realmTier(r.id)).toBe(i));
  });

  it('gates each realm behind a higher 棋道', () => {
    for (let i = 1; i < REALMS.length; i++) {
      expect(REALMS[i]!.chessDaoGate).toBeGreaterThanOrEqual(REALMS[i - 1]!.chessDaoGate);
    }
  });
});

describe('出身 — the six roads in', () => {
  it('starts everyone with a reachable place and a real perk', () => {
    for (const o of ORIGINS) {
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.perkName.length).toBeGreaterThan(0);
      expect(o.perkDesc.length).toBeGreaterThan(0);
      expect(o.flavor.length).toBeGreaterThan(4);
      expect(o.desc.length).toBeGreaterThan(10);
    }
  });

  it('references only real items and manuals', () => {
    for (const o of ORIGINS) {
      for (const id of o.startItems) {
        expect(itemIds.has(id), `${o.id} → ${id}`).toBe(true);
      }
      if (o.startManualId) {
        expect(manualIds.has(o.startManualId), `${o.id} → ${o.startManualId}`).toBe(true);
      }
      expect(o.startCoin).toBeGreaterThanOrEqual(0);
      expect(o.startChessDao).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives each origin a distinct perk', () => {
    const perks = new Set(ORIGINS.map((o) => o.perk));
    expect(perks.size).toBe(ORIGINS.length);
  });

  it('keeps attribute modifiers modest', () => {
    for (const o of ORIGINS) {
      for (const v of Object.values(o.attributeMods ?? {})) {
        expect(Math.abs(v as number)).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('去处 — the map', () => {
  it('lets a 凡尘 wanderer stand somewhere on turn one', () => {
    expect(placeIds.has(STARTING_PLACE)).toBe(true);
    expect(getPlace(STARTING_PLACE)!.minRealm).toBe<RealmId>('chen');
    expect(getPlace(STARTING_PLACE)!.fare).toBe(0);
  });

  it('names a known realm gate for every place', () => {
    for (const p of PLACES) {
      expect(realmIds.has(p.minRealm), `${p.id} → ${p.minRealm}`).toBe(true);
      expect(p.fare).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('物品与棋谱', () => {
  it('prices every item and grades it 1–5', () => {
    for (const it of ITEMS) {
      expect(it.price).toBeGreaterThanOrEqual(0);
      expect(it.grade).toBeGreaterThanOrEqual(1);
      expect(it.grade).toBeLessThanOrEqual(5);
      expect(it.desc.length).toBeGreaterThan(4);
    }
  });

  it('makes higher grades cost more on average', () => {
    const avg = (g: number) => {
      const set = ITEMS.filter((i) => i.grade === g);
      return set.reduce((n, i) => n + i.price, 0) / Math.max(1, set.length);
    };
    expect(avg(3)).toBeGreaterThan(avg(1));
  });

  it('only teaches manuals that exist', () => {
    for (const it of ITEMS) {
      if (it.effect?.teachManual) {
        expect(manualIds.has(it.effect.teachManual), it.id).toBe(true);
      }
    }
  });

  it('scales 棋谱 cost with tier', () => {
    const tiers = ['残谱', '古谱', '名谱', '天谱'] as const;
    const cost = (t: (typeof tiers)[number]) => {
      const set = MANUALS.filter((m) => m.tier === t);
      return set.length === 0 ? 0 : set.reduce((n, m) => n + m.insightCost, 0) / set.length;
    };
    expect(cost('天谱')).toBeGreaterThan(cost('残谱'));
  });

  it('gives every 棋谱 a positive benefit', () => {
    for (const m of MANUALS) {
      expect(m.speedBonus).toBeGreaterThan(0);
      expect(m.boardBonus).toBeGreaterThanOrEqual(0);
      expect(m.minChessDao).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('山精鬼怪', () => {
  it('houses every being somewhere real', () => {
    for (const s of SPIRITS) {
      expect(placeIds.has(s.home), `${s.id} → ${s.home}`).toBe(true);
      expect(realmIds.has(s.minRealm), `${s.id} → ${s.minRealm}`).toBe(true);
    }
  });

  it('orders each being\'s favour thresholds and keeps them in range', () => {
    for (const s of SPIRITS) {
      expect(s.thresholds.length).toBeGreaterThan(0);
      for (let i = 1; i < s.thresholds.length; i++) {
        expect(s.thresholds[i]!.at).toBeGreaterThan(s.thresholds[i - 1]!.at);
      }
      for (const t of s.thresholds) {
        expect(t.at).toBeGreaterThan(0);
        expect(t.at).toBeLessThanOrEqual(100);
      }
    }
  });

  it('hands out a fresh, unmet roster each life', () => {
    const a = initialSpirits();
    const b = initialSpirits();
    a.$test = { ...Object.values(a)[0]!, id: '$test' };
    expect(b.$test).toBeUndefined();
    for (const s of Object.values(b)) {
      expect(s.met).toBe(false);
      expect(s.favor).toBeLessThanOrEqual(20);
    }
  });
});

describe('棋手 — who sits across the board', () => {
  it('gives every opponent a playable match and a voice', () => {
    for (const o of OPPONENTS) {
      expect(o.hands).toBeGreaterThanOrEqual(3);
      expect(o.strength).toBeGreaterThan(0);
      expect(o.stake).toBeGreaterThanOrEqual(0);
      expect(realmIds.has(o.minRealm), `${o.id} → ${o.minRealm}`).toBe(true);
      expect(o.intro.length).toBeGreaterThan(4);
      expect(o.onLoss.length).toBeGreaterThan(2);
      expect(o.onWin.length).toBeGreaterThan(2);
      expect(o.counters).not.toBe(o.weakTo);
      if (o.spiritId) expect(spiritIds.has(o.spiritId), o.id).toBe(true);
      if (o.reward?.itemId) expect(itemIds.has(o.reward.itemId), o.id).toBe(true);
    }
  });

  it('seats every opponent at a place a wanderer can reach', () => {
    for (const o of OPPONENTS) {
      const found = PLACES.some((p) => opponentsAt(p.id).some((x) => x.id === o.id));
      expect(found, `${o.id} sits at no known place`).toBe(true);
    }
  });

  it('finds at least one opponent at the starting place', () => {
    expect(opponentsAt(STARTING_PLACE).length).toBeGreaterThan(0);
  });

  it('raises the stakes for stronger opponents who play for money at all', () => {
    // A few of the strongest sit down for nothing; they are excluded on purpose.
    const wagering = OPPONENTS.filter((o) => o.stake > 0).sort((a, b) => a.strength - b.strength);
    expect(wagering.length).toBeGreaterThan(6);
    expect(wagering[wagering.length - 1]!.stake).toBeGreaterThan(wagering[0]!.stake);
  });
});

describe('游历事件 — references and shape', () => {
  it('gives every event a bucket, a weight and some prose', () => {
    for (const ev of EVENTS) {
      expect(['波折', '寻常', '际遇', '奇遇']).toContain(ev.bucket);
      expect(ev.weight).toBeGreaterThan(0);
      expect(ev.narrative.length).toBeGreaterThan(10);
      expect(ev.realms.length).toBeGreaterThan(0);
      for (const r of ev.realms) expect(realmIds.has(r), `${ev.id} → ${r}`).toBe(true);
    }
  });

  it('resolves to something — a choice or an automatic outcome', () => {
    for (const ev of EVENTS) {
      const resolvable = (ev.choices && ev.choices.length > 0) || Boolean(ev.autoEffect);
      expect(resolvable, ev.id).toBe(true);
    }
  });

  it('narrates every branch it can take', () => {
    for (const eff of allEffects()) {
      expect(eff.narrative.length).toBeGreaterThan(4);
    }
  });

  it('sets a sane DC on every check', () => {
    for (const ev of EVENTS) {
      for (const ch of ev.choices ?? []) {
        if (!ch.check) continue;
        expect(ch.check.dc).toBeGreaterThanOrEqual(5);
        expect(ch.check.dc).toBeLessThanOrEqual(30);
        expect(['xinJing', 'wuXing', 'caiXue', 'qiYun']).toContain(ch.check.attr);
        expect(ch.failure, `${ev.id} check without a failure branch`).toBeDefined();
      }
    }
  });

  it('points only at real places, items, spirits, manuals, opponents and endings', () => {
    for (const ev of EVENTS) {
      for (const p of ev.places) expect(placeIds.has(p), `${ev.id} → ${p}`).toBe(true);
    }
    for (const eff of allEffects()) {
      for (const stack of eff.items ?? []) {
        expect(itemIds.has(stack.itemId), stack.itemId).toBe(true);
      }
      if (eff.favor) expect(spiritIds.has(eff.favor[0]), eff.favor[0]).toBe(true);
      if (eff.teachManual) expect(manualIds.has(eff.teachManual), eff.teachManual).toBe(true);
      if (eff.match) expect(opponentIds.has(eff.match), eff.match).toBe(true);
      if (eff.ending) expect(endingIds.has(eff.ending), eff.ending).toBe(true);
    }
  });

  it('spreads events across every bucket and across the realm ladder', () => {
    for (const bucket of ['波折', '寻常', '际遇', '奇遇'] as const) {
      expect(EVENTS.filter((e) => e.bucket === bucket).length, bucket).toBeGreaterThan(0);
    }
    const lateGame = EVENTS.filter((e) => e.realms.includes('zuowang'));
    expect(lateGame.length).toBeGreaterThan(3);
  });

  it('keeps most events unbound to a single place, so wandering stays alive', () => {
    const anywhere = EVENTS.filter((e) => e.places.length === 0);
    expect(anywhere.length).toBeGreaterThan(EVENTS.length / 3);
  });
});

describe('结局 — the twelve scrolls', () => {
  it('ranks every ending and writes it an epitaph', () => {
    for (const e of ENDINGS) {
      expect(['天', '地', '玄', '黄']).toContain(e.rank);
      expect(e.title.length).toBeGreaterThan(1);
      expect(e.epitaph.length).toBeGreaterThan(4);
      expect(e.closing.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('offers both a best and a plainest outcome', () => {
    expect(ENDINGS.some((e) => e.rank === '天')).toBe(true);
    expect(ENDINGS.some((e) => e.rank === '黄')).toBe(true);
  });
});

describe('lookup helpers', () => {
  it('finds by id and returns undefined for strangers', () => {
    expect(getEvent(EVENTS[0]!.id)!.id).toBe(EVENTS[0]!.id);
    expect(getItem(ITEMS[0]!.id)!.id).toBe(ITEMS[0]!.id);
    expect(getManual(MANUALS[0]!.id)!.id).toBe(MANUALS[0]!.id);
    expect(getSpirit(SPIRITS[0]!.id)!.id).toBe(SPIRITS[0]!.id);
    expect(getOpponent(OPPONENTS[0]!.id)!.id).toBe(OPPONENTS[0]!.id);
    expect(getOrigin(ORIGINS[0]!.id)!.id).toBe(ORIGINS[0]!.id);
    expect(getEnding(ENDINGS[0]!.id)!.id).toBe(ENDINGS[0]!.id);
    expect(getRealm('chen').id).toBe('chen');

    expect(getEvent('nope')).toBeUndefined();
    expect(getItem('nope')).toBeUndefined();
    expect(getPlace('nope')).toBeUndefined();
  });
});
