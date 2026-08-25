/**
 * audit.ts — 天道审计 (roll log, hash chain, 9-layer anti-cheat, PLAN §3.9)
 *
 * The audit primitives the rest of the engine builds on:
 *   - `recordRoll` — number-returning wrapper over the audited dice gateway
 *     (`rng.roll`, layer 1);
 *   - a synchronous, dependency-free SHA-256 (engine stays pure & testable);
 *   - the per-turn hash chain
 *     `auditHash = sha256(prevHash | turn | command | rollValues)` (layer 5),
 *     plus full-chain verification for replay audits;
 *   - `saveChecksum` — the save-blob integrity digest (layer 6, see save.ts);
 *   - TZ-XXXX numbered audit records for the 审计 command (layer 9), with
 *     sealed-roll redaction (机缘 暗掷 — the roll is shown, its value never);
 *   - wish detection ("我希望获得神器" ⇒ 天道不受愿。) backing the command
 *     whitelist (layer 2);
 *   - post-turn state invariants (layer 7) — a violation rolls the turn back
 *     (enforced by the single writer, turn.ts — layer 8).
 */

import type { DiceRoll, Die, GameState } from './types';
import { roll } from './rng';

// ============================================================================
// SHA-256 — synchronous, pure TypeScript (no async SubtleCrypto in the engine)
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

  // Non-null assertions below: all indices are provably within the fixed
  // 64/8-slot buffers (noUncheckedIndexedAccess).
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
// Layer 1 — Audited rolls
// ============================================================================

/**
 * Number-returning wrapper over the audited dice gateway (`rng.roll`):
 * advances the PRNG and appends the roll — with reason and pre-roll PRNG
 * snapshot — to the trail on the (already-cloned, turn-local) state.
 *
 * Pass `sealed = true` for 天机暗掷 (the hidden 机缘 roll); reasons carrying
 * the 暗掷 marker are sealed automatically (layer 3).
 */
export function recordRoll(
  state: GameState,
  die: Die,
  reason: string,
  sealed?: boolean,
): number {
  return Number(roll(state, die, reason, sealed));
}

// ============================================================================
// Layer 5 — Hash chain (per-turn tamper evidence)
// ============================================================================

/** The chain root, fixed for the v1 save schema. */
export const GENESIS_HASH = sha256Hex('mcls-genesis-v1:太初有道,天道无情。');

/**
 * Advance the audit chain for one resolved command:
 * the new `auditHash` = sha256(prevHash | turn | command | rollValues).
 */
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
  /** sha256(prevHash | turn | command | rollValues) */
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
  /** Index of the first broken entry, or null if the chain holds. */
  brokenAt: number | null;
  /** Hash at the head of the (valid prefix of the) chain. */
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

// ============================================================================
// Layer 6 support — save-blob integrity digest (see save.ts)
// ============================================================================

/** Deterministic integrity digest of a state snapshot for the save blob. */
export function saveChecksum(state: GameState): string {
  return sha256Hex(`mcls-save-v1|${JSON.stringify(state)}`);
}

/**
 * FNV-1a 64-bit (hex) — cheap non-cryptographic hash for deterministic
 * picks (narrative templates) and legacy checksums. Prefer sha256Hex for
 * anything integrity-related.
 */
export function fnv1a64(input: string): string {
  const FNV_PRIME = 0x100000001b3n;
  const MASK64 = 0xffffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
}

// ============================================================================
// Layers 3 & 9 — 审计: TZ-XXXX numbered records, sealed-roll redaction
// ============================================================================

export const SEALED_ROLL_DISPLAY = '??';
export const SEALED_ROLL_NOTE = '天道已掷,命数已定';

/** TZ-XXXX record number: TZ-0001, TZ-0042, … (no truncation past 9999). */
export function formatAuditId(id: number): string {
  return `TZ-${String(id).padStart(4, '0')}`;
}

export interface AuditRecord {
  /** e.g. "TZ-0001" */
  recordId: string;
  turn: number;
  die: Die;
  /** The roll value as a string, or "??" for sealed rolls (layer 3). */
  display: string;
  reason: string;
  sealed: boolean;
}

export function formatAuditRecord(roll: DiceRoll): AuditRecord {
  const sealed = roll.sealed === true;
  return {
    recordId: formatAuditId(roll.id),
    turn: roll.turn,
    die: roll.die,
    display: sealed ? SEALED_ROLL_DISPLAY : String(roll.value),
    reason: sealed ? `${roll.reason}(${SEALED_ROLL_NOTE})` : roll.reason,
    sealed,
  };
}

/** The full table rendered by the 审计 command (layer 9). */
export function buildAuditTable(rolls: readonly DiceRoll[]): AuditRecord[] {
  return rolls.map(formatAuditRecord);
}

// ============================================================================
// Layer 2 support — no player wishing
// ============================================================================

export const WISH_REJECTION = '天道不受愿。';

const WISH_PATTERNS: readonly RegExp[] = [
  /我希望/,
  /我想要/,
  /给我/,
  /赐我/,
  /让我(获得|变|拥有|直接)/,
  /直接(获得|突破|飞升|满级)/,
  /作弊/,
  /金手指/,
  /修改(属性|灵石|存档|数据)/,
  /wish/i,
  /cheat/i,
  /hack/i,
  /god\s*mode/i,
];

/**
 * True when free-text input is a wish/cheat attempt rather than a command.
 * The command parser answers such input with `WISH_REJECTION` only.
 */
export function isForbiddenWish(input: string): boolean {
  const text = input.trim();
  if (text.length === 0) return false;
  return WISH_PATTERNS.some((p) => p.test(text));
}

// ============================================================================
// Layer 7 — post-turn state invariants
// ============================================================================

const REALM_ORDER: Record<string, number> = {
  mortal: 0,
  qi: 1,
  foundation: 2,
  core: 3,
  nascent: 4,
  deity: 5,
};

/** Compare realm order — true if `a` is at or beyond `b`. */
export function realmAtLeast(a: string, b: string): boolean {
  return (REALM_ORDER[a] ?? -1) >= (REALM_ORDER[b] ?? 99);
}

export { REALM_ORDER };

/**
 * Post-turn assertions. Returns null when the state is lawful (合乎天道),
 * otherwise a human-readable description of every violation — the single
 * writer (turn.ts, layer 8) rolls the turn back on any non-null result.
 */
export function checkInvariants(state: GameState): string | null {
  const v: string[] = [];
  if (state.turn < 0 || !Number.isInteger(state.turn)) v.push(`回合异常: ${state.turn}`);

  const c = state.character;
  if (c) {
    if (!(c.spiritStones >= 0)) v.push(`灵石为负: ${c.spiritStones}`);
    if (!(c.maxHp > 0)) v.push(`气血上限异常: ${c.maxHp}`);
    if (!(c.hp >= 0)) v.push(`气血为负: ${c.hp}`);
    if (c.hp > c.maxHp) v.push(`气血逾上限: ${c.hp}/${c.maxHp}`);
    if (!(c.realm.expNeeded > 0)) v.push(`修为上限异常: ${c.realm.expNeeded}`);
    if (!(c.realm.exp >= 0)) v.push(`修为为负: ${c.realm.exp}`);
    if (c.realm.exp > c.realm.expNeeded) v.push(`修为溢出: ${c.realm.exp}/${c.realm.expNeeded}`);
    if (!(c.realm.realm in REALM_ORDER)) v.push(`未知境界: ${c.realm.realm}`);
    if (c.realm.realm === 'qi' && (c.realm.qiLayer < 1 || c.realm.qiLayer > 13)) {
      v.push(`炼气层数异常: ${c.realm.qiLayer}`);
    }
    if (!(c.age >= 0) || c.age > c.lifespan + 1) v.push(`年岁异常: ${c.age}/${c.lifespan}`);
    for (const s of c.inventory) {
      if (s.count <= 0) v.push(`物品堆叠异常: ${s.itemId}×${s.count}`);
    }
    for (const [k, val] of Object.entries(c.attributes)) {
      if (!(val >= 0) || val > 30) v.push(`属性越界: ${k}=${val}`);
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

// ============================================================================
// The 9 layers — documentation surface for the 审计 view
// ============================================================================

export interface AntiCheatLayer {
  layer: number;
  name: string;
  desc: string;
}

export const ANTI_CHEAT_LAYERS: readonly AntiCheatLayer[] = [
  { layer: 1, name: '骰子权威', desc: '所有随机数经 rng.roll 产出,连同缘由与骰前状态入册。' },
  { layer: 2, name: '命令白名单', desc: '解析器只受理已知命令;许愿之言,天道不受。' },
  { layer: 3, name: '隐藏属性封印', desc: '机缘之数永不示人;面板不列,审计只记其掷,不记其果。' },
  { layer: 4, name: '种子确定性', desc: '种子定于开局;同种同令,命途如一,可复演查验。' },
  { layer: 5, name: '哈希链', desc: '每回合 auditHash = sha256(前链 + 回合 + 命令 + 骰值),环环相扣。' },
  { layer: 6, name: '存档完整性', desc: '存档携校验和与链首;载入不符者,此界因果紊乱,不可续。' },
  { layer: 7, name: '状态不变量', desc: '回合终了必验:灵石非负、修为有度、境界有序;违者回溯。' },
  { layer: 8, name: '单一写者', desc: '唯 turn.ts 可易天机;界面无改数之权。' },
  { layer: 9, name: '审计公开', desc: '审计一令,历掷尽列(TZ-XXXX),公道自见。' },
];
