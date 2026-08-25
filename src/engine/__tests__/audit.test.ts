import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  ANTI_CHEAT_LAYERS,
  GENESIS_HASH,
  SEALED_ROLL_DISPLAY,
  WISH_REJECTION,
  buildAuditTable,
  buildChainEntry,
  chainAuditHash,
  checkInvariants,
  formatAuditId,
  formatAuditRecord,
  isForbiddenWish,
  realmAtLeast,
  recordRoll,
  saveChecksum,
  sha256Hex,
  verifyChain,
  type AuditChainEntry,
} from '../audit';
import { initRngState } from '../rng';
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
import { SAVE_VERSION, type Character, type DiceRoll, type GameState } from '../types';

function nodeSha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    name: '韩立',
    gender: '男',
    originId: 'farmer',
    attributes: { genGu: 7, wuXing: 6, xinXing: 5, jiYuan: 4, qiYun: 8 },
    spiritRoot: {
      grade: '四灵根',
      elements: ['金', '木', '水', '火'],
      speedMultiplier: 0.7,
      rollValue: 55,
    },
    realm: { realm: 'qi', qiLayer: 3, stage: '初期', exp: 30, expNeeded: 100 },
    age: 18,
    lifespan: 120,
    hp: 80,
    maxHp: 100,
    injuries: [],
    statusEffects: [],
    techniqueId: null,
    combatArts: [],
    spiritStones: 50,
    inventory: [{ itemId: 'huiqisan', count: 2 }],
    equipped: {},
    sectId: null,
    breakthroughBonus: 0,
    flags: {},
    ...overrides,
  };
}

function makeState(seed = 'audit-test-seed', overrides: Partial<GameState> = {}): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rngState: initRngState(seed),
    phase: 'playing',
    creationStep: 4,
    turn: 1,
    character: null,
    npcs: {},
    quests: [],
    combat: null,
    narrativeLog: [],
    rolls: [],
    auditHash: GENESIS_HASH,
    rollSeq: 0,
    killCount: 0,
    stats: {
      totalRolls: 0,
      stonesEarned: 0,
      enemiesSlain: 0,
      breakthroughsFailed: 0,
      pillsConsumed: 0,
      peakRealmLabel: '凡人',
    },
    ending: null,
    ...overrides,
  };
}

function makeRoll(id: number, overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id,
    turn: 1,
    die: 'D100',
    value: 42,
    reason: '遭遇事件',
    seedState: 'deadbeef',
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
      'a'.repeat(55), // length byte still fits in the last block
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

describe('recordRoll — number-returning audited gateway (layer 1)', () => {
  it('returns a plain in-range number and appends the record', () => {
    const state = makeState();
    const before = state.rngState;
    const value = recordRoll(state, 'D100', '突破·筑基');

    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(100);
    expect(state.rngState).not.toBe(before);
    expect(state.rolls).toHaveLength(1);
    expect(state.rolls[0]).toMatchObject({
      id: 1,
      turn: 1,
      die: 'D100',
      value,
      reason: '突破·筑基',
      seedState: before, // pre-roll snapshot — replayable
    });
    expect(state.rollSeq).toBe(1);
    expect(state.stats!.totalRolls).toBe(1);
  });

  it('is deterministic: same seed ⇒ same roll sequence (layer 4)', () => {
    const s1 = makeState('同种');
    const s2 = makeState('同种');
    const a = Array.from({ length: 50 }, () => recordRoll(s1, 'D20', 'x'));
    const b = Array.from({ length: 50 }, () => recordRoll(s2, 'D20', 'x'));
    expect(a).toEqual(b);
    expect(s1.rngState).toBe(s2.rngState);
  });

  it('marks sealed rolls (explicitly or via the 暗掷 marker)', () => {
    const state = makeState();
    recordRoll(state, 'D100', '天命', true);
    recordRoll(state, 'D100', '暗掷·机缘');
    recordRoll(state, 'D100', '灵根抽取');
    expect(state.rolls[0]!.sealed).toBe(true);
    expect(state.rolls[1]!.sealed).toBe(true);
    expect(state.rolls[2]!.sealed).toBeUndefined();
  });
});

describe('hash chain (anti-cheat layer 5)', () => {
  it('is deterministic and sensitive to every input', () => {
    const h = chainAuditHash(GENESIS_HASH, 1, '修炼', [55, 12]);
    expect(h).toBe(chainAuditHash(GENESIS_HASH, 1, '修炼', [55, 12]));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(chainAuditHash(GENESIS_HASH, 2, '修炼', [55, 12])).not.toBe(h);
    expect(chainAuditHash(GENESIS_HASH, 1, '探索', [55, 12])).not.toBe(h);
    expect(chainAuditHash(GENESIS_HASH, 1, '修炼', [55, 13])).not.toBe(h);
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
    expect(result.headHash).toBe(entries[entries.length - 1]!.hash);
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
    entries[2] = { ...entries[2]!, rollValues: [100] };

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

describe('审计 records — TZ-XXXX numbering (layer 9)', () => {
  it('formats numbered audit ids, zero-padded to 4', () => {
    expect(formatAuditId(1)).toBe('TZ-0001');
    expect(formatAuditId(42)).toBe('TZ-0042');
    expect(formatAuditId(9999)).toBe('TZ-9999');
    expect(formatAuditId(10000)).toBe('TZ-10000');
  });

  it('builds a full audit table from real recorded rolls', () => {
    const state = makeState('audit-table');
    recordRoll(state, 'D100', '灵根抽取');
    recordRoll(state, 'D100', '突破·筑基');
    recordRoll(state, 'D20', '遭遇事件');

    const table = buildAuditTable(state.rolls);
    expect(table.map((r) => r.recordId)).toEqual(['TZ-0001', 'TZ-0002', 'TZ-0003']);
    expect(table[1]!.reason).toBe('突破·筑基');
    expect(table[1]!.display).toBe(String(state.rolls[1]!.value));
    expect(table[2]!.die).toBe('D20');
    expect(table.every((r) => !r.sealed)).toBe(true);
  });
});

describe('hidden roll seal (layer 3)', () => {
  it('redacts the sealed 机缘 roll value, but still lists the roll', () => {
    const state = makeState('sealed');
    recordRoll(state, 'D100', '暗掷·机缘');

    const record = formatAuditRecord(state.rolls[0]!);
    expect(record.sealed).toBe(true);
    expect(record.recordId).toBe('TZ-0001');
    expect(record.display).toBe(SEALED_ROLL_DISPLAY);
    expect(record.display).not.toContain(String(state.rolls[0]!.value));
    expect(record.reason).toContain('天道已掷,命数已定');
  });

  it('leaves ordinary rolls fully visible', () => {
    const record = formatAuditRecord(makeRoll(5, { reason: '突破·金丹', value: 13 }));
    expect(record.sealed).toBe(false);
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
  it('passes a healthy state (and a character-less creation state) with null', () => {
    expect(checkInvariants(makeState('ok', { character: makeCharacter() }))).toBeNull();
    expect(checkInvariants(makeState('creation', { phase: 'creation', turn: 0 }))).toBeNull();
  });

  it('flags negative spirit stones', () => {
    const state = makeState('x', { character: makeCharacter({ spiritStones: -1 }) });
    expect(checkInvariants(state)).toContain('灵石为负');
  });

  it('flags hp over max and exp overflow', () => {
    const c = makeCharacter({ hp: 150 });
    c.realm.exp = 999;
    const violations = checkInvariants(makeState('x', { character: c }));
    expect(violations).toContain('气血逾上限');
    expect(violations).toContain('修为溢出');
  });

  it('flags an impossible 炼气 layer, bad attributes and bad stacks', () => {
    const c = makeCharacter({
      attributes: { genGu: Number.NaN, wuXing: 6, xinXing: 5, jiYuan: 4, qiYun: 8 },
      inventory: [{ itemId: 'x', count: 0 }],
    });
    c.realm.qiLayer = 14;
    const violations = checkInvariants(makeState('x', { character: c }));
    expect(violations).toContain('炼气层数异常');
    expect(violations).toContain('属性越界');
    expect(violations).toContain('物品堆叠异常');
  });

  it('flags non-monotonic roll ids', () => {
    const state = makeState('x', { rolls: [makeRoll(3), makeRoll(3)] });
    expect(checkInvariants(state)).toContain('掷序紊乱');
  });

  it('orders realms for progression checks', () => {
    expect(realmAtLeast('foundation', 'qi')).toBe(true);
    expect(realmAtLeast('qi', 'qi')).toBe(true);
    expect(realmAtLeast('mortal', 'core')).toBe(false);
    expect(realmAtLeast('unknown', 'mortal')).toBe(false);
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

function fakeSaveState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    version: CURRENT_SAVE_VERSION,
    auditHash: chainAuditHash(GENESIS_HASH, 1, '修炼', [61]),
    seed: 'save-test-seed',
    turn: 1,
    spiritStones: 5,
    ...overrides,
  };
}

describe('save integrity (layer 6) — round-trip', () => {
  it('saveChecksum is deterministic and state-sensitive', () => {
    const state = makeState('checksum');
    const a = saveChecksum(state);
    expect(a).toBe(saveChecksum(state));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    const richer = makeState('checksum', { character: makeCharacter() });
    expect(saveChecksum(richer)).not.toBe(a);
  });

  it('saves and loads through an injected storage adapter', () => {
    const storage = createMemoryStorage();
    const state = fakeSaveState();

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

  it('round-trips a real GameState with recorded rolls', () => {
    const storage = createMemoryStorage();
    const state = makeState('full-state', { character: makeCharacter() });
    const v1 = recordRoll(state, 'D100', '灵根抽取');
    const v2 = recordRoll(state, 'D100', '暗掷·机缘');
    state.auditHash = chainAuditHash(GENESIS_HASH, 1, '开始游戏', [v1, v2]);

    saveGame(storage, state);
    const loaded = loadGame<GameState>(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state).toEqual(state);
      expect(loaded.state.rolls[1]!.sealed).toBe(true);
    }
  });

  it('rejects a payload tampered after save (checksum mismatch)', () => {
    const storage = createMemoryStorage();
    saveGame(storage, fakeSaveState({ spiritStones: 5 }));

    const blob = JSON.parse(storage.getItem(SAVE_KEY)!);
    blob.payload.spiritStones = 999999; // the cheater edits localStorage
    storage.setItem(SAVE_KEY, JSON.stringify(blob));

    const loaded = loadGame<FakeState>(storage);
    expect(loaded).toMatchObject({ ok: false, code: 'checksum', message: SAVE_CORRUPT_MESSAGE });
  });

  it('rejects an auditHash desync between envelope and payload', () => {
    const raw = serializeSave(fakeSaveState(), 1234567890);
    const blob = JSON.parse(raw);
    blob.payload.auditHash = 'f'.repeat(64);
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
    const raw = serializeSave(fakeSaveState({ version: CURRENT_SAVE_VERSION + 1 }));
    expect(deserializeSave(raw)).toMatchObject({ ok: false, code: 'version' });
  });
});

describe('save schema migration', () => {
  it('migrates an old save up to the current version', () => {
    const oldState = fakeSaveState({ version: CURRENT_SAVE_VERSION - 1 });
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
    const raw = serializeSave(fakeSaveState({ version: CURRENT_SAVE_VERSION - 1 }));
    expect(deserializeSave(raw, {})).toMatchObject({ ok: false, code: 'version' });
  });
});

describe('save export/import (Base64)', () => {
  it('round-trips a state through the portable string', () => {
    const state = fakeSaveState({ turn: 33, spiritStones: 888 });
    const b64 = exportSave(state, 1700000000000);
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);

    const imported = importSave<FakeState>(b64);
    expect(imported.ok).toBe(true);
    if (imported.ok) expect(imported.state).toEqual(state);
  });

  it('rejects corrupted import strings', () => {
    expect(importSave('!!!not-base64!!!')).toMatchObject({ ok: false, code: 'corrupt' });
    const b64 = exportSave(fakeSaveState());
    const tampered = `${b64.slice(0, 10)}AAAA${b64.slice(14)}`;
    expect(importSave(tampered).ok).toBe(false);
  });
});

describe('audit + rng integration — replayable run', () => {
  it('a full audited run reproduces the same head hash from the same seed', () => {
    const playOnce = () => {
      const state = makeState('integration-seed');
      const entries: AuditChainEntry[] = [];
      let prev = GENESIS_HASH;
      const commands = ['修炼', '修炼', '突破', '探索', '修炼'];
      commands.forEach((command, i) => {
        state.turn = i + 1;
        const v1 = recordRoll(state, 'D100', `${command}·主掷`);
        const v2 = recordRoll(state, 'D20', '遭遇事件');
        const entry = buildChainEntry(prev, state.turn, command, [v1, v2]);
        entries.push(entry);
        prev = entry.hash;
      });
      state.auditHash = prev;
      return { entries, head: prev, state };
    };

    const runA = playOnce();
    const runB = playOnce();
    expect(runA.head).toBe(runB.head);
    expect(runA.state.rolls.map((r) => r.value)).toEqual(runB.state.rolls.map((r) => r.value));
    expect(verifyChain(runA.entries).valid).toBe(true);
    expect(verifyChain(runA.entries).headHash).toBe(runA.state.auditHash);
    expect(checkInvariants(runA.state)).toBeNull();
  });
});
