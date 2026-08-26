/**
 * save.ts — versioned save/load with a checksummed envelope.
 *
 * The engine never touches `localStorage`: persistence goes through an
 * injected `StorageAdapter`. A save blob is a `SaveEnvelope` wrapping the
 * GameState payload with a magic marker, the schema version, a SHA-256
 * checksum and a copy of the payload's `auditHash`. Any mismatch on load ⇒
 * 「道基紊乱，此卷不可续。」— the UI may then only offer 重开.
 *
 * Mirrors the root game's `src/engine/save.ts` (same envelope shape, same
 * failure codes) with 道君's own save key and magic.
 */

import { sha256Hex, verifyChain } from './audit';
import type { AuditChainEntry } from './types';

export const SAVE_KEY = 'daojun_save_v1';
export const CURRENT_SAVE_VERSION = 1;
export const SAVE_CORRUPT_MESSAGE = '道基紊乱，此卷不可续。';

const SAVE_MAGIC = 'DAOJUN';

/** Minimal structural requirement on the persisted state — `GameState` fits. */
export interface SaveableState {
  version: number;
  auditHash: string;
  chainStart?: string;
  auditChain?: AuditChainEntry[];
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageLike = StorageAdapter;

export interface SaveEnvelope {
  magic: typeof SAVE_MAGIC;
  version: number;
  savedAt: number;
  /** Copy of payload.auditHash — cross-checked on load. */
  auditHash: string;
  /** sha256 over magic|version|savedAt|auditHash|payloadJson. */
  checksum: string;
  payload: unknown;
}

export type SaveErrorCode = 'empty' | 'corrupt' | 'checksum' | 'audit' | 'chain' | 'version';

export type LoadResult<T extends SaveableState> =
  | { ok: true; state: T; migrated: boolean }
  | { ok: false; code: SaveErrorCode; message: string };

/**
 * Sequential schema migrations: MIGRATIONS[n] upgrades a version-n payload to
 * version n+1. Empty while the schema sits at v1.
 */
export type Migration = (payload: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Record<number, Migration> = {};

function computeChecksum(
  version: number,
  savedAt: number,
  auditHash: string,
  payloadJson: string,
): string {
  return sha256Hex(`${SAVE_MAGIC}|${version}|${savedAt}|${auditHash}|${payloadJson}`);
}

/** Serialize a state into the versioned, checksummed save blob. */
export function serializeSave<T extends SaveableState>(state: T, now: number = Date.now()): string {
  const payloadJson = JSON.stringify(state);
  const envelope: SaveEnvelope = {
    magic: SAVE_MAGIC,
    version: state.version,
    savedAt: now,
    auditHash: state.auditHash,
    checksum: computeChecksum(state.version, now, state.auditHash, payloadJson),
    payload: JSON.parse(payloadJson) as unknown,
  };
  return JSON.stringify(envelope);
}

function isEnvelopeShape(value: unknown): value is SaveEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.magic === SAVE_MAGIC &&
    typeof v.version === 'number' && Number.isInteger(v.version) &&
    typeof v.savedAt === 'number' &&
    typeof v.auditHash === 'string' &&
    typeof v.checksum === 'string' &&
    typeof v.payload === 'object' && v.payload !== null
  );
}

/**
 * Parse, verify and migrate a save blob. Never throws: corruption and
 * tampering come back as `{ ok: false }` for the UI to narrate.
 */
export function deserializeSave<T extends SaveableState>(
  raw: string | null,
  migrations: Record<number, Migration> = MIGRATIONS,
): LoadResult<T> {
  if (raw === null || raw.trim() === '') {
    return { ok: false, code: 'empty', message: '此界尚无因果。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'corrupt', message: SAVE_CORRUPT_MESSAGE };
  }
  if (!isEnvelopeShape(parsed)) {
    return { ok: false, code: 'corrupt', message: SAVE_CORRUPT_MESSAGE };
  }

  const payloadJson = JSON.stringify(parsed.payload);
  if (computeChecksum(parsed.version, parsed.savedAt, parsed.auditHash, payloadJson) !== parsed.checksum) {
    return { ok: false, code: 'checksum', message: SAVE_CORRUPT_MESSAGE };
  }

  let payload = parsed.payload as Record<string, unknown>;
  if (payload.auditHash !== parsed.auditHash) {
    return { ok: false, code: 'audit', message: SAVE_CORRUPT_MESSAGE };
  }

  if (parsed.version > CURRENT_SAVE_VERSION) {
    return {
      ok: false,
      code: 'version',
      message: `此卷来自未来之界（v${parsed.version} > v${CURRENT_SAVE_VERSION}）。`,
    };
  }

  let migrated = false;
  let version = parsed.version;
  while (version < CURRENT_SAVE_VERSION) {
    const step = migrations[version];
    if (!step) {
      return {
        ok: false,
        code: 'version',
        message: `无法自 v${version} 迁移至 v${CURRENT_SAVE_VERSION}。`,
      };
    }
    payload = step(payload);
    version += 1;
    migrated = true;
  }
  if (migrated) payload = { ...payload, version: CURRENT_SAVE_VERSION };

  const chain = payload.auditChain;
  if (Array.isArray(chain)) {
    const start = typeof payload.chainStart === 'string' ? payload.chainStart : '';
    const result = verifyChain(chain as AuditChainEntry[], start);
    if (!result.valid || result.headHash !== payload.auditHash) {
      return { ok: false, code: 'chain', message: SAVE_CORRUPT_MESSAGE };
    }
  }

  return { ok: true, state: payload as unknown as T, migrated };
}

// ============================================================================
// Storage-facing API
// ============================================================================

export function saveGame<T extends SaveableState>(
  storage: StorageAdapter,
  state: T,
  key: string = SAVE_KEY,
): void {
  storage.setItem(key, serializeSave(state));
}

export function loadGame<T extends SaveableState>(
  storage: StorageAdapter,
  key: string = SAVE_KEY,
): LoadResult<T> {
  return deserializeSave<T>(storage.getItem(key));
}

export function hasSave(storage: StorageAdapter, key: string = SAVE_KEY): boolean {
  return storage.getItem(key) !== null;
}

/** 重开: wipe the save (the caller owns the confirm dialog and the new seed). */
export function clearSave(storage: StorageAdapter, key: string = SAVE_KEY): void {
  storage.removeItem(key);
}

/** In-memory adapter for tests and SSR. */
export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

/**
 * The real browser adapter, or null when unavailable (SSR, private-mode quota
 * errors). The only place the engine references a browser API.
 */
export function getBrowserStorage(): StorageAdapter | null {
  try {
    const global = globalThis as { localStorage?: StorageAdapter };
    if (!global.localStorage) return null;
    const probe = '__daojun_probe__';
    global.localStorage.setItem(probe, '1');
    global.localStorage.removeItem(probe);
    return global.localStorage;
  } catch {
    return null;
  }
}

// ============================================================================
// Export / import as Base64 (portable save string)
// ============================================================================

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += B64_ALPHABET[b0 >> 2]!;
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)]!;
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)]! : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 0x3f]! : '=';
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) throw new Error('invalid base64');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | B64_ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Export the state as a portable Base64 save string. */
export function exportSave<T extends SaveableState>(state: T, now: number = Date.now()): string {
  return bytesToBase64(new TextEncoder().encode(serializeSave(state, now)));
}

/** Import a Base64 save string, with full envelope verification. */
export function importSave<T extends SaveableState>(b64: string): LoadResult<T> {
  try {
    return deserializeSave<T>(new TextDecoder().decode(base64ToBytes(b64.trim())));
  } catch {
    return { ok: false, code: 'corrupt', message: SAVE_CORRUPT_MESSAGE };
  }
}
