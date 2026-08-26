import { describe, expect, it } from 'vitest';
import { ENDINGS } from '../endings';
import { EVENTS } from '../events';
import { ITEMS } from '../items';
import { MANUALS } from '../manuals';
import { OPPONENTS } from '../opponents';
import { ORIGINS } from '../origins';
import { PLACES } from '../places';
import { QIYUAN_TABLE } from '../qiyuan';
import { REALMS } from '../realms';
import { SPIRITS } from '../spirits';
import { BOARD_STYLES } from '@/engine/board';
import { BUCKETS } from '@/engine/events';
import { REALM_ORDER } from '@/engine/audit';
import { ATTR_MAX, ATTR_MIN, ATTR_TOTAL } from '@/engine/attributes';
import type { EventEffect, RealmId } from '@/engine/types';

const ITEM_IDS = new Set(ITEMS.map((i) => i.id));
const MANUAL_IDS = new Set(MANUALS.map((m) => m.id));
const PLACE_IDS = new Set(PLACES.map((p) => p.id));
const SPIRIT_IDS = new Set(SPIRITS.map((s) => s.id));
const OPPONENT_IDS = new Set(OPPONENTS.map((o) => o.id));
const ENDING_IDS = new Set(ENDINGS.map((e) => e.id));
const REALM_IDS = new Set(REALMS.map((r) => r.id));

/** Every effect an event can hand to the engine, choices included. */
function allEffects(): EventEffect[] {
  const out: EventEffect[] = [];
  for (const e of EVENTS) {
    if (e.autoEffect) out.push(e.autoEffect);
    for (const ch of e.choices ?? []) {
      out.push(ch.success);
      if (ch.failure) out.push(ch.failure);
    }
  }
  return out;
}

describe('content volume', () => {
  it('ships at least 30 游历 events', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(30);
  });

  it('ships at least 20 器物', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(20);
  });

  it('ships at least 10 结局', () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(10);
  });

  it('ships the full ladder of 境界, 出身, 处, 棋谱, 精怪 and 对手', () => {
    expect(REALMS).toHaveLength(7);
    expect(ORIGINS.length).toBeGreaterThanOrEqual(6);
    expect(PLACES.length).toBeGreaterThanOrEqual(12);
    expect(MANUALS.length).toBeGreaterThanOrEqual(10);
    expect(SPIRITS.length).toBeGreaterThanOrEqual(12);
    expect(OPPONENTS.length).toBeGreaterThanOrEqual(12);
  });
});

describe('unique ids', () => {
  it.each([
    ['events', EVENTS.map((e) => e.id)],
    ['items', ITEMS.map((i) => i.id)],
    ['manuals', MANUALS.map((m) => m.id)],
    ['places', PLACES.map((p) => p.id)],
    ['spirits', SPIRITS.map((s) => s.id)],
    ['opponents', OPPONENTS.map((o) => o.id)],
    ['origins', ORIGINS.map((o) => o.id)],
    ['realms', REALMS.map((r) => r.id)],
    ['endings', ENDINGS.map((e) => e.id)],
  ] as const)('%s have no duplicate ids', (_label, ids) => {
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('cross-references resolve', () => {
  it('every event realm is a real realm', () => {
    for (const e of EVENTS) {
      expect(e.realms.length).toBeGreaterThan(0);
      for (const r of e.realms) expect(REALM_IDS.has(r)).toBe(true);
    }
  });

  it('every event place is on the map', () => {
    for (const e of EVENTS) for (const p of e.places) expect(PLACE_IDS.has(p)).toBe(true);
  });

  it('every event bucket is one of the four', () => {
    for (const e of EVENTS) expect(BUCKETS).toContain(e.bucket);
  });

  it('every item, manual, spirit, opponent and ending named by an effect exists', () => {
    for (const eff of allEffects()) {
      for (const stack of eff.items ?? []) expect(ITEM_IDS.has(stack.itemId)).toBe(true);
      if (eff.teachManual) expect(MANUAL_IDS.has(eff.teachManual)).toBe(true);
      if (eff.favor) expect(SPIRIT_IDS.has(eff.favor[0])).toBe(true);
      if (eff.match) expect(OPPONENT_IDS.has(eff.match)).toBe(true);
      if (eff.ending) expect(ENDING_IDS.has(eff.ending)).toBe(true);
    }
  });

  it('every origin grants real starting items and a real manual', () => {
    for (const o of ORIGINS) {
      for (const id of o.startItems) expect(ITEM_IDS.has(id)).toBe(true);
      if (o.startManualId) expect(MANUAL_IDS.has(o.startManualId)).toBe(true);
    }
  });

  it('every item that teaches a 棋谱 names one that exists', () => {
    for (const i of ITEMS) {
      if (i.effect?.teachManual) expect(MANUAL_IDS.has(i.effect.teachManual)).toBe(true);
      if (i.minRealm) expect(REALM_IDS.has(i.minRealm)).toBe(true);
    }
  });

  it('every spirit lives somewhere real and gives real gifts', () => {
    for (const s of SPIRITS) {
      expect(PLACE_IDS.has(s.home)).toBe(true);
      expect(REALM_IDS.has(s.minRealm)).toBe(true);
      for (const t of s.thresholds) {
        if (t.gift?.itemId) expect(ITEM_IDS.has(t.gift.itemId)).toBe(true);
      }
    }
  });

  it('every opponent sits at a real place, at a real realm, with real rewards', () => {
    for (const o of OPPONENTS) {
      expect(REALM_IDS.has(o.minRealm)).toBe(true);
      expect(BOARD_STYLES).toContain(o.counters);
      expect(BOARD_STYLES).toContain(o.weakTo);
      expect(o.counters).not.toBe(o.weakTo);
      if (o.spiritId) expect(SPIRIT_IDS.has(o.spiritId)).toBe(true);
      if (o.reward?.itemId) expect(ITEM_IDS.has(o.reward.itemId)).toBe(true);
    }
  });
});

describe('balance shapes', () => {
  it('the realm ladder rises monotonically in lifespan and difficulty', () => {
    for (let i = 1; i < REALMS.length; i += 1) {
      expect(REALMS[i]!.lifespan).toBeGreaterThan(REALMS[i - 1]!.lifespan);
      expect(REALMS[i]!.spiritBase).toBeGreaterThanOrEqual(REALMS[i - 1]!.spiritBase);
      expect(REALMS[i]!.chessDaoGate).toBeGreaterThanOrEqual(REALMS[i - 1]!.chessDaoGate);
    }
  });

  it('the realm ids match the engine ordering used by every gate', () => {
    for (const r of REALMS) expect(REALM_ORDER[r.id]).toBeTypeOf('number');
    const ordered = [...REALMS].map((r) => REALM_ORDER[r.id] as number);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  it('the 棋缘 table covers D100 exactly once, end to end', () => {
    const rows = [...QIYUAN_TABLE].sort((a, b) => a.min - b.min);
    expect(rows[0]!.min).toBe(1);
    expect(rows[rows.length - 1]!.max).toBe(100);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.min).toBe(rows[i - 1]!.max + 1);
    }
  });

  it('the 棋缘 table rewards a higher roll with a faster grade', () => {
    const rows = [...QIYUAN_TABLE].sort((a, b) => a.min - b.min);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.speedMultiplier).toBeGreaterThan(rows[i - 1]!.speedMultiplier);
    }
  });

  it('attribute allocation bounds are internally consistent', () => {
    expect(ATTR_MIN * 4).toBeLessThan(ATTR_TOTAL);
    expect(ATTR_MAX * 4).toBeGreaterThanOrEqual(ATTR_TOTAL);
  });

  it('every 棋谱 costs 悟 and gates on 棋道', () => {
    for (const m of MANUALS) {
      expect(m.insightCost).toBeGreaterThan(0);
      expect(m.minChessDao).toBeGreaterThanOrEqual(0);
      expect(m.speedBonus).toBeGreaterThan(0);
    }
  });

  it('every priced item is worth more than nothing, and grades stay in band', () => {
    for (const i of ITEMS) {
      expect(i.price).toBeGreaterThanOrEqual(0);
      expect(i.grade).toBeGreaterThanOrEqual(1);
      expect(i.grade).toBeLessThanOrEqual(5);
      expect(i.desc.length).toBeGreaterThan(0);
    }
  });

  it('every event carries a positive weight and some prose', () => {
    for (const e of EVENTS) {
      expect(e.weight).toBeGreaterThan(0);
      expect(e.narrative.length).toBeGreaterThan(10);
      expect(e.name.length).toBeGreaterThan(0);
    }
  });

  it('every choice offers an outcome, and every check a sane DC', () => {
    for (const e of EVENTS) {
      for (const ch of e.choices ?? []) {
        expect(ch.text.length).toBeGreaterThan(0);
        expect(ch.success.narrative.length).toBeGreaterThan(0);
        if (ch.check) {
          expect(ch.check.dc).toBeGreaterThan(0);
          expect(ch.check.dc).toBeLessThanOrEqual(30);
          expect(ch.failure).toBeDefined();
        }
      }
    }
  });

  it('every event either offers a choice or resolves itself', () => {
    for (const e of EVENTS) {
      expect((e.choices?.length ?? 0) > 0 || e.autoEffect !== undefined).toBe(true);
    }
  });

  it('every 出身 keeps its attribute mods modest and its perk named', () => {
    for (const o of ORIGINS) {
      expect(o.perkName.length).toBeGreaterThan(0);
      expect(o.perkDesc.length).toBeGreaterThan(0);
      for (const v of Object.values(o.attributeMods)) {
        expect(Math.abs(v as number)).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('coverage of the event table', () => {
  const REALMS_WITH_PLAY: RealmId[] = ['chen', 'mingxin', 'yangqi', 'tongxuan', 'zuowang', 'xiaoyao'];

  it.each(REALMS_WITH_PLAY)('每一境界 %s 都有可抽事件', (realm) => {
    const pool = EVENTS.filter((e) => e.realms.includes(realm));
    expect(pool.length).toBeGreaterThanOrEqual(4);
  });

  it.each(BUCKETS)('每个事件桶 %s 都非空', (bucket) => {
    expect(EVENTS.filter((e) => e.bucket === bucket).length).toBeGreaterThanOrEqual(5);
  });

  it('every realm in play has an ungated everyday event that can always fire', () => {
    for (const realm of REALMS_WITH_PLAY) {
      const ungated = EVENTS.filter(
        (e) =>
          e.realms.includes(realm) &&
          e.places.length === 0 &&
          e.requiresFlag === undefined &&
          e.minYuanFa === undefined &&
          e.minChessDao === undefined &&
          e.once !== true,
      );
      expect(ungated.length, `${realm} has no ungated event`).toBeGreaterThan(0);
    }
  });

  it('rewards the flag-gated chains it sets up', () => {
    // Flags the engine itself raises, with the module that raises them.
    const ENGINE_FLAGS = ['国手', '连胜', '胜局', '败局', '坐忘次数', '枯坐', '接过棋台'];
    const setFlags = new Set<string>(ENGINE_FLAGS);
    for (const eff of allEffects()) if (eff.flag) setFlags.add(eff.flag[0]);
    for (const i of ITEMS) if (i.effect?.flag) setFlags.add(i.effect.flag[0]);
    for (const o of ORIGINS) for (const k of Object.keys(o.startFlags ?? {})) setFlags.add(k);

    const gates = EVENTS.filter((e) => e.requiresFlag !== undefined);
    expect(gates.length).toBeGreaterThanOrEqual(5);
    for (const e of gates) {
      expect(setFlags.has(e.requiresFlag as string), `${e.id} gates on an unset flag`).toBe(true);
    }
  });
});
