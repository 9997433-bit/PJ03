/**
 * audit.ts — 弈者棋录 (roll log, hash chain, state invariants)
 *
 * Adapted from the root simulator. Provides:
 *   - a synchronous, dependency-free SHA-256 so the engine stays pure;
 *   - the per-turn hash chain
 *     `auditHash = sha256(prevHash | turn | command | rollValues)`,
 *     plus full-chain verification for replay audits;
 *   - `saveChecksum` — the save-blob integrity digest (see save.ts);
 *   - QL-XXXX numbered audit records with sealed-roll redaction;
 *   - post-turn state invariants — a violation rolls the whole turn back
 *     (enforced by the single writer, turn.ts).
 */

import type { DiceRoll, Die, GameState } from './types';
import { MAX_CHESS_DAO, MAX_DUST } from './types';

// ============================================================================
// SHA-256 — synchronous, pure TypeScript
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/** SHA-256 of a UTF-8 string (or raw bytes), as a 64-char lowercase hex digest. */
export function sha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const bitLenHi = Math.floor((bytes.length * 8) / 4294967296);
  const bitLenLo = (bytes.length * 8) >>> 0;

  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 8, bitLenHi);
  dv.setUint32(paddedLen - 4, bitLenLo);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  // Non-null assertions: every index is provably inside the fixed 64/8-slot
  // buffers, which noUncheckedIndexedAccess cannot see.
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!;
    let e = h[4]!, f = h[5]!, g = h[6]!, hh = h[7]!;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0; h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0; h[7] = (h[7]! + hh) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

// ============================================================================
// Hash chain
// ============================================================================

/** The chain root, fixed for the v1 save schema. */
export const GENESIS_HASH = sha256Hex('lkqy-genesis-v1:观棋柯烂,世事如枰。');

/** Advance the chain for one resolved command. */
export function chainAuditHash(
  prevHash: string,
  turn: number,
  command: string,
  rollValues: readonly number[],
): string {
  return sha256Hex(`${prevHash}|${turn}|${command}|${rollValues.join(',')}`);
}

export interface AuditChainEntry {
  turn: number;
  command: string;
  rollValues: number[];
  hash: string;
}

export function buildChainEntry(
  prevHash: string,
  turn: number,
  command: string,
  rollValues: readonly number[],
): AuditChainEntry {
  return {
    turn,
    command,
    rollValues: [...rollValues],
    hash: chainAuditHash(prevHash, turn, command, rollValues),
  };
}

export interface ChainVerification {
  valid: boolean;
  /** index of the first broken entry, or null when the chain holds */
  brokenAt: number | null;
  headHash: string;
}

/** Recompute every link from genesis; any tampered turn breaks the chain. */
export function verifyChain(
  entries: readonly AuditChainEntry[],
  genesisHash: string = GENESIS_HASH,
): ChainVerification {
  let prev = genesisHash;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (chainAuditHash(prev, e.turn, e.command, e.rollValues) !== e.hash) {
      return { valid: false, brokenAt: i, headHash: prev };
    }
    prev = e.hash;
  }
  return { valid: true, brokenAt: null, headHash: prev };
}

/** Deterministic integrity digest of a state snapshot for the save blob. */
export function saveChecksum(state: GameState): string {
  return sha256Hex(`lkqy-save-v1|${JSON.stringify(state)}`);
}

// ============================================================================
// 审计 view — QL-XXXX records, sealed-roll redaction
// ============================================================================

export const SEALED_ROLL_DISPLAY = '封';
export const SEALED_ROLL_NOTE = '弈者已掷,缘法已定';

/** QL-XXXX record number (棋录). */
export function formatAuditId(id: number): string {
  return `QL-${String(id).padStart(4, '0')}`;
}

export interface AuditRecord {
  recordId: string;
  turn: number;
  die: Die;
  /** the value as a string, or 封 for sealed rolls */
  display: string;
  reason: string;
  sealed: boolean;
}

export function formatAuditRecord(record: DiceRoll): AuditRecord {
  const sealed = record.sealed === true;
  return {
    recordId: formatAuditId(record.id),
    turn: record.turn,
    die: record.die,
    display: sealed ? SEALED_ROLL_DISPLAY : String(record.value),
    reason: sealed ? `${record.reason}(${SEALED_ROLL_NOTE})` : record.reason,
    sealed,
  };
}

export function buildAuditTable(rolls: readonly DiceRoll[]): AuditRecord[] {
  return rolls.map(formatAuditRecord);
}

// ============================================================================
// No wishing
// ============================================================================

export const WISH_REJECTION = '枰上无侥幸,弈者不受愿。';

const WISH_PATTERNS: readonly RegExp[] = [
  /我希望/,
  /我想要/,
  /给我/,
  /赐我/,
  /让我(获得|变|拥有|直接)/,
  /直接(获得|突破|飞升|满级)/,
  /作弊/,
  /金手指/,
  /修改(属性|银钱|存档|数据|棋道)/,
  /wish/i,
  /cheat/i,
  /hack/i,
  /god\s*mode/i,
];

export function isForbiddenWish(input: string): boolean {
  const text = input.trim();
  if (text.length === 0) return false;
  return WISH_PATTERNS.some((p) => p.test(text));
}

// ============================================================================
// Realm ordering + post-turn invariants
// ============================================================================

export const REALM_ORDER: Record<string, number> = {
  chen: 0,
  mingxin: 1,
  yangqi: 2,
  tongxuan: 3,
  zuowang: 4,
  xiaoyao: 5,
  tianren: 6,
};

/** True when realm `a` is at or beyond realm `b`. */
export function realmAtLeast(a: string, b: string): boolean {
  return (REALM_ORDER[a] ?? -1) >= (REALM_ORDER[b] ?? 99);
}

/**
 * Post-turn assertions. Returns null when the state is lawful, otherwise a
 * human-readable description of every violation — the single writer rolls
 * the turn back on any non-null result.
 */
export function checkInvariants(state: GameState): string | null {
  const v: string[] = [];
  if (state.turn < 0 || !Number.isInteger(state.turn)) v.push(`回合异常: ${state.turn}`);

  const c = state.character;
  if (c) {
    if (!(c.coin >= 0)) v.push(`银钱为负: ${c.coin}`);
    if (!(c.maxSpirit > 0)) v.push(`心神上限异常: ${c.maxSpirit}`);
    if (!(c.spirit >= 0)) v.push(`心神为负: ${c.spirit}`);
    if (c.spirit > c.maxSpirit) v.push(`心神逾上限: ${c.spirit}/${c.maxSpirit}`);
    if (!(c.dust >= 0) || c.dust > MAX_DUST) v.push(`心尘越界: ${c.dust}`);
    if (!(c.chessDao >= 0) || c.chessDao > MAX_CHESS_DAO) v.push(`棋道越界: ${c.chessDao}`);
    if (!(c.insight >= 0)) v.push(`悟为负: ${c.insight}`);
    if (!(c.realm.expNeeded > 0)) v.push(`修为上限异常: ${c.realm.expNeeded}`);
    if (!(c.realm.exp >= 0)) v.push(`修为为负: ${c.realm.exp}`);
    if (c.realm.exp > c.realm.expNeeded) v.push(`修为溢出: ${c.realm.exp}/${c.realm.expNeeded}`);
    if (!(c.realm.realm in REALM_ORDER)) v.push(`未知境界: ${c.realm.realm}`);
    if (!(c.age >= 0) || c.age > c.lifespan + 1) v.push(`年岁异常: ${c.age}/${c.lifespan}`);
    for (const s of c.inventory) {
      if (s.count <= 0) v.push(`物品堆叠异常: ${s.itemId}×${s.count}`);
    }
    for (const [k, val] of Object.entries(c.attributes)) {
      if (!(val >= 0) || val > 30) v.push(`心性越界: ${k}=${val}`);
    }
  }

  for (const being of Object.values(state.spirits)) {
    if (being.favor < -50 || being.favor > 100) {
      v.push(`好感越界: ${being.name}=${being.favor}`);
    }
  }

  for (let i = 1; i < state.rolls.length; i++) {
    if (state.rolls[i]!.id <= state.rolls[i - 1]!.id) {
      v.push(`掷序紊乱: index ${i}`);
      break;
    }
  }

  return v.length === 0 ? null : v.join('；');
}
