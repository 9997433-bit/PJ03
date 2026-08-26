/**
 * audit.ts — 天道审计: audited dice, a per-command hash chain, and post-command
 * invariants.
 *
 * Every random number in 道君 flows through `recordSpan`, so each roll carries
 * its reason and the PRNG state it was drawn from. Commands are then sealed
 * into a hash chain (`auditHash = sha256(prev | turn | command | rollValues)`)
 * that the save envelope mirrors — editing localStorage by hand breaks the
 * digest and the save is refused.
 *
 * Ported from the root game's `src/engine/audit.ts`, trimmed to the mechanics
 * 道君 actually has (no hidden 机缘 attribute, no free-text command parser).
 */

import { nextRandom } from './rng';
import type { AuditChainEntry, DiceRoll, GameState } from './types';
import { REALMS } from './types';

// ============================================================================
// SHA-256 — synchronous, pure TypeScript (the engine stays dependency-free)
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

/** SHA-256 of a UTF-8 string, as a 64-char lowercase hex digest. */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLenHi = Math.floor((bytes.length * 8) / 4294967296);
  const bitLenLo = (bytes.length * 8) >>> 0;

  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi);
  view.setUint32(paddedLen - 4, bitLenLo);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  // Non-null assertions: every index below is provably inside the fixed
  // 64/8-slot buffers (tsconfig runs noUncheckedIndexedAccess).
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!;
    let e = h[4]!, f = h[5]!, g = h[6]!, hh = h[7]!;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
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
// Audited rolls
// ============================================================================

/** How many recent rolls the 审计 view keeps (saves stay small). */
export const ROLL_TRAIL_LIMIT = 60;
/** How many recent chain links travel with the save. */
export const CHAIN_LIMIT = 40;

export const GENESIS_HASH = sha256Hex('daojun-genesis-v1:雷起九霄，纹成一念。');
export const SEALED_ROLL_DISPLAY = '??';
export const SEALED_ROLL_NOTE = '天机暗掷，命数已定';

/**
 * Draw one audited value in `[min, max]`, advancing the state's PRNG and
 * appending the roll — with reason and pre-roll seed — to the trail.
 */
export function recordSpan(
  state: GameState,
  min: number,
  max: number,
  reason: string,
  sealed = false,
): number {
  const low = Math.trunc(min);
  const span = Math.max(1, Math.trunc(max) - low + 1);
  const seedBefore = state.seed;
  const drawn = nextRandom(seedBefore);
  state.seed = drawn.seed;
  const value = low + Math.floor(drawn.value * span);
  state.rollCount += 1;
  const entry: DiceRoll = {
    id: state.rollCount,
    turn: state.turn,
    die: `D${span}`,
    value,
    reason,
    seedBefore,
    sealed: sealed || reason.includes('暗掷'),
  };
  state.rolls = [...state.rolls, entry].slice(-ROLL_TRAIL_LIMIT);
  return value;
}

/** Roll a die numbered `1..faces`. */
export function recordDie(state: GameState, faces: number, reason: string, sealed = false): number {
  return recordSpan(state, 1, Math.max(1, Math.trunc(faces)), reason, sealed);
}

// ============================================================================
// The per-command hash chain
// ============================================================================

export function chainAuditHash(
  prevHash: string,
  turn: number,
  command: string,
  rollValues: readonly number[],
): string {
  return sha256Hex(`${prevHash}|${turn}|${command}|${rollValues.join(',')}`);
}

/** Roll-id watermark to hand back to `commitCommand`. */
export function beginCommand(state: GameState): number {
  return state.rollCount;
}

/**
 * Seal every roll made since `sinceRollId` into one chain link and advance
 * `auditHash`. Trimming the retained window moves `chainStart` forward so
 * verification stays exact.
 */
export function commitCommand(state: GameState, command: string, sinceRollId: number): AuditChainEntry {
  const rollValues = state.rolls.filter((item) => item.id > sinceRollId).map((item) => item.value);
  const entry: AuditChainEntry = {
    turn: state.turn,
    command,
    rollValues,
    hash: chainAuditHash(state.auditHash, state.turn, command, rollValues),
  };
  state.auditHash = entry.hash;
  const chain = [...state.auditChain, entry];
  const overflow = chain.length - CHAIN_LIMIT;
  if (overflow > 0) {
    state.chainStart = chain[overflow - 1]!.hash;
    state.auditChain = chain.slice(overflow);
  } else {
    state.auditChain = chain;
  }
  return entry;
}

export interface ChainVerification {
  valid: boolean;
  /** Index of the first broken link, or null when the chain holds. */
  brokenAt: number | null;
  headHash: string;
}

/** Recompute every retained link; any edited turn breaks the chain. */
export function verifyChain(
  entries: readonly AuditChainEntry[],
  startHash: string = GENESIS_HASH,
): ChainVerification {
  let previous = startHash;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!;
    if (chainAuditHash(previous, entry.turn, entry.command, entry.rollValues) !== entry.hash) {
      return { valid: false, brokenAt: i, headHash: previous };
    }
    previous = entry.hash;
  }
  return { valid: true, brokenAt: null, headHash: previous };
}

/** True when a state's retained chain reproduces its own `auditHash`. */
export function verifyStateChain(state: GameState): boolean {
  const result = verifyChain(state.auditChain, state.chainStart);
  return result.valid && result.headHash === state.auditHash;
}

// ============================================================================
// 审计 view — TZ-XXXX numbered records
// ============================================================================

/** TZ-XXXX record number: TZ-0001, TZ-0042, … */
export function formatAuditId(id: number): string {
  return `TZ-${String(id).padStart(4, '0')}`;
}

export interface AuditRecord {
  recordId: string;
  turn: number;
  die: string;
  display: string;
  reason: string;
  sealed: boolean;
}

export function formatAuditRecord(entry: DiceRoll): AuditRecord {
  const sealed = entry.sealed === true;
  return {
    recordId: formatAuditId(entry.id),
    turn: entry.turn,
    die: entry.die,
    display: sealed ? SEALED_ROLL_DISPLAY : String(entry.value),
    reason: sealed ? `${entry.reason}（${SEALED_ROLL_NOTE}）` : entry.reason,
    sealed,
  };
}

export function buildAuditTable(rolls: readonly DiceRoll[]): AuditRecord[] {
  return rolls.map(formatAuditRecord);
}

// ============================================================================
// Post-command invariants (a violation rolls the whole command back)
// ============================================================================

export const INVARIANT_ROLLBACK_MESSAGE = '道基紊乱，此举已被天道回溯。';

/**
 * Assertions run after every command. Returns null when the state is lawful,
 * otherwise a human-readable list of violations; the single writer (game.ts)
 * discards the mutated copy and keeps the previous state.
 */
export function checkInvariants(state: GameState): string | null {
  const violations: string[] = [];
  const c = state.character;
  const d = state.daoPattern;
  const s = state.soul;
  const t = state.territory;

  if (!Number.isInteger(state.turn) || state.turn < 0) violations.push(`回合异常: ${state.turn}`);
  if (!Number.isInteger(c.realm) || c.realm < 0 || c.realm >= REALMS.length) {
    violations.push(`境界越界: ${c.realm}`);
  }
  if (!(c.maxHealth > 0)) violations.push(`气血上限异常: ${c.maxHealth}`);
  if (!(c.health >= 0)) violations.push(`气血为负: ${c.health}`);
  if (c.health > c.maxHealth) violations.push(`气血逾上限: ${c.health}/${c.maxHealth}`);
  if (!(c.maxQi > 0)) violations.push(`灵气上限异常: ${c.maxQi}`);
  if (!(c.qi >= 0)) violations.push(`灵气为负: ${c.qi}`);
  if (c.qi > c.maxQi) violations.push(`灵气逾上限: ${c.qi}/${c.maxQi}`);
  if (!(c.age >= 0) || c.age > c.lifespan + 1) violations.push(`年岁异常: ${c.age}/${c.lifespan}`);

  if (!(d.insight >= 0)) violations.push(`感悟为负: ${d.insight}`);
  if (!(d.engraved >= 0) || !Number.isInteger(d.engraved)) violations.push(`道纹数异常: ${d.engraved}`);
  if (d.harmony < 0 || d.harmony > 100) violations.push(`调和越界: ${d.harmony}`);
  if (d.namedPatterns.length !== d.engraved) {
    violations.push(`纹名与纹数不符: ${d.namedPatterns.length}/${d.engraved}`);
  }

  if (!(s.maxPower > 0)) violations.push(`神魂上限异常: ${s.maxPower}`);
  if (s.power < 0 || s.power > s.maxPower) violations.push(`神魂越界: ${s.power}/${s.maxPower}`);
  if (s.stability < 0 || s.stability > 100) violations.push(`魂稳越界: ${s.stability}`);

  if (!(t.nodes >= 0) || !Number.isInteger(t.nodes)) violations.push(`灵地数异常: ${t.nodes}`);
  if (t.control < 0 || t.control > 100) violations.push(`掌控越界: ${t.control}`);
  if (t.food < 0 || t.food > 999) violations.push(`粮草越界: ${t.food}`);
  if (t.spiritStones < 0 || t.spiritStones > 9999) violations.push(`玄玉越界: ${t.spiritStones}`);
  if (!(t.influence >= 0)) violations.push(`威势为负: ${t.influence}`);

  for (let i = 1; i < state.rolls.length; i += 1) {
    if (state.rolls[i]!.id <= state.rolls[i - 1]!.id) {
      violations.push(`掷序紊乱: index ${i}`);
      break;
    }
  }

  return violations.length === 0 ? null : violations.join('；');
}

// ============================================================================
// Documentation surface for the 审计 panel
// ============================================================================

export interface AntiCheatLayer {
  layer: number;
  name: string;
  desc: string;
}

export const ANTI_CHEAT_LAYERS: readonly AntiCheatLayer[] = [
  { layer: 1, name: '骰子权威', desc: '一切随机皆经 recordSpan 落册，缘由与骰前种子一并入卷。' },
  { layer: 2, name: '种子确定性', desc: '种子随卷入档；同种同令，命途逐字节如一。' },
  { layer: 3, name: '哈希链', desc: '每道命令 auditHash = sha256(前链|回合|命令|骰值)，环环相扣。' },
  { layer: 4, name: '存档完整性', desc: '存档携魔数、校验和与链首；不符者，道基紊乱，不可续。' },
  { layer: 5, name: '状态不变量', desc: '命令终了必验：玄玉非负、神魂有度、境界有序；违者回溯整令。' },
  { layer: 6, name: '单一写者', desc: '唯 engine 可易天机；界面只递命令，无改数之权。' },
];
