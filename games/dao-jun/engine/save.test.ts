import { describe, expect, it } from 'vitest';
import {
  CURRENT_SAVE_VERSION,
  SAVE_CORRUPT_MESSAGE,
  SAVE_KEY,
  clearSave,
  createMemoryStorage,
  deserializeSave,
  exportSave,
  getBrowserStorage,
  hasSave,
  importSave,
  loadGame,
  saveGame,
  serializeSave,
  type SaveEnvelope,
} from './save';
import { sha256Hex } from './audit';
import { chooseEvent, performAction } from './game';
import { newGame } from './testkit';
import type { GameState } from './types';

const played = (turns = 6, seed = 123): GameState => {
  let state = newGame({}, seed);
  for (let i = 0; i < turns; i += 1) {
    state = performAction(state, i % 2 === 0 ? '悟道' : '调息').state;
    if (state.pendingEvent) state = chooseEvent(state, 1).state;
  }
  return state;
};

const reopen = (raw: string): SaveEnvelope => JSON.parse(raw) as SaveEnvelope;

describe('save envelope', () => {
  it('uses the game-specific save key', () => {
    expect(SAVE_KEY).toBe('daojun_save_v1');
  });

  it('wraps the payload with magic, version, checksum and audit head', () => {
    const state = played();
    const envelope = reopen(serializeSave(state, 1000));
    expect(envelope.magic).toBe('DAOJUN');
    expect(envelope.version).toBe(CURRENT_SAVE_VERSION);
    expect(envelope.savedAt).toBe(1000);
    expect(envelope.auditHash).toBe(state.auditHash);
    expect(envelope.checksum).toHaveLength(64);
  });

  it('round-trips a played state byte for byte', () => {
    const state = played();
    const result = deserializeSave<GameState>(serializeSave(state, 1000));
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.stringify(result.state)).toBe(JSON.stringify(state));
  });

  it('reports an empty slot rather than a corrupt one', () => {
    expect(deserializeSave(null)).toMatchObject({ ok: false, code: 'empty' });
    expect(deserializeSave('   ')).toMatchObject({ ok: false, code: 'empty' });
  });

  it('rejects blobs that are not JSON', () => {
    expect(deserializeSave('{not json')).toMatchObject({ ok: false, code: 'corrupt' });
  });

  it('rejects a bare GameState with no envelope around it', () => {
    expect(deserializeSave(JSON.stringify(played()))).toMatchObject({ ok: false, code: 'corrupt' });
  });

  it('rejects a foreign magic marker', () => {
    const envelope = reopen(serializeSave(played(), 1000));
    expect(deserializeSave(JSON.stringify({ ...envelope, magic: 'MCLS' }))).toMatchObject({
      ok: false,
      code: 'corrupt',
    });
  });
});

describe('tamper rejection', () => {
  it('refuses a hand-edited spirit stone count', () => {
    const envelope = reopen(serializeSave(played(), 1000));
    (envelope.payload as GameState).territory.spiritStones = 9999;
    const result = deserializeSave(JSON.stringify(envelope));
    expect(result).toMatchObject({ ok: false, code: 'checksum' });
    if (!result.ok) expect(result.message).toBe(SAVE_CORRUPT_MESSAGE);
  });

  it('refuses a hand-edited realm', () => {
    const envelope = reopen(serializeSave(played(), 1000));
    (envelope.payload as GameState).character.realm = 6;
    expect(deserializeSave(JSON.stringify(envelope))).toMatchObject({ ok: false, code: 'checksum' });
  });

  it('refuses a rewritten checksum', () => {
    const envelope = reopen(serializeSave(played(), 1000));
    envelope.checksum = 'f'.repeat(64);
    expect(deserializeSave(JSON.stringify(envelope))).toMatchObject({ ok: false, code: 'checksum' });
  });

  it('refuses an envelope whose audit head no longer matches the payload', () => {
    const envelope = reopen(serializeSave(played(), 1000));
    const swapped = 'a'.repeat(64);
    // Re-checksum around the swapped head, so only the audit cross-check can
    // catch it — the shape a careful save editor would produce.
    const forged = {
      ...envelope,
      auditHash: swapped,
      checksum: sha256Hex(
        `DAOJUN|${envelope.version}|${envelope.savedAt}|${swapped}|${JSON.stringify(envelope.payload)}`,
      ),
    };
    expect(deserializeSave(JSON.stringify(forged))).toMatchObject({ ok: false, code: 'audit' });
  });

  it('refuses a payload whose hash chain was spliced', () => {
    const forged = structuredClone(played(8));
    forged.auditChain[1]!.rollValues = [1, 1, 1];
    expect(deserializeSave(serializeSave(forged, 1000))).toMatchObject({ ok: false, code: 'chain' });
  });

  it('refuses a save from a future schema version', () => {
    const future = { ...played(), version: CURRENT_SAVE_VERSION + 1 };
    const result = deserializeSave(serializeSave(future, 1000));
    expect(result).toMatchObject({ ok: false, code: 'version' });
    if (!result.ok) expect(result.message).toContain('未来');
  });

  it('accepts an untouched save from the same run', () => {
    expect(deserializeSave(serializeSave(played(10), 1000)).ok).toBe(true);
  });
});

describe('storage adapter', () => {
  it('reports an empty slot before anything is written', () => {
    const storage = createMemoryStorage();
    expect(hasSave(storage)).toBe(false);
    expect(loadGame(storage)).toMatchObject({ ok: false, code: 'empty' });
  });

  it('saves and loads through the adapter', () => {
    const storage = createMemoryStorage();
    const state = played();
    saveGame(storage, state);
    expect(hasSave(storage)).toBe(true);
    const result = loadGame<GameState>(storage);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.auditHash).toBe(state.auditHash);
  });

  it('writes under the daojun key by default', () => {
    const storage = createMemoryStorage();
    saveGame(storage, played());
    expect(storage.getItem('daojun_save_v1')).not.toBeNull();
    expect(storage.getItem('mcls_save_v1')).toBeNull();
  });

  it('clears the slot on 重开', () => {
    const storage = createMemoryStorage();
    saveGame(storage, played());
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });

  it('returns null browser storage when localStorage is absent', () => {
    expect(getBrowserStorage()).toBeNull();
  });
});

describe('portable base64 saves', () => {
  it('round-trips an exported save string', () => {
    const state = played();
    const result = importSave<GameState>(exportSave(state, 1000));
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.stringify(result.state)).toBe(JSON.stringify(state));
  });

  it('tolerates surrounding whitespace', () => {
    expect(importSave(`  ${exportSave(played(), 1000)}\n`).ok).toBe(true);
  });

  it('rejects a mangled base64 string', () => {
    expect(importSave('not base64 ***')).toMatchObject({ ok: false, code: 'corrupt' });
  });
});
