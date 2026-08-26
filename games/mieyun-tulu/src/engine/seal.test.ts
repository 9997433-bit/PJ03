import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EVENTS } from '@/data/events';
import { daoYuanOmen, passesDaoYuanGate, revealDaoYuan, SEAL_REASON } from './seal';
import { newRun } from '@/test/helpers';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(item.name) && !item.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

describe('seal · 道缘', () => {
  it('is rolled once at creation, in range', () => {
    const c = newRun('seal').character!;
    expect(c.daoYuan).toBeGreaterThanOrEqual(1);
    expect(c.daoYuan).toBeLessThanOrEqual(100);
    expect(Number.isInteger(c.daoYuan)).toBe(true);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(newRun('same').character!.daoYuan).toBe(newRun('same').character!.daoYuan);
    const spread = new Set(
      Array.from({ length: 30 }, (_, i) => newRun(`spread-${i}`).character!.daoYuan),
    );
    expect(spread.size).toBeGreaterThan(5);
  });

  it('files the roll in the ledger under an opaque reason', () => {
    const s = newRun('ledger');
    const record = s.rolls.find((r) => r.reason === SEAL_REASON);
    expect(record).toBeDefined();
    expect(record!.reason).not.toContain('道缘');
  });

  it('is never spoken aloud in the creation log', () => {
    const s = newRun('quiet');
    const value = String(s.character!.daoYuan);
    for (const line of s.log) {
      expect(line.text).not.toContain('道缘');
      expect(line.text.includes(`封:${value}`)).toBe(false);
    }
  });

  it('is touched by no module but the type, the roll and the seal itself', () => {
    const readers = walk(SRC)
      .filter((f) => /\bdaoYuan\b/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(`${SRC}/`, ''))
      .sort();
    expect(readers).toEqual(['engine/creation.ts', 'engine/seal.ts', 'engine/types.ts']);
  });

  it('reaches the UI only through the sanctioned reader', () => {
    const ui = walk(join(SRC, 'components'))
      .concat(walk(join(SRC, 'app')))
      .filter((f) => /道缘/.test(readFileSync(f, 'utf8')));
    expect(ui.length).toBeGreaterThan(0);
    for (const file of ui) {
      expect(readFileSync(file, 'utf8')).toContain('revealDaoYuan');
    }
  });
});

describe('seal · 门槛', () => {
  it('waves through every event without a gate', () => {
    const c = newRun('nogate').character!;
    for (const ev of EVENTS.filter((e) => e.minDaoYuan === undefined)) {
      expect(passesDaoYuanGate(c, ev)).toBe(true);
    }
  });

  it('opens a gated event only to a high enough roll', () => {
    const gated = EVENTS.find((e) => e.minDaoYuan !== undefined)!;
    const c = newRun('gate').character!;
    c.daoYuan = gated.minDaoYuan! - 1;
    expect(passesDaoYuanGate(c, gated)).toBe(false);
    c.daoYuan = gated.minDaoYuan!;
    expect(passesDaoYuanGate(c, gated)).toBe(true);
  });

  it('gates at least one destiny event, so the roll matters', () => {
    expect(EVENTS.some((e) => e.minDaoYuan !== undefined)).toBe(true);
  });
});

describe('seal · 影', () => {
  it('hints in three buckets and never quotes a number', () => {
    const c = newRun('omen').character!;
    const seen = new Set<string>();
    for (const v of [1, 30, 54, 55, 70, 84, 85, 100]) {
      c.daoYuan = v;
      const omen = daoYuanOmen(c);
      expect(omen).not.toMatch(/\d/);
      seen.add(omen);
    }
    expect(seen.size).toBe(3);
  });

  it('is monotone — a higher roll never gives a fainter omen', () => {
    const c = newRun('monotone').character!;
    const rank = (v: number) => {
      c.daoYuan = v;
      const omen = daoYuanOmen(c);
      return omen.includes('翻到你这一页') ? 2 : omen.includes('墨香') ? 1 : 0;
    };
    let prev = -1;
    for (let v = 1; v <= 100; v++) {
      const r = rank(v);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });

  it('reveals the number only through the sanctioned reader', () => {
    const c = newRun('reveal').character!;
    expect(revealDaoYuan(c)).toBe(c.daoYuan);
  });
});
