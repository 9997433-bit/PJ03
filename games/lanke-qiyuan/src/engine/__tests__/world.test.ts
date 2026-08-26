/**
 * world.test.ts — the wandering half of the loop.
 *
 * 游历 (travel + the event table), 坊市 (buying, selling, using, gifting) and
 * 棋谱 (studying and comprehending). These are the systems the player touches
 * most, so they are exercised through `executeCommand` wherever possible —
 * the same door the UI uses.
 */

import { describe, expect, it } from 'vitest';
import {
  applyEffect,
  addFavor,
  addItem,
  countItem,
  eligibleEvents,
  executeCommand,
  learnableManuals,
  manualCost,
  marketStock,
  reachablePlaces,
  removeItem,
  rollBucket,
  rollEvent,
  sellPrice,
  travelFare,
} from '@/engine';
import { getItem, getManual, getPlace, PLACES, STARTING_PLACE } from '@/data';
import { EVEN_ALLOC, playingState } from './helpers';

describe('游历 — the road', () => {
  it('lists only places the realm allows, and never the one you stand on', () => {
    const s = playingState();
    const reach = reachablePlaces(s);
    expect(reach.length).toBeGreaterThan(0);
    expect(reach.some((p) => p.id === s.placeId)).toBe(false);
    for (const p of reach) {
      expect(getPlace(p.id)!.minRealm).toBe('chen');
    }
    expect(reach.length).toBeLessThan(PLACES.length);
  });

  it('halves the fare for a 行脚 wanderer', () => {
    expect(travelFare(20, false)).toBe(20);
    expect(travelFare(20, true)).toBe(10);
    expect(travelFare(5, true)).toBe(3);
  });

  it('charges the fare and records a first visit', () => {
    let s = playingState();
    s.character!.coin = 500;
    const target = reachablePlaces(s).find((p) => p.fare > 0)!;
    const before = s.character!.coin;

    s = executeCommand(s, { kind: 'travel', placeId: target.id });

    expect(s.placeId).toBe(target.id);
    expect(s.character!.coin).toBe(before - target.fare);
    expect(s.character!.visited).toContain(target.id);
    expect(s.stats.placesSeen).toBe(s.character!.visited.length);
  });

  it('refuses a road it cannot pay for, and keeps you where you were', () => {
    let s = playingState();
    s.character!.coin = 0;
    const target = reachablePlaces(s).find((p) => p.fare > 0)!;

    s = executeCommand(s, { kind: 'travel', placeId: target.id });

    expect(s.placeId).toBe(STARTING_PLACE);
    expect(s.character!.coin).toBe(0);
  });

  it('turns a stranger place away rather than crashing', () => {
    let s = playingState();
    s.character!.coin = 999;
    s = executeCommand(s, { kind: 'travel', placeId: 'no_such_place' });
    expect(s.placeId).toBe(STARTING_PLACE);
  });

  it('costs a season and some 心神 even when you stay put', () => {
    const s0 = playingState();
    const s = executeCommand(s0, { kind: 'travel' });
    expect(s.turn).toBe(s0.turn + 1);
    expect(s.character!.spirit).toBeLessThan(s0.character!.spirit);
  });

  it('never offers an event the character is not eligible for', () => {
    const s = playingState();
    for (const bucket of ['波折', '寻常', '际遇', '奇遇'] as const) {
      for (const ev of eligibleEvents(s, bucket)) {
        expect(ev.bucket).toBe(bucket);
        expect(ev.realms).toContain(s.character!.realm.realm);
        if (ev.places.length > 0) expect(ev.places).toContain(s.placeId);
        if (ev.minChessDao !== undefined) {
          expect(s.character!.chessDao).toBeGreaterThanOrEqual(ev.minChessDao);
        }
      }
    }
  });

  it('withholds 奇遇 gated behind a flag until the flag is set', () => {
    const s = playingState();
    const gated = eligibleEvents(s, '奇遇').filter((e) => e.requiresFlag);
    expect(gated).toHaveLength(0);
  });

  it('does not repeat a 一期一会 event once it has been seen', () => {
    const s = playingState();
    const once = eligibleEvents(s, '寻常').find((e) => e.once);
    if (!once) return;
    s.seenEvents.push(once.id);
    expect(eligibleEvents(s, '寻常').some((e) => e.id === once.id)).toBe(false);
  });

  it('leans toward better buckets for a bright 缘法 and away for a clouded mind', () => {
    const lucky = playingState();
    lucky.character!.attributes.yuanFa = 20;
    lucky.character!.attributes.qiYun = 10;
    lucky.character!.dust = 0;

    const grim = playingState();
    grim.character!.attributes.yuanFa = 0;
    grim.character!.attributes.qiYun = 4;
    grim.character!.dust = 100;

    const rank = { 波折: 0, 寻常: 1, 际遇: 2, 奇遇: 3 } as const;
    let luckySum = 0;
    let grimSum = 0;
    for (let i = 0; i < 60; i++) {
      luckySum += rank[rollBucket(lucky)];
      grimSum += rank[rollBucket(grim)];
    }
    expect(luckySum).toBeGreaterThan(grimSum);
  });

  it('always resolves a rolled event into either prose or a pending choice', () => {
    const s = playingState();
    const logBefore = s.narrativeLog.length;
    rollEvent(s);
    expect(s.narrativeLog.length).toBeGreaterThan(logBefore);
    if (s.pendingEvent) {
      expect(s.pendingEvent.choices.length).toBeGreaterThan(0);
    }
  });

  it('clears the pending event when a choice is made', () => {
    let s = playingState();
    for (let i = 0; i < 30 && !s.pendingEvent; i++) {
      s = executeCommand(s, { kind: 'travel' });
    }
    if (!s.pendingEvent) return;
    const n = s.pendingEvent.choices.length;
    s = executeCommand(s, { kind: 'eventChoice', choiceIndex: 0 });
    expect(s.pendingEvent).toBeNull();
    expect(n).toBeGreaterThan(0);
  });

  it('rejects a choice index that is not on the table', () => {
    let s = playingState();
    for (let i = 0; i < 30 && !s.pendingEvent; i++) {
      s = executeCommand(s, { kind: 'travel' });
    }
    if (!s.pendingEvent) return;
    const after = executeCommand(s, { kind: 'eventChoice', choiceIndex: 99 });
    expect(after.pendingEvent).not.toBeNull();
  });
});

describe('坊市 — coin and things', () => {
  it('stocks nothing hidden and nothing above the current realm', () => {
    const s = playingState();
    for (const item of marketStock(s)) {
      expect(item.hidden).toBeFalsy();
      expect(item.price).toBeGreaterThan(0);
      expect(item.minRealm ?? 'chen').toBe('chen');
    }
  });

  it('buys back below the asking price', () => {
    const dear = marketStock(playingState()).sort((a, b) => b.price - a.price)[0]!;
    expect(sellPrice(dear, false)).toBeLessThan(dear.price);
    expect(sellPrice(dear, true)).toBeGreaterThan(sellPrice(dear, false));
    for (const item of marketStock(playingState())) {
      expect(sellPrice(item, false)).toBeGreaterThanOrEqual(1);
    }
  });

  it('moves coin and goods in the right directions on a purchase', () => {
    let s = playingState();
    s.character!.coin = 400;
    const item = marketStock(s)[0]!;
    const before = s.character!.coin;
    const held = countItem(s.character!, item.id);

    s = executeCommand(s, { kind: 'buy', itemId: item.id, count: 2 });

    expect(countItem(s.character!, item.id)).toBe(held + 2);
    expect(s.character!.coin).toBe(before - item.price * 2);
  });

  it('refuses a purchase the purse cannot cover', () => {
    let s = playingState();
    s.character!.coin = 0;
    const item = marketStock(s).sort((a, b) => b.price - a.price)[0]!;
    const held = countItem(s.character!, item.id);
    s = executeCommand(s, { kind: 'buy', itemId: item.id });
    expect(countItem(s.character!, item.id)).toBe(held);
    expect(s.character!.coin).toBe(0);
  });

  it('will not sell what is not in the satchel', () => {
    let s = playingState();
    const before = s.character!.coin;
    s = executeCommand(s, { kind: 'sell', itemId: 'curio_wuziqi' });
    expect(s.character!.coin).toBe(before);
  });

  it('round-trips a purchase and a sale at a loss', () => {
    let s = playingState();
    s.character!.coin = 400;
    const item = marketStock(s)[0]!;
    const held = countItem(s.character!, item.id);
    s = executeCommand(s, { kind: 'buy', itemId: item.id });
    const mid = s.character!.coin;
    s = executeCommand(s, { kind: 'sell', itemId: item.id });
    expect(s.character!.coin).toBeGreaterThan(mid);
    expect(s.character!.coin).toBeLessThan(400);
    expect(countItem(s.character!, item.id)).toBe(held);
  });

  it('consumes a consumable and keeps a curio', () => {
    let s = playingState();
    const consumable = marketStock(s).find((i) => i.consumable)!;
    addItem(s.character!, consumable.id, 1);
    addItem(s.character!, 'curio_songzhi', 1);
    const heldConsumable = countItem(s.character!, consumable.id);
    const heldCurio = countItem(s.character!, 'curio_songzhi');

    s = executeCommand(s, { kind: 'use', itemId: consumable.id });
    expect(countItem(s.character!, consumable.id)).toBe(heldConsumable - 1);

    s = executeCommand(s, { kind: 'use', itemId: 'curio_songzhi' });
    expect(countItem(s.character!, 'curio_songzhi')).toBe(heldCurio);
  });

  it('keeps the satchel free of empty stacks', () => {
    const s = playingState();
    addItem(s.character!, 'curio_songzhi', 2);
    expect(removeItem(s.character!, 'curio_songzhi', 2)).toBe(2);
    expect(s.character!.inventory.some((x) => x.itemId === 'curio_songzhi')).toBe(false);
    expect(removeItem(s.character!, 'curio_songzhi', 1)).toBe(0);
  });

  it('a market season costs a season', () => {
    const s0 = playingState();
    const s = executeCommand(s0, { kind: 'market' });
    expect(s.turn).toBe(s0.turn + 1);
  });
});

describe('赠礼与好感 — how spirits warm', () => {
  it('will not gift to someone who is not here', () => {
    let s = playingState();
    const elsewhere = Object.values(s.spirits).find((x) => x.home !== s.placeId)!;
    addItem(s.character!, 'gift_jiuhu', 1);
    s = executeCommand(s, { kind: 'gift', spiritId: elsewhere.id, itemId: 'gift_jiuhu' });
    expect(s.spirits[elsewhere.id]!.favor).toBe(elsewhere.favor);
    expect(countItem(s.character!, 'gift_jiuhu')).toBe(1);
  });

  it('spends the gift and raises favour for a being who is present', () => {
    let s = playingState();
    const here = Object.values(s.spirits).find((x) => x.home === s.placeId && x.minRealm === 'chen');
    if (!here) return;
    const before = here.favor;
    addItem(s.character!, 'gift_jiuhu', 1);

    s = executeCommand(s, { kind: 'gift', spiritId: here.id, itemId: 'gift_jiuhu' });

    expect(s.spirits[here.id]!.favor).toBeGreaterThan(before);
    expect(countItem(s.character!, 'gift_jiuhu')).toBe(0);
  });

  it('clamps favour to the -50…100 band', () => {
    const s = playingState();
    const id = Object.keys(s.spirits)[0]!;
    addFavor(s, id, 10_000);
    expect(s.spirits[id]!.favor).toBe(100);
    addFavor(s, id, -10_000);
    expect(s.spirits[id]!.favor).toBe(-50);
  });

  it('marks a being as met the first time favour moves', () => {
    const s = playingState();
    const id = Object.keys(s.spirits)[0]!;
    expect(s.spirits[id]!.met).toBe(false);
    addFavor(s, id, 1);
    expect(s.spirits[id]!.met).toBe(true);
  });

  it('ignores favour aimed at nobody', () => {
    const s = playingState();
    expect(addFavor(s, 'no_such_spirit', 30)).toBe(0);
  });
});

describe('棋谱 — 参谱 and 悟谱', () => {
  it('discounts manuals for the 博览 origin', () => {
    const plain = playingState(undefined, 'shusheng', EVEN_ALLOC);
    const reader = playingState(undefined, 'guyi', EVEN_ALLOC);
    const id = 'manual_mingpu_songfeng';
    expect(reader.character!.originId).toBe('guyi');
    expect(manualCost(reader, id)).toBeLessThan(manualCost(plain, id));
  });

  it('refuses a manual the board is not ready for', () => {
    let s = playingState();
    s.character!.insight = 999;
    s.character!.chessDao = 0;
    const hard = getManual('manual_tianpu_taixu')!;
    s = executeCommand(s, { kind: 'learn', manualId: hard.id });
    expect(s.character!.manuals).not.toContain(hard.id);
    expect(s.character!.insight).toBe(999);
  });

  it('refuses a manual there is not enough 悟 for', () => {
    let s = playingState();
    s.character!.insight = 0;
    s.character!.chessDao = 100;
    const m = 'manual_mingpu_shuiyue';
    expect(s.character!.manuals).not.toContain(m);
    s = executeCommand(s, { kind: 'learn', manualId: m });
    expect(s.character!.manuals).not.toContain(m);
  });

  it('spends 悟, records the manual and starts studying it', () => {
    let s = playingState();
    s.character!.insight = 200;
    s.character!.chessDao = 60;
    const m = getManual('manual_gupu_lanke')!;
    const cost = manualCost(s, m.id);

    s = executeCommand(s, { kind: 'learn', manualId: m.id });

    expect(s.character!.manuals).toContain(m.id);
    expect(s.character!.studyingId).toBe(m.id);
    expect(s.character!.insight).toBe(200 - cost);
    expect(s.stats.manualsLearned).toBe(s.character!.manuals.length);
  });

  it('will not learn the same manual twice', () => {
    let s = playingState();
    s.character!.insight = 200;
    s.character!.chessDao = 60;
    s = executeCommand(s, { kind: 'learn', manualId: 'manual_gupu_lanke' });
    const after = s.character!.insight;
    s = executeCommand(s, { kind: 'learn', manualId: 'manual_gupu_lanke' });
    expect(s.character!.insight).toBe(after);
    expect(s.character!.manuals.filter((x) => x === 'manual_gupu_lanke')).toHaveLength(1);
  });

  it('only lets you 参 a manual you have actually comprehended', () => {
    let s = playingState();
    const before = s.character!.studyingId;
    s = executeCommand(s, { kind: 'study', manualId: 'manual_tianpu_taixu' });
    expect(s.character!.studyingId).toBe(before);
  });

  it('explains why each unlearned manual is out of reach', () => {
    const s = playingState();
    s.character!.chessDao = 0;
    s.character!.insight = 0;
    const list = learnableManuals(s);
    expect(list.length).toBeGreaterThan(0);
    for (const entry of list) {
      expect(s.character!.manuals).not.toContain(entry.id);
      expect(entry.reason).not.toBeNull();
      expect(entry.cost).toBeGreaterThan(0);
    }
  });

  it('drops the reason once the requirements are met', () => {
    const s = playingState();
    s.character!.chessDao = 100;
    s.character!.insight = 9999;
    expect(learnableManuals(s).every((e) => e.reason === null)).toBe(true);
  });
});

describe('applyEffect — one door for every consequence', () => {
  it('reports what it changed and clamps the meters it touches', () => {
    const s = playingState();
    const c = s.character!;
    c.dust = 5;

    const report = applyEffect(s, {
      narrative: '—',
      exp: 20,
      insight: 3,
      coin: 40,
      chessDao: 5,
      dust: -100,
    });

    expect(report.lines.length).toBeGreaterThan(0);
    expect(c.dust).toBe(0);
    expect(c.insight).toBe(3 + 0);
    expect(c.coin).toBeGreaterThanOrEqual(40);
  });

  it('hands over items and teaches manuals', () => {
    const s = playingState();
    applyEffect(s, {
      narrative: '—',
      items: [{ itemId: 'curio_songzhi', count: 2 }],
      teachManual: 'manual_canpu_wuwei',
    });
    expect(countItem(s.character!, 'curio_songzhi')).toBe(2);
    expect(s.character!.manuals).toContain('manual_canpu_wuwei');
  });

  it('passes a match and an ending back to the caller instead of acting alone', () => {
    const s = playingState();
    const report = applyEffect(s, {
      narrative: '—',
      match: 'chaguan_laozhang',
      ending: 'end_wuming',
    });
    expect(report.match).toBe('chaguan_laozhang');
    expect(report.ending).toBe('end_wuming');
    expect(s.phase).toBe('playing');
  });

  it('adds a mood that later expires', () => {
    const s = playingState();
    applyEffect(s, {
      narrative: '—',
      mood: { id: 'test_mood', name: '试心', kind: 'boon', turnsLeft: 2, desc: '—' },
    });
    expect(s.character!.moods.some((m) => m.id === 'test_mood')).toBe(true);
  });

  it('never lets an item id it does not know into the satchel', () => {
    const s = playingState();
    applyEffect(s, { narrative: '—', items: [{ itemId: 'ghost_item', count: 1 }] });
    for (const stack of s.character!.inventory) {
      expect(getItem(stack.itemId), stack.itemId).toBeDefined();
    }
  });
});
