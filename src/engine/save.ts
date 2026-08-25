/**
 * save.ts — versioned save/load with checksum & migration (PLAN §3.11,
 * anti-cheat layer 6).
 *
 * The engine never touches `localStorage` directly: persistence goes through
 * an injected `StorageAdapter` (the sanctioned exception in the architecture
 * rule). `getBrowserStorage()` supplies the real adapter in the browser;
 * `createMemoryStorage()` serves tests and SSR.
 *
 * Save blob = a `SaveEnvelope` wrapping the GameState payload with schema
 * version, a SHA-256 checksum, and a copy of the payload's auditHash. Any
 * mismatch on load ⇒ 天道: “此界因果紊乱,不可续。” — offer 重开 only.
 */

import { sha256Hex } from './audit';

export const SAVE_KEY = 'mcls_save_v1';
export const CURRENT_SAVE_VERSION = 1;
export const SAVE_CORRUPT_MESSAGE = '此界因果紊乱,不可续。';

const SAVE_MAGIC = 'MCLS';

/**
 * Minimal structural requirement on the persisted state — GameState
 * (PLAN §2) satisfies this. Swap to `import type { GameState } from './types'`
 * once types.ts lands.
 */
export interface SaveableState {
  version: number;
  auditHash: string;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveEnvelope {
  magic: typeof SAVE_MAGIC;
  version: number;
  savedAt: number;
  /** Copy of payload.auditHash — cross-checked on load (layer 6). */
  auditHash: string;
  /** sha256 over magic|version|savedAt|auditHash|payloadJson. */
  checksum: string;
  payload: unknown;
}

export type SaveErrorCode = 'empty' | 'corrupt' | 'checksum' | 'audit' | 'version';

export type LoadResult<T extends SaveableState> =
  | { ok: true; state: T; migrated: boolean }
  | { ok: false; code: SaveErrorCode; message: string };

/**
 * Sequential schema migrations: MIGRATIONS[n] upgrades a version-n payload
 * to version n+1. Empty while the schema is at v1; register hooks here as
 * the schema evolves.
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
    payload: JSON.parse(payloadJson),
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
 * Parse + verify + migrate a save blob. Never throws: corruption and
 * tampering come back as `{ ok: false }` results for the UI to narrate.
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
  const expected = computeChecksum(parsed.version, parsed.savedAt, parsed.auditHash, payloadJson);
  if (expected !== parsed.checksum) {
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
      message: `此存档来自未来之界 (v${parsed.version} > v${CURRENT_SAVE_VERSION})。`,
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
  if (migrated) {
    payload = { ...payload, version: CURRENT_SAVE_VERSION };
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

/** 重开: wipe the save (caller owns the confirm dialog and new seed). */
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
 * The real browser adapter, or null when unavailable (SSR, private-mode
 * quota errors). The only place the engine references a browser API.
 */
export function getBrowserStorage(): StorageAdapter | null {
  try {
    const g = globalThis as { localStorage?: StorageAdapter };
    if (!g.localStorage) return null;
    const probe = '__mcls_probe__';
    g.localStorage.setItem(probe, '1');
    g.localStorage.removeItem(probe);
    return g.localStorage;
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
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 0x3f] : '=';
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) {
    throw new Error('invalid base64');
  }
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

/** Import a Base64 save string, with full checksum/version verification. */
export function importSave<T extends SaveableState>(b64: string): LoadResult<T> {
  try {
    return deserializeSave<T>(new TextDecoder().decode(base64ToBytes(b64.trim())));
  } catch {
    return { ok: false, code: 'corrupt', message: SAVE_CORRUPT_MESSAGE };
  }
}
