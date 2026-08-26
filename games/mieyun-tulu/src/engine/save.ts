/**
 * save.ts — 存档 (checksum envelope + tamper rejection)
 *
 * The blob written to `localStorage` is a `SaveEnvelope`: magic, version,
 * timestamp, the state, and a SHA-256 of the state under a salted prefix.
 * Loading recomputes the checksum and *refuses* a mismatch — editing 灵石 by
 * hand in devtools produces 「因果紊乱」 rather than a rich character.
 *
 * The key is `mieyun_save_v1`. `localStorage` is scoped per origin, not per
 * path, so a sibling game served from the same host would collide on a generic
 * key; every game in this repo owns a distinct prefix.
 *
 * The storage adapter is injected. The engine never touches `window`.
 */

import { saveChecksum, verifyChain } from './audit';
import type { GameState, SaveEnvelope } from './types';
import { SAVE_KEY, SAVE_MAGIC, SAVE_VERSION } from './types';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStorage(): StorageAdapter | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export function encodeSave(state: GameState): string {
  const envelope: SaveEnvelope = {
    magic: SAVE_MAGIC,
    version: SAVE_VERSION,
    checksum: saveChecksum(state),
    savedAt: 0,
    state,
  };
  return JSON.stringify(envelope);
}

export type LoadResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

export function decodeSave(raw: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: '存档不可读。' };
  }
  const envelope = parsed as Partial<SaveEnvelope>;
  if (!envelope || envelope.magic !== SAVE_MAGIC) {
    return { ok: false, reason: '此卷不属此图录。' };
  }
  if (envelope.version !== SAVE_VERSION) {
    return { ok: false, reason: `存档版本不合(${envelope.version} ≠ ${SAVE_VERSION})。` };
  }
  if (!envelope.state) return { ok: false, reason: '存档残缺。' };

  const recomputed = saveChecksum(envelope.state);
  if (recomputed !== envelope.checksum) {
    return { ok: false, reason: '因果紊乱:此卷被人改过。' };
  }
  const chain = verifyChain(envelope.state.chain);
  if (!chain.valid) {
    return { ok: false, reason: `因果紊乱:第 ${(chain.brokenAt ?? 0) + 1} 环对不上。` };
  }
  return { ok: true, state: envelope.state };
}

export function persist(storage: StorageAdapter | null, state: GameState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, encodeSave(state));
    return true;
  } catch {
    return false;
  }
}

export function restore(storage: StorageAdapter | null): LoadResult {
  if (!storage) return { ok: false, reason: '此处无存档之所。' };
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { ok: false, reason: '无存档。' };
  return decodeSave(raw);
}

export function clearSave(storage: StorageAdapter | null): void {
  storage?.removeItem(SAVE_KEY);
}

export { SAVE_KEY };
