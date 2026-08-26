import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSave,
  decodeSave,
  encodeSave,
  persist,
  restore,
  SAVE_KEY,
  type StorageAdapter,
} from './save';
import { execute } from './turn';
import { SAVE_MAGIC, SAVE_VERSION } from './types';
import { forceRealm, newRun, setCalamity } from '@/test/helpers';

class MemoryStorage implements StorageAdapter {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
}

/** Play a few real turns so the save under test has a chain worth verifying. */
function playedRun(seed: string) {
  let s = forceRealm(newRun(seed), 'yinqi');
  for (const cmd of ['修炼', '修炼', '探索'] as const) {
    const r = execute(s, { kind: cmd });
    if (!r.rejected) s = r.state;
  }
  return s;
}

describe('save · 信封', () => {
  it('writes under the game-specific key', () => {
    expect(SAVE_KEY).toBe('mieyun_save_v1');
    const storage = new MemoryStorage();
    persist(storage, newRun('key'));
    expect(storage.keys()).toEqual([SAVE_KEY]);
  });

  it('stamps the blob with magic, version and checksum', () => {
    const envelope = JSON.parse(encodeSave(newRun('envelope')));
    expect(envelope.magic).toBe(SAVE_MAGIC);
    expect(envelope.version).toBe(SAVE_VERSION);
    expect(envelope.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(envelope.state).toBeDefined();
  });

  it('is deterministic — the same state encodes to the same bytes', () => {
    expect(encodeSave(playedRun('det'))).toBe(encodeSave(playedRun('det')));
  });
});

describe('save · 往返', () => {
  it('round-trips a played run intact', () => {
    const s = playedRun('round');
    const result = decodeSave(encodeSave(s));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.turn).toBe(s.turn);
    expect(result.state.character!.name).toBe(s.character!.name);
    expect(result.state.chain).toEqual(s.chain);
    expect(result.state.rolls.length).toBe(s.rolls.length);
  });

  it('restores a run that keeps playing identically to one that never stopped', () => {
    const storage = new MemoryStorage();
    const live = playedRun('resume');
    persist(storage, live);
    const loaded = restore(storage);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const a = execute(live, { kind: '修炼' });
    const b = execute(loaded.state, { kind: '修炼' });
    expect(a.state.auditHash).toBe(b.state.auditHash);
    expect(a.entries.map((e) => e.text)).toEqual(b.entries.map((e) => e.text));
  });

  it('preserves the sealed 道缘 without exposing it in narration', () => {
    const s = playedRun('sealed');
    const loaded = decodeSave(encodeSave(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.character!.daoYuan).toBe(s.character!.daoYuan);
    const spoken = String(s.character!.daoYuan);
    expect(s.log.some((l) => l.text.includes(`道缘${spoken}`))).toBe(false);
  });
});

describe('save · 拒伪', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('reports an empty slot rather than throwing', () => {
    const r = restore(storage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('无存档');
  });

  it('reports no storage at all when the adapter is null', () => {
    expect(persist(null, newRun('nostore'))).toBe(false);
    const r = restore(null);
    expect(r.ok).toBe(false);
  });

  it('rejects unparsable text', () => {
    storage.setItem(SAVE_KEY, 'not json at all');
    const r = restore(storage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('不可读');
  });

  it('rejects a blob from a different game', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ magic: 'other-game', version: 1, state: {} }));
    const r = restore(storage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('不属此图录');
  });

  it('rejects a stale save version', () => {
    const envelope = JSON.parse(encodeSave(newRun('oldver')));
    envelope.version = SAVE_VERSION + 1;
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    const r = restore(storage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('版本不合');
  });

  it('rejects hand-edited 玄晶', () => {
    const envelope = JSON.parse(encodeSave(playedRun('rich')));
    envelope.state.character.spiritStones = 999999;
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    const r = restore(storage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('因果紊乱');
  });

  it('rejects a lowered 劫运 even with the checksum left alone', () => {
    const envelope = JSON.parse(encodeSave(setCalamity(playedRun('cheap-grace'), 44)));
    envelope.state.character.calamity.value = 0;
    const r = decodeSave(JSON.stringify(envelope));
    expect(r.ok).toBe(false);
  });

  it('rejects a broken hash chain even when the checksum is recomputed', async () => {
    const { saveChecksum } = await import('./audit');
    const envelope = JSON.parse(encodeSave(playedRun('rechain')));
    envelope.state.chain[0].rollValues = [1, 1, 1];
    envelope.checksum = saveChecksum(envelope.state);
    const r = decodeSave(JSON.stringify(envelope));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('对不上');
  });

  it('rejects a truncated envelope with no state', () => {
    const r = decodeSave(JSON.stringify({ magic: SAVE_MAGIC, version: SAVE_VERSION }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('残缺');
  });

  it('clears the slot on request', () => {
    persist(storage, newRun('clear'));
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    clearSave(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('reports failure instead of throwing when storage refuses writes', () => {
    const full: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    expect(persist(full, newRun('quota'))).toBe(false);
  });
});
