import { describe, expect, it } from 'vitest';
import {
  clearSave,
  createMemoryStorage,
  CURRENT_SAVE_VERSION,
  deserializeSave,
  exportSave,
  getBrowserStorage,
  hasSave,
  importSave,
  loadGame,
  SAVE_CORRUPT_MESSAGE,
  SAVE_KEY,
  saveGame,
  serializeSave,
  type Migration,
} from '../save';
import { executeCommand } from '../turn';
import { playableState, withCharacter } from './helpers';
import type { GameState } from '../types';

const played = (): GameState => {
  const s = withCharacter(playableState('存档-1'), { coin: 400, spirit: 90 });
  const out = executeCommand(s, '修炼');
  return out.state;
};

describe('存档 — key and envelope', () => {
  it('uses the game-specific save key so four simulators can share an origin', () => {
    expect(SAVE_KEY).toBe('lanke_save_v1');
  });

  it('wraps the state in a magic-tagged, versioned, checksummed envelope', () => {
    const envelope = JSON.parse(serializeSave(played(), 1_700_000_000_000));
    expect(envelope.magic).toBe('LKQY');
    expect(envelope.version).toBe(CURRENT_SAVE_VERSION);
    expect(envelope.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.savedAt).toBe(1_700_000_000_000);
    expect(envelope.payload).toBeTypeOf('object');
  });

  it('copies the audit hash onto the envelope for a cross-check', () => {
    const s = played();
    const envelope = JSON.parse(serializeSave(s));
    expect(envelope.auditHash).toBe(s.auditHash);
  });

  it('is byte-stable for the same state and timestamp', () => {
    const s = played();
    expect(serializeSave(s, 42)).toBe(serializeSave(s, 42));
  });
});

describe('存档 — round trip', () => {
  it('restores a played state exactly', () => {
    const s = played();
    const result = deserializeSave<GameState>(serializeSave(s));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.turn).toBe(s.turn);
    expect(result.state.auditHash).toBe(s.auditHash);
    expect(result.state.character?.name).toBe(s.character?.name);
    expect(result.state.rolls).toHaveLength(s.rolls.length);
    expect(result.migrated).toBe(false);
  });

  it('keeps the RNG on the same track after a reload', () => {
    const s = played();
    const reloaded = deserializeSave<GameState>(serializeSave(s));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    const a = executeCommand(s, '观棋').state;
    const b = executeCommand(reloaded.state, '观棋').state;
    expect(b.rolls.map((r) => r.value)).toEqual(a.rolls.map((r) => r.value));
    expect(b.auditHash).toBe(a.auditHash);
  });

  it('survives the Base64 export/import path', () => {
    const s = played();
    const text = exportSave(s, 99);
    expect(text).toMatch(/^[A-Za-z0-9+/]+=*$/);
    const back = importSave<GameState>(text);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.state.auditHash).toBe(s.auditHash);
  });

  it('tolerates whitespace around a pasted save string', () => {
    const s = played();
    expect(importSave<GameState>(`\n  ${exportSave(s)}  \n`).ok).toBe(true);
  });
});

describe('存档 — refusing a doctored scroll', () => {
  it('reports an empty slot as empty rather than corrupt', () => {
    const result = deserializeSave<GameState>(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('empty');
  });

  it('rejects unparsable text', () => {
    const result = deserializeSave<GameState>('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('corrupt');
      expect(result.message).toBe(SAVE_CORRUPT_MESSAGE);
    }
  });

  it('rejects a blob that is not one of ours', () => {
    const result = deserializeSave<GameState>(JSON.stringify({ hello: 'world' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('corrupt');
  });

  it('catches a payload edited behind the checksum', () => {
    const envelope = JSON.parse(serializeSave(played()));
    envelope.payload.character.coin = 999_999;
    const result = deserializeSave<GameState>(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('checksum');
  });

  it('catches an audit hash swapped on the envelope alone', () => {
    const envelope = JSON.parse(serializeSave(played()));
    envelope.payload.auditHash = 'f'.repeat(64);
    const result = deserializeSave<GameState>(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(['checksum', 'audit']).toContain(result.code);
  });

  it('refuses a save from a future schema instead of guessing', () => {
    const s = played();
    const future = serializeSave({ ...s, version: CURRENT_SAVE_VERSION + 5 });
    const result = deserializeSave<GameState>(future);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('version');
  });

  it('rejects a Base64 string that decodes to nothing meaningful', () => {
    const result = importSave<GameState>('!!!! not base64 !!!!');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('corrupt');
  });
});

describe('存档 — migrations', () => {
  it('runs a registered migration and flags the load as migrated', () => {
    const s = played();
    const old = serializeSave({ ...s, version: CURRENT_SAVE_VERSION - 1 });
    const migrations: Record<number, Migration> = {
      [CURRENT_SAVE_VERSION - 1]: (p) => ({ ...p, 迁移过: true }),
    };
    const result = deserializeSave<GameState>(old, migrations);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.state.version).toBe(CURRENT_SAVE_VERSION);
  });

  it('refuses an old save with no path forward rather than loading it broken', () => {
    const s = played();
    const old = serializeSave({ ...s, version: CURRENT_SAVE_VERSION - 1 });
    const result = deserializeSave<GameState>(old, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('version');
  });
});

describe('存档 — the storage adapter', () => {
  it('writes, reads and clears through an injected adapter', () => {
    const storage = createMemoryStorage();
    const s = played();
    expect(hasSave(storage)).toBe(false);
    saveGame(storage, s);
    expect(hasSave(storage)).toBe(true);
    const loaded = loadGame<GameState>(storage);
    expect(loaded.ok).toBe(true);
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });

  it('honours a caller-supplied key', () => {
    const storage = createMemoryStorage();
    saveGame(storage, played(), '别局');
    expect(hasSave(storage, '别局')).toBe(true);
    expect(hasSave(storage, SAVE_KEY)).toBe(false);
  });

  it('returns null browser storage under Node rather than throwing', () => {
    expect(getBrowserStorage()).toBeNull();
  });
});
