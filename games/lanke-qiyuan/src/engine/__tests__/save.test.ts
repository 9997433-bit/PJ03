import { describe, expect, it } from 'vitest';
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
} from '@/engine/save';
import type { GameState } from '@/engine/types';
import { playingState } from './helpers';

describe('save — serialize and verify', () => {
  it('round-trips a real game state', () => {
    const original = playingState();
    const result = deserializeSave<GameState>(serializeSave(original));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.seed).toBe(original.seed);
    expect(result.state.character?.name).toBe('计缘');
    expect(result.state.auditHash).toBe(original.auditHash);
    expect(result.migrated).toBe(false);
  });

  it('writes an envelope carrying magic, version and checksum', () => {
    const blob = JSON.parse(serializeSave(playingState(), 1000)) as Record<string, unknown>;
    expect(blob.magic).toBe('LKQY');
    expect(blob.version).toBe(CURRENT_SAVE_VERSION);
    expect(blob.savedAt).toBe(1000);
    expect(typeof blob.checksum).toBe('string');
  });

  it('reports an empty slot distinctly from corruption', () => {
    const result = deserializeSave<GameState>(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('empty');
  });

  it('rejects unparseable text', () => {
    const result = deserializeSave<GameState>('{not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('corrupt');
    expect(result.message).toBe(SAVE_CORRUPT_MESSAGE);
  });

  it('rejects a blob from another game', () => {
    const foreign = JSON.stringify({
      magic: 'MCLS',
      version: 1,
      savedAt: 1,
      auditHash: 'x',
      checksum: 'y',
      payload: {},
    });
    const result = deserializeSave<GameState>(foreign);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('corrupt');
  });

  it('detects a tampered payload via the checksum', () => {
    const blob = JSON.parse(serializeSave(playingState())) as {
      payload: { character: { coin: number } };
    };
    blob.payload.character.coin = 999999;
    const result = deserializeSave<GameState>(JSON.stringify(blob));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('checksum');
  });

  it('detects an auditHash swapped inside a re-checksummed blob', () => {
    const state = playingState();
    const blob = JSON.parse(serializeSave(state)) as Record<string, unknown>;
    const payload = blob.payload as Record<string, unknown>;
    payload.auditHash = 'tampered';
    // recompute so only the cross-check can catch it
    const rebuilt = serializeSave({ ...state, auditHash: blob.auditHash as string }, blob.savedAt as number);
    const reparsed = JSON.parse(rebuilt) as Record<string, unknown>;
    reparsed.auditHash = 'different';
    const result = deserializeSave<GameState>(JSON.stringify(reparsed));
    expect(result.ok).toBe(false);
  });

  it('refuses a save from a future schema', () => {
    const state = playingState();
    const future = { ...state, version: CURRENT_SAVE_VERSION + 5 };
    const result = deserializeSave<GameState>(serializeSave(future));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('version');
  });

  it('runs registered migrations in sequence', () => {
    const state = { version: 0, auditHash: 'h', mark: 'old' };
    const blob = serializeSave(state);
    const result = deserializeSave<GameState & { mark: string }>(blob, {
      0: (payload) => ({ ...payload, mark: 'migrated' }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.state.mark).toBe('migrated');
    expect(result.state.version).toBe(CURRENT_SAVE_VERSION);
  });

  it('refuses when no migration path exists', () => {
    const result = deserializeSave<GameState>(serializeSave({ version: 0, auditHash: 'h' }), {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('version');
  });
});

describe('save — storage adapter', () => {
  it('saves, detects, loads and clears', () => {
    const storage = createMemoryStorage();
    const state = playingState();
    expect(hasSave(storage)).toBe(false);
    saveGame(storage, state);
    expect(hasSave(storage)).toBe(true);
    const loaded = loadGame<GameState>(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.state.seed).toBe(state.seed);
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('keeps separate slots apart', () => {
    const storage = createMemoryStorage();
    saveGame(storage, playingState('棋-a'), 'slot_a');
    saveGame(storage, playingState('棋-b'), 'slot_b');
    const a = loadGame<GameState>(storage, 'slot_a');
    const b = loadGame<GameState>(storage, 'slot_b');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.state.seed).not.toBe(b.state.seed);
  });
});

describe('save — portable base64', () => {
  it('round-trips through export and import', () => {
    const state = playingState();
    const result = importSave<GameState>(exportSave(state));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.seed).toBe(state.seed);
  });

  it('tolerates surrounding whitespace', () => {
    const encoded = exportSave(playingState());
    expect(importSave<GameState>(`\n  ${encoded}  \n`).ok).toBe(true);
  });

  it('rejects a mangled base64 string', () => {
    const result = importSave<GameState>('!!!not base64!!!');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('corrupt');
  });
});
