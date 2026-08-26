/**
 * audit.ts — 天机录 (roll ledger, hash chain, integrity)
 *
 * Everything that makes the simulation checkable rather than merely claimed:
 *   - a synchronous, dependency-free SHA-256 (the engine stays pure);
 *   - the per-command hash chain
 *     `auditHash = sha256(prev | turn | command | rollValues)`;
 *   - `saveChecksum`, the tamper seal on the save blob;
 *   - TJ-XXXX numbered records for the 天机录 view;
 *   - post-turn state invariants — a violation rolls the whole turn back.
 */

import type { AuditChainEntry, DiceRoll, GameState } from './types';

// ============================================================================
// SHA-256
// ============================================================================

const K = new Uint32Array([
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

/** SHA-256 of a UTF-8 string, as 64 lowercase hex chars. */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitHi = Math.floor((bytes.length * 8) / 4294967296);
  const bitLo = (bytes.length * 8) >>> 0;
  const len = (((bytes.length + 8) >> 6) + 1) << 6;

  const padded = new Uint8Array(len);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(len - 8, bitHi);
  dv.setUint32(len - 4, bitLo);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let off = 0; off < len; off += 64) {
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
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
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

export const GENESIS_HASH = sha256Hex('mieyun-genesis-v1:图录既开,气运有主,劫数有期。');

export function chainAuditHash(
  prevHash: string,
  turn: number,
  command: string,
  rollValues: readonly number[],
): string {
  return sha256Hex(`${prevHash}|${turn}|${command}|${rollValues.join(',')}`);
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
  brokenAt: number | null;
  headHash: string;
}

/** Recompute every link from genesis; a single edited turn breaks the chain. */
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

/** Deterministic integrity digest for the save blob. */
export function saveChecksum(state: GameState): string {
  return sha256Hex(`mieyun-save-v1|${JSON.stringify(state)}`);
}

// ============================================================================
// 天机录 records
// ============================================================================

export function formatAuditId(id: number): string {
  return `TJ-${String(id).padStart(4, '0')}`;
}

export interface AuditRecord {
  recordId: string;
  turn: number;
  die: string;
  value: string;
  reason: string;
}

export function formatAuditRecord(r: DiceRoll): AuditRecord {
  return {
    recordId: formatAuditId(r.id),
    turn: r.turn,
    die: r.die,
    value: String(r.value),
    reason: r.reason,
  };
}

export function buildAuditTable(rolls: readonly DiceRoll[]): AuditRecord[] {
  return rolls.map(formatAuditRecord);
}

// ============================================================================
// Free-text guard
// ============================================================================

export const WISH_REJECTION = '天机不受祈请。图录只记因果,不记愿望。';

const WISH_PATTERNS: readonly RegExp[] = [
  /我希望/,
  /我想要/,
  /给我/,
  /赐我/,
  /让我(获得|变|拥有|直接)/,
  /直接(获得|突破|飞升|满级)/,
  /作弊/,
  /金手指/,
  /修改(属性|玄晶|存档|数据|劫运|气运)/,
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
// Invariants
// ============================================================================

/**
 * Post-turn assertions. `null` means lawful; anything else is a description of
 * every violation, and the single writer (turn.ts) rolls the turn back.
 */
export function checkInvariants(state: GameState): string | null {
  const v: string[] = [];
  if (!Number.isInteger(state.turn) || state.turn < 0) v.push(`回合异常: ${state.turn}`);

  const c = state.character;
  if (c) {
    if (!(c.spiritStones >= 0)) v.push(`玄晶为负: ${c.spiritStones}`);
    if (!(c.maxHp > 0)) v.push(`气血上限异常: ${c.maxHp}`);
    if (c.hp < 0) v.push(`气血为负: ${c.hp}`);
    if (c.hp > c.maxHp) v.push(`气血逾限: ${c.hp}/${c.maxHp}`);
    if (c.mana < 0) v.push(`法力为负: ${c.mana}`);
    if (c.mana > c.maxMana) v.push(`法力逾限: ${c.mana}/${c.maxMana}`);
    if (c.fortune < 0 || c.fortune > 100) v.push(`气运越界: ${c.fortune}`);
    if (c.calamity.value < 0 || c.calamity.value > 100) {
      v.push(`劫运越界: ${c.calamity.value}`);
    }
    if (c.calamity.peak < c.calamity.value) v.push('劫运峰值低于当前值');
    if (!(c.realm.expNeeded > 0)) v.push(`修为上限异常: ${c.realm.expNeeded}`);
    if (c.realm.exp < 0) v.push(`修为为负: ${c.realm.exp}`);
    if (c.realm.exp > c.realm.expNeeded) {
      v.push(`修为溢出: ${c.realm.exp}/${c.realm.expNeeded}`);
    }
    if (c.realm.realm === 'yinqi' && (c.realm.layer < 1 || c.realm.layer > 9)) {
      v.push(`引气层数异常: ${c.realm.layer}`);
    }
    if (c.age < 0 || c.age > c.lifespan + 1) v.push(`年岁异常: ${c.age}/${c.lifespan}`);
    for (const s of c.inventory) {
      if (s.count <= 0) v.push(`物品堆叠异常: ${s.itemId}×${s.count}`);
    }
    for (const [k, val] of Object.entries(c.attributes)) {
      if (!(val >= 0) || val > 40) v.push(`属性越界: ${k}=${val}`);
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
