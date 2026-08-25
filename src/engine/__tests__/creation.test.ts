import { describe, expect, it } from 'vitest';

import type { Attributes, GameState } from '../types';
import {
  allocateAttributes,
  BASE_ELEMENTS,
  chooseOrigin,
  lookupSpiritRootRow,
  MUTANT_ELEMENTS,
  newGame,
  resolveSpiritRoot,
  rollHiddenFate,
  rollSpiritRoot,
} from '../creation';
import {
  BASE_ATTRIBUTE,
  buildAttributes,
  FREE_POINTS,
  mapHiddenRollToJiYuan,
  validateAllocation,
} from '../attributes';
import { START_AGE } from '../lifecycle';
import { lifespanFor } from '../realms';
import { ORIGINS } from '@/data/origins';

interface LooseOrigin {
  id: string;
  name: string;
  attributeMods?: Partial<Attributes>;
  startSpiritStones?: number;
  startItems?: string[];
  startFlags?: Record<string, boolean | number>;
  startTechniqueId?: string;
}

const ORIGIN_LIST = ORIGINS as unknown as LooseOrigin[];
const FIRST = ORIGIN_LIST[0]!;

const ALLOC = { genGu: 8, wuXing: 8, xinXing: 7, qiYun: 7 }; // 30 = 5×4 + 10

/** Run the full 4-step flow; every step must land on the next gate. */
function runFlow(seed: string, originId = FIRST.id, alloc = ALLOC): GameState {
  let s = newGame(seed);
  s = chooseOrigin(s, originId, '韩立', '男');
  if (s.creationStep !== 1) throw new Error('origin step failed');
  s = allocateAttributes(s, alloc);
  if (s.creationStep !== 2) throw new Error('allocation step failed');
  s = rollSpiritRoot(s);
  if (s.creationStep !== 3) throw new Error('spirit-root step failed');
  s = rollHiddenFate(s);
  if (s.creationStep !== 4) throw new Error('hidden-roll step failed');
  return s;
}

describe('灵根 D100 lottery (resolveSpiritRoot)', () => {
  const draw = (n: number) => 0 % n;

  it.each([
    [1, '五灵根', 0.5, 5],
    [40, '五灵根', 0.5, 5],
    [41, '四灵根', 0.7, 4],
    [65, '四灵根', 0.7, 4],
    [66, '三灵根', 0.9, 3],
    [82, '三灵根', 0.9, 3],
    [83, '双灵根', 1.2, 2],
    [93, '双灵根', 1.2, 2],
    [94, '真灵根', 1.6, 1],
    [97, '真灵根', 1.6, 1],
    [98, '异灵根', 2.2, 1],
    [99, '异灵根', 2.2, 1],
    [100, '天灵根', 3.0, 1],
  ] as const)('D100=%i → %s ×%d (%i elements)', (d100, grade, mult, count) => {
    const root = resolveSpiritRoot(d100, draw);
    expect(root.grade).toBe(grade);
    expect(root.speedMultiplier).toBe(mult);
    expect(root.elements).toHaveLength(count);
    expect(root.rollValue).toBe(d100);
  });

  it('picks distinct base elements', () => {
    const root = resolveSpiritRoot(83, (n) => n - 1); // 双灵根, always pick last
    expect(new Set(root.elements).size).toBe(2);
    for (const e of root.elements) expect(BASE_ELEMENTS).toContain(e);
  });

  it('异灵根 draws a mutated element (雷/冰/风)', () => {
    for (let i = 0; i < 3; i++) {
      const root = resolveSpiritRoot(98, () => i);
      expect(root.elements).toHaveLength(1);
      expect(MUTANT_ELEMENTS).toContain(root.elements[0]);
    }
  });
});

describe('暗掷 hidden roll → 机缘 mapping', () => {
  it.each([
    [1, 1],
    [10, 1],
    [11, 2],
    [55, 6],
    [80, 8],
    [100, 10],
  ])('D100=%i → 机缘%i', (d100, jiYuan) => {
    expect(mapHiddenRollToJiYuan(d100)).toBe(jiYuan);
  });
});

describe('属性分配 validation (final values, 5–10 each, total 30)', () => {
  it('accepts a legal spread', () => {
    expect(validateAllocation(ALLOC)).toBeNull();
    expect(validateAllocation({ genGu: 10, wuXing: 10, xinXing: 5, qiYun: 5 })).toBeNull();
  });

  it('rejects wrong totals, overflow, under-base and fractions', () => {
    expect(validateAllocation({ genGu: 5, wuXing: 5, xinXing: 5, qiYun: 5 })).not.toBeNull(); // points unspent
    expect(validateAllocation({ genGu: 11, wuXing: 7, xinXing: 6, qiYun: 6 })).not.toBeNull(); // cap 10
    expect(validateAllocation({ genGu: 4, wuXing: 10, xinXing: 8, qiYun: 8 })).not.toBeNull(); // below base
    expect(validateAllocation({ genGu: 7.5, wuXing: 7.5, xinXing: 7.5, qiYun: 7.5 })).not.toBeNull();
  });

  it('builds attributes with origin mods, 机缘 sealed at 0', () => {
    const attrs = buildAttributes(ALLOC, { genGu: 2 });
    expect(attrs.genGu).toBe(ALLOC.genGu + 2);
    expect(attrs.jiYuan).toBe(0);
    const visibleSum = attrs.genGu + attrs.wuXing + attrs.xinXing + attrs.qiYun;
    expect(visibleSum).toBe(BASE_ATTRIBUTE * 4 + FREE_POINTS + 2);
  });
});

describe('4-step creation state machine', () => {
  it('runs the full flow and produces a valid Character', () => {
    const origin = FIRST;
    const s = runFlow('seed-flow');
    expect(s.phase).toBe('playing');
    expect(s.creationStep).toBe(4);
    expect(s.creationDraft).toBeNull();

    const ch = s.character!;
    expect(ch).not.toBeNull();
    expect(ch.name).toBe('韩立');
    expect(ch.originId).toBe(origin.id);

    const expected = buildAttributes(ALLOC, origin.attributeMods ?? {});
    expect(ch.attributes.genGu).toBe(expected.genGu);
    expect(ch.attributes.wuXing).toBe(expected.wuXing);
    expect(ch.attributes.jiYuan).toBeGreaterThanOrEqual(1);
    expect(ch.attributes.jiYuan).toBeLessThanOrEqual(10);

    expect(ch.age).toBe(START_AGE);
    expect(ch.lifespan).toBe(lifespanFor('mortal'));
    expect(ch.realm.realm).toBe('mortal');
    expect(ch.hp).toBe(ch.maxHp);
    expect(ch.maxHp).toBeGreaterThan(0);
    expect(ch.spiritStones).toBe(origin.startSpiritStones ?? 0);
    expect(ch.techniqueId).toBe(origin.startTechniqueId ?? null);

    // starting items are stacked correctly
    const wanted = new Map<string, number>();
    for (const id of origin.startItems ?? []) wanted.set(id, (wanted.get(id) ?? 0) + 1);
    expect(ch.inventory).toHaveLength(wanted.size);
    for (const stack of ch.inventory) expect(stack.count).toBe(wanted.get(stack.itemId));

    // spirit root is consistent with the lottery table for its recorded roll
    const row = lookupSpiritRootRow(ch.spiritRoot.rollValue);
    expect(ch.spiritRoot.grade).toBe(row.grade);
    expect(ch.spiritRoot.speedMultiplier).toBe(row.speedMultiplier);

    // 机缘 maps exactly from the SEALED audited roll
    const hiddenRoll = s.rolls.find((r) => r.reason === '天命暗掷')!;
    expect(hiddenRoll).toBeDefined();
    expect(hiddenRoll.sealed).toBe(true);
    expect(ch.attributes.jiYuan).toBe(mapHiddenRollToJiYuan(hiddenRoll.value));

    // the audit trail shows every creation roll happened
    expect(s.rolls.some((r) => r.reason === '灵根抽取')).toBe(true);
  });

  it('cannot skip steps', () => {
    const s0 = newGame('seed-skip');
    expect(allocateAttributes(s0, ALLOC).creationStep).toBe(0);
    expect(rollSpiritRoot(s0).creationStep).toBe(0);
    expect(rollHiddenFate(s0).creationStep).toBe(0);
  });

  it('cannot redo a confirmed step (no re-rolls, ever)', () => {
    let s = newGame('seed-redo');
    s = chooseOrigin(s, FIRST.id, '张三', '男');
    const again = chooseOrigin(s, ORIGIN_LIST[1]?.id ?? FIRST.id);
    expect(again.creationStep).toBe(1); // origin locked
    expect(again.creationDraft!.originId).toBe(FIRST.id);

    s = allocateAttributes(s, ALLOC);
    const attrsBefore = s.creationDraft!.attributes;
    expect(allocateAttributes(s, ALLOC).creationDraft!.attributes).toEqual(attrsBefore);

    s = rollSpiritRoot(s);
    const rootBefore = s.creationDraft!.spiritRoot;
    const rerolled = rollSpiritRoot(s);
    expect(rerolled.creationStep).toBe(3);
    expect(rerolled.creationDraft!.spiritRoot).toEqual(rootBefore); // one D100, final
    expect(rerolled.rolls.length).toBe(s.rolls.length); // deny consumed no dice

    s = rollHiddenFate(s);
    const sealedCount = s.rolls.filter((r) => r.sealed).length;
    const after = rollHiddenFate(s);
    expect(after.rolls.filter((r) => r.sealed).length).toBe(sealedCount);
  });

  it('rejects unknown origins and bad allocations without advancing', () => {
    const s = newGame('seed-bad');
    expect(chooseOrigin(s, 'immortal-emperor').creationStep).toBe(0);
    const s1 = chooseOrigin(s, FIRST.id, '李四');
    expect(allocateAttributes(s1, { genGu: 30, wuXing: 0, xinXing: 0, qiYun: 0 }).creationStep).toBe(1);
  });

  it('never reveals the hidden 机缘 — sealed narration is digit-free', () => {
    let s = newGame('seed-seal');
    s = chooseOrigin(s, FIRST.id, '王五', '女');
    s = allocateAttributes(s, ALLOC);
    s = rollSpiritRoot(s);
    const logsBefore = s.narrativeLog.length;
    const done = rollHiddenFate(s);

    const newLines = done.narrativeLog.slice(logsBefore).map((l) => l.text);
    expect(newLines.some((t) => t.includes('天道已掷，命数已定'))).toBe(true);
    for (const line of newLines) expect(/\d/.test(line)).toBe(false);
  });

  it('is deterministic: same seed → identical character', () => {
    const a = runFlow('seed-det').character!;
    const b = runFlow('seed-det').character!;
    expect(a).toEqual(b);
  });

  it('different seeds diverge somewhere in the audit trail', () => {
    const a = runFlow('seed-a');
    const b = runFlow('seed-b');
    const valuesA = a.rolls.map((r) => r.value).join(',');
    const valuesB = b.rolls.map((r) => r.value).join(',');
    // not a hard guarantee for any two seeds, but these two are chosen to differ
    expect(valuesA).not.toBe(valuesB);
  });
});
