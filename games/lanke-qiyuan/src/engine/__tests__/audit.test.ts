import { describe, expect, it } from 'vitest';
import {
  GENESIS_HASH,
  buildAuditTable,
  buildChainEntry,
  chainAuditHash,
  checkInvariants,
  formatAuditId,
  formatAuditRecord,
  isForbiddenWish,
  realmAtLeast,
  saveChecksum,
  sha256Hex,
  verifyChain,
} from '@/engine/audit';
import type { DiceRoll } from '@/engine/types';
import { playingState } from './helpers';

describe('audit — sha256', () => {
  it('matches the published vector for "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the published vector for the empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('handles multi-byte UTF-8 and long inputs', () => {
    expect(sha256Hex('烂柯棋缘')).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex('子'.repeat(5000))).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is avalanche-sensitive to a one-character change', () => {
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });
});

describe('audit — the hash chain', () => {
  it('has a fixed, game-specific genesis', () => {
    expect(GENESIS_HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(GENESIS_HASH).toBe(sha256Hex('lkqy-genesis-v1:观棋柯烂,世事如枰。'));
  });

  it('depends on every input', () => {
    const base = chainAuditHash(GENESIS_HASH, 1, 'cultivate', [5]);
    expect(chainAuditHash(GENESIS_HASH, 2, 'cultivate', [5])).not.toBe(base);
    expect(chainAuditHash(GENESIS_HASH, 1, 'spectate', [5])).not.toBe(base);
    expect(chainAuditHash(GENESIS_HASH, 1, 'cultivate', [6])).not.toBe(base);
  });

  it('verifies an untampered chain', () => {
    const entries = [];
    let prev = GENESIS_HASH;
    for (let turn = 1; turn <= 6; turn++) {
      const entry = buildChainEntry(prev, turn, 'cultivate', [turn * 3]);
      entries.push(entry);
      prev = entry.hash;
    }
    const result = verifyChain(entries);
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeNull();
    expect(result.headHash).toBe(prev);
  });

  it('pinpoints the first tampered link', () => {
    const entries = [];
    let prev = GENESIS_HASH;
    for (let turn = 1; turn <= 5; turn++) {
      const entry = buildChainEntry(prev, turn, 'travel', [turn]);
      entries.push(entry);
      prev = entry.hash;
    }
    entries[2]!.rollValues = [999];
    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it('treats an empty chain as valid at genesis', () => {
    expect(verifyChain([])).toEqual({ valid: true, brokenAt: null, headHash: GENESIS_HASH });
  });

  it('digests a state snapshot deterministically', () => {
    const s = playingState();
    expect(saveChecksum(s)).toBe(saveChecksum(s));
  });
});

describe('audit — the 棋录 view', () => {
  const base: DiceRoll = { id: 7, turn: 3, die: 'D20', value: 14, reason: '观棋·所见', seedState: 'deadbeef' };

  it('formats record ids as QL-XXXX', () => {
    expect(formatAuditId(1)).toBe('QL-0001');
    expect(formatAuditId(4211)).toBe('QL-4211');
  });

  it('shows an ordinary roll in full', () => {
    const record = formatAuditRecord(base);
    expect(record.display).toBe('14');
    expect(record.sealed).toBe(false);
    expect(record.reason).toBe('观棋·所见');
  });

  it('redacts a sealed roll but keeps the record', () => {
    const record = formatAuditRecord({ ...base, sealed: true, reason: '缘法暗掷' });
    expect(record.display).toBe('封');
    expect(record.display).not.toContain('14');
    expect(record.reason).toContain('缘法已定');
  });

  it('builds one row per roll', () => {
    const table = buildAuditTable([base, { ...base, id: 8 }]);
    expect(table).toHaveLength(2);
    expect(table.map((r) => r.recordId)).toEqual(['QL-0007', 'QL-0008']);
  });
});

describe('audit — wishes and realm order', () => {
  it('rejects wishing and cheating', () => {
    for (const text of ['我希望得到天谱', '给我一万银钱', '修改棋道', 'god mode', '开金手指']) {
      expect(isForbiddenWish(text)).toBe(true);
    }
  });

  it('lets ordinary commands through', () => {
    for (const text of ['修炼', '观棋', '游历 烂柯山', '']) {
      expect(isForbiddenWish(text)).toBe(false);
    }
  });

  it('orders realms along the ladder', () => {
    expect(realmAtLeast('zuowang', 'mingxin')).toBe(true);
    expect(realmAtLeast('chen', 'chen')).toBe(true);
    expect(realmAtLeast('mingxin', 'tianren')).toBe(false);
  });
});

describe('audit — post-turn invariants', () => {
  it('passes a freshly created life', () => {
    expect(checkInvariants(playingState())).toBeNull();
  });

  it('catches negative money', () => {
    const s = playingState();
    s.character!.coin = -1;
    expect(checkInvariants(s)).toContain('银钱为负');
  });

  it('catches 心神 above its ceiling', () => {
    const s = playingState();
    s.character!.spirit = s.character!.maxSpirit + 5;
    expect(checkInvariants(s)).toContain('心神逾上限');
  });

  it('catches 心尘 and 棋道 out of range', () => {
    const s = playingState();
    s.character!.dust = 140;
    s.character!.chessDao = 220;
    const violation = checkInvariants(s)!;
    expect(violation).toContain('心尘越界');
    expect(violation).toContain('棋道越界');
  });

  it('catches 修为 overflowing its bar', () => {
    const s = playingState();
    s.character!.realm.exp = s.character!.realm.expNeeded + 1;
    expect(checkInvariants(s)).toContain('修为溢出');
  });

  it('catches an unknown realm', () => {
    const s = playingState();
    // deliberately corrupt: only the invariant layer should notice
    (s.character!.realm as { realm: string }).realm = 'nowhere';
    expect(checkInvariants(s)).toContain('未知境界');
  });

  it('catches a broken item stack and out-of-range favour', () => {
    const s = playingState();
    s.character!.inventory.push({ itemId: 'tea_cuya', count: 0 });
    s.spirits.zhuxian!.favor = 500;
    const violation = checkInvariants(s)!;
    expect(violation).toContain('物品堆叠异常');
    expect(violation).toContain('好感越界');
  });

  it('catches a scrambled roll sequence', () => {
    const s = playingState();
    const first = s.rolls[0]!;
    s.rolls = [{ ...first, id: 9 }, { ...first, id: 2 }];
    expect(checkInvariants(s)).toContain('掷序紊乱');
  });
});
