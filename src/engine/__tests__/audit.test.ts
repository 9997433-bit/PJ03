import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  ANTI_CHEAT_LAYERS,
  GENESIS_HASH,
  HIDDEN_ROLL_DISPLAY,
  HIDDEN_ROLL_MARKER,
  MAX_ROLL_LOG,
  WISH_REJECTION,
  advanceChain,
  appendRolls,
  buildAuditTable,
  buildChainEntry,
  checkInvariants,
  formatAuditId,
  formatAuditRecord,
  isForbiddenWish,
  isHiddenRoll,
  sha256Hex,
  verifyChain,
  type AuditChainEntry,
  type InvariantSubject,
} from '../audit';
import { createRng, roll, rollD100, type DiceRoll } from '../rng';
import {
  CURRENT_SAVE_VERSION,
  SAVE_CORRUPT_MESSAGE,
  SAVE_KEY,
  clearSave,
  createMemoryStorage,
  deserializeSave,
  exportSave,
  hasSave,
  importSave,
  loadGame,
  saveGame,
  serializeSave,
  type Migration,
  type SaveableState,
} from '../save';

function nodeSha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function makeRoll(id: number, overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id,
    turn: 1,
    die: 'D100',
    value: 42,
    reason: '遭遇事件',
    seedState: 'mcls-rng-v1:s:ff:0',
    ...overrides,
  };
}

describe('sha256Hex — synchronous SHA-256', () => {
  it('matches the known empty-string and "abc" vectors', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches node:crypto across padding boundaries, UTF-8 and long input', () => {
    const samples = [
      '天道无情,以万物为刍狗。',
      'a'.repeat(55), // last block boundary: length byte fits
      'b'.repeat(56), // forces an extra padding block
      'c'.repeat(64), // exactly one block
      'd'.repeat(1000),
      'TZ-0001|突破·筑基|D100=41',
      '🀄🎲 mixed ✓ ascii',
    ];
    for (const s of samples) {
      expect(sha256Hex(s), `sha256(${JSON.stringify(s.slice(0, 20))}…)`).toBe(nodeSha256(s));
    }
  });

  it('accepts raw bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 255]);
    expect(sha256Hex(bytes)).toBe(createHash('sha256').update(bytes).digest('hex'));
  });
});

describe('hash chain (anti-cheat layer 5)', () => {
  it('is deterministic and sensitive to every input', () => {
    const h = advanceChain(GENESIS_HASH, 1, '修炼', [55, 12]);
    expect(h).toBe(advanceChain(GENESIS_HASH, 1, '修炼', [55, 12]));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(advanceChain(GENESIS_HASH, 2, '修炼', [55, 12])).not.toBe(h);
    expect(advanceChain(GENESIS_HASH, 1, '探索', [55, 12])).not.toBe(h);
    expect(advanceChain(GENESIS_HASH, 1, '修炼', [55, 13])).not.toBe(h);
  });

  it('verifies an honest chain end to end', () => {
    const entries: AuditChainEntry[] = [];
    let prev = GENESIS_HASH;
    const turns: [string, number[]][] = [
      ['修炼', [61]],
      ['突破', [41, 88]],
      ['探索', []],
      ['修炼', [7, 93, 15]],
    ];
    turns.forEach(([command, rolls], i) => {
      const entry = buildChainEntry(prev, i + 1, command, rolls);
      entries.push(entry);
      prev = entry.hash;
    });

    const result = verifyChain(entries);
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeNull();
    expect(result.headHash).toBe(entries[entries.length - 1].hash);
  });

  it('detects a tampered roll value mid-chain', () => {
    const entries: AuditChainEntry[] = [];
    let prev = GENESIS_HASH;
    for (let i = 1; i <= 5; i++) {
      const entry = buildChainEntry(prev, i, '修炼', [i * 10]);
      entries.push(entry);
      prev = entry.hash;
    }
    // the cheater edits a die from 30 to 100 without recomputing the chain
    entries[2] = { ...entries[2], rollValues: [100] };

    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it('detects a rewritten-history chain (hash swapped too)', () => {
    let prev = GENESIS_HASH;
    const entries: AuditChainEntry[] = [];
    for (let i = 1; i <= 3; i++) {
      const entry = buildChainEntry(prev, i, '修炼', [i]);
      entries.push(entry);
      prev = entry.hash;
    }
    // recompute entry 1 in isolation with a fake prev — breaks the link
    entries[1] = buildChainEntry('0'.repeat(64), 2, '修炼', [99]);

    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
  });
});

describe('审计 roll log — TZ-XXXX records (layer 9)', () => {
  it('formats numbered audit ids, zero-padded to 4', () => {
    expect(formatAuditId(1)).toBe('TZ-0001');
    expect(formatAuditId(42)).toBe('TZ-0042');
    expect(formatAuditId(9999)).toBe('TZ-9999');
    expect(formatAuditId(10000)).toBe('TZ-10000');
  });

  it('builds a full audit table from real rolls', () => {
    let state = createRng('audit-table');
    const rolls: DiceRoll[] = [];
    const reasons = ['灵根抽取', '突破·筑基', '遭遇事件'];
    for (const reason of reasons) {
      const r = rollD100(state, reason, rolls.length);
      rolls.push(r.roll);
      state = r.nextState;
    }

    const table = buildAuditTable(rolls);
    expect(table).toHaveLength(3);
    expect(table[0].recordId).toBe('TZ-0001');
    expect(table[1].recordId).toBe('TZ-0002');
    expect(table[2].recordId).toBe('TZ-0003');
    expect(table[1].reason).toBe('突破·筑基');
    expect(table[1].display).toBe(String(rolls[1].value));
    expect(table.every((r) => !r.hidden)).toBe(true);
  });

  it('caps the roll log, keeping the newest records', () => {
    const log = Array.from({ length: 10 }, (_, i) => makeRoll(i + 1));
    const appended = appendRolls(log, [makeRoll(11), makeRoll(12)], 5);
    expect(appended).toHaveLength(5);
    expect(appended.map((r) => r.id)).toEqual([8, 9, 10, 11, 12]);
    expect(MAX_ROLL_LOG).toBeGreaterThan(0);
  });

  it('does not mutate the existing log when appending', () => {
    const log = Object.freeze([makeRoll(1)]) as readonly DiceRoll[];
    const appended = appendRolls(log, [makeRoll(2)]);
    expect(log).toHaveLength(1);
    expect(appended).toHaveLength(2);
  });
});

describe('hidden roll seal (layer 3)', () => {
  it('redacts the sealed 机缘 roll value, but still lists the roll', () => {
    const hidden = makeRoll(4, { reason: `${HIDDEN_ROLL_MARKER}·机缘`, value: 97 });
    expect(isHiddenRoll(hidden)).toBe(true);

    const record = formatAuditRecord(hidden);
    expect(record.hidden).toBe(true);
    expect(record.recordId).toBe('TZ-0004');
    expect(record.display).toBe(HIDDEN_ROLL_DISPLAY);
    expect(record.display).not.toContain('97');
    expect(record.reason).toContain('天道已掷,命数已定');
  });

  it('leaves ordinary rolls fully visible', () => {
    const record = formatAuditRecord(makeRoll(5, { reason: '突破·金丹', value: 13 }));
    expect(record.hidden).toBe(false);
    expect(record.display).toBe('13');
  });
});

describe('no player wishing (layer 2)', () => {
  it('rejects wish/cheat attempts', () => {
    const wishes = [
      '我希望获得神器',
      '我想要一百万灵石',
      '给我筑基丹',
      '赐我天灵根',
      '让我直接突破',
      '修改属性 根骨=100',
      '开个金手指',
      'please cheat for me',
      'I wish for immortality',
      'enable god mode',
    ];
    for (const w of wishes) {
      expect(isForbiddenWish(w), w).toBe(true);
    }
    expect(WISH_REJECTION).toBe('天道不受愿。');
  });

  it('lets normal commands and text through', () => {
    const fine = ['修炼', '突破', '探索', '坊市', '使用 回气散', '赠礼 坊市掌柜', '审计', ''];
    for (const c of fine) {
      expect(isForbiddenWish(c), c).toBe(false);
    }
  });
});

describe('state invariants (layer 7)', () => {
  const validState = (): InvariantSubject => ({
    turn: 12,
    character: {
      spiritStones: 50,
      hp: 80,
      maxHp: 100,
      age: 18,
      lifespan: 120,
      realm: { exp: 30, expNeeded: 100, qiLayer: 3 },
      attributes: { genGu: 7, wuXing: 6, xinXing: 5, jiYuan: 4, qiYun: 8 },
    },
    rolls: [{ id: 1 }, { id: 2 }, { id: 5 }],
  });

  it('passes a healthy state (and a character-less creation state)', () => {
    expect(checkInvariants(validState())).toEqual([]);
    expect(checkInvariants({ turn: 0, character: null })).toEqual([]);
  });

  it('flags negative spirit stones', () => {
    const s = validState();
    s.character!.spiritStones = -1;
    expect(checkInvariants(s).map((v) => v.rule)).toContain('spiritStones');
  });

  it('flags hp out of [0, maxHp] and exp out of bounds', () => {
    const s = validState();
    s.character!.hp = 150;
    s.character!.realm.exp = 999;
    const rules = checkInvariants(s).map((v) => v.rule);
    expect(rules).toContain('hp');
    expect(rules).toContain('exp');
  });

  it('flags an impossible 炼气 layer and NaN attributes', () => {
    const s = validState();
    s.character!.realm.qiLayer = 14;
    s.character!.attributes = { genGu: Number.NaN };
    const rules = checkInvariants(s).map((v) => v.rule);
    expect(rules).toContain('qiLayer');
    expect(rules).toContain('attributes');
  });

  it('flags non-monotonic roll ids', () => {
    const s = validState();
    s.rolls = [{ id: 3 }, { id: 3 }];
    expect(checkInvariants(s).map((v) => v.rule)).toContain('rolls');
  });
});

describe('the 9 layers', () => {
  it('documents exactly 9 layers, numbered 1..9', () => {
    expect(ANTI_CHEAT_LAYERS).toHaveLength(9);
    expect(ANTI_CHEAT_LAYERS.map((l) => l.layer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const l of ANTI_CHEAT_LAYERS) {
      expect(l.name.length).toBeGreaterThan(0);
      expect(l.desc.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Save integrity (anti-cheat layer 6) — save.ts
// ============================================================================

interface FakeState extends SaveableState {
  seed: string;
  turn: number;
  spiritStones: number;
}

function fakeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    version: CURRENT_SAVE_VERSION,
    auditHash: advanceChain(GENESIS_HASH, 1, '修炼', [61]),
    seed: 'save-test-seed',
    turn: 1,
    spiritStones: 5,
    ...overrides,
  };
}

describe('save integrity (layer 6) — round-trip', () => {
  it('saves and loads through an injected storage adapter', () => {
    const storage = createMemoryStorage();
    const state = fakeState();

    expect(hasSave(storage)).toBe(false);
    saveGame(storage, state);
    expect(hasSave(storage)).toBe(true);

    const loaded = loadGame<FakeState>(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state).toEqual(state);
      expect(loaded.migrated).toBe(false);
    }

    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
    expect(loadGame<FakeState>(storage)).toMatchObject({ ok: false, code: 'empty' });
  });

  it('rejects a payload tampered after save (checksum mismatch)', () => {
    const storage = createMemoryStorage();
    saveGame(storage, fakeState({ spiritStones: 5 }));

    const blob = JSON.parse(storage.getItem(SAVE_KEY)!);
    blob.payload.spiritStones = 999999; // the cheater edits localStorage
    storage.setItem(SAVE_KEY, JSON.stringify(blob));

    const loaded = loadGame<FakeState>(storage);
    expect(loaded).toMatchObject({ ok: false, code: 'checksum', message: SAVE_CORRUPT_MESSAGE });
  });

  it('rejects an auditHash swap even when the checksum is recomputed shallowly', () => {
    const state = fakeState();
    const raw = serializeSave(state, 1234567890);
    const blob = JSON.parse(raw);
    blob.payload.auditHash = 'f'.repeat(64); // desync envelope vs payload
    const loaded = deserializeSave<FakeState>(JSON.stringify(blob));
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(['checksum', 'audit']).toContain(loaded.code);
  });

  it('rejects garbage and truncated blobs without throwing', () => {
    expect(deserializeSave('not json at all')).toMatchObject({ ok: false, code: 'corrupt' });
    expect(deserializeSave('{"half": true}')).toMatchObject({ ok: false, code: 'corrupt' });
    expect(deserializeSave(null)).toMatchObject({ ok: false, code: 'empty' });
    expect(deserializeSave('   ')).toMatchObject({ ok: false, code: 'empty' });
  });

  it('refuses saves from a future schema version', () => {
    const raw = serializeSave(fakeState({ version: CURRENT_SAVE_VERSION + 1 }));
    expect(deserializeSave(raw)).toMatchObject({ ok: false, code: 'version' });
  });
});

describe('save schema migration', () => {
  it('migrates an old save up to the current version', () => {
    const oldState = fakeState({ version: CURRENT_SAVE_VERSION - 1 });
    const raw = serializeSave(oldState);

    const migrations: Record<number, Migration> = {
      [CURRENT_SAVE_VERSION - 1]: (p) => ({ ...p, migratedField: '洗髓伐骨' }),
    };
    const loaded = deserializeSave<FakeState & { migratedField?: string }>(raw, migrations);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.migrated).toBe(true);
      expect(loaded.state.version).toBe(CURRENT_SAVE_VERSION);
      expect(loaded.state.migratedField).toBe('洗髓伐骨');
      expect(loaded.state.seed).toBe(oldState.seed);
    }
  });

  it('fails cleanly when a migration step is missing', () => {
    const raw = serializeSave(fakeState({ version: CURRENT_SAVE_VERSION - 1 }));
    expect(deserializeSave(raw, {})).toMatchObject({ ok: false, code: 'version' });
  });
});

describe('save export/import (Base64)', () => {
  it('round-trips a state through the portable string', () => {
    const state = fakeState({ turn: 33, spiritStones: 888 });
    const b64 = exportSave(state, 1700000000000);
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);

    const imported = importSave<FakeState>(b64);
    expect(imported.ok).toBe(true);
    if (imported.ok) expect(imported.state).toEqual(state);
  });

  it('rejects corrupted import strings', () => {
    expect(importSave('!!!not-base64!!!')).toMatchObject({ ok: false, code: 'corrupt' });
    const b64 = exportSave(fakeState());
    const tampered = `${b64.slice(0, 10)}AAAA${b64.slice(14)}`;
    expect(importSave(tampered).ok).toBe(false);
  });
});

describe('audit + rng integration — replayable run', () => {
  it('a full audited run reproduces the same head hash from the same seed', () => {
    const playOnce = () => {
      let rng = createRng('integration-seed');
      let prev = GENESIS_HASH;
      const entries: AuditChainEntry[] = [];
      const commands = ['修炼', '修炼', '突破', '探索', '修炼'];
      commands.forEach((command, i) => {
        const turn = i + 1;
        const r1 = roll(rng, 'D100', `${command}·主掷`, turn);
        rng = r1.nextState;
        const r2 = roll(rng, 'D20', '遭遇事件', turn);
        rng = r2.nextState;
        const entry = buildChainEntry(prev, turn, command, [r1.value, r2.value]);
        entries.push(entry);
        prev = entry.hash;
      });
      return { entries, head: prev };
    };

    const runA = playOnce();
    const runB = playOnce();
    expect(runA.head).toBe(runB.head);
    expect(verifyChain(runA.entries).valid).toBe(true);
    expect(verifyChain(runA.entries).headHash).toBe(runA.head);
  });
});
