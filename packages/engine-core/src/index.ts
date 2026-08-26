/**
 * @pj03/engine-core — shared engine CONTRACT for all PJ03 novel life simulators.
 *
 * Round 1 scope: TYPES ONLY. Each game vendors its own copy of the reference
 * implementations (rng / audit / save, see the root game's `src/engine/`) so
 * that parallel agents never block on this package. Round 3 consolidates the
 * identical implementations here behind these exact signatures.
 *
 * Iron rules (identical to the root game):
 *  1. Zero React / zero browser APIs in engine code (storage is injected).
 *  2. Every game rule is a pure function `(state, input, rng) → (state', logs[])`.
 *  3. All randomness flows through one audited dice authority.
 *  4. Only the turn resolver produces new state (single writer).
 */

// ===== Dice & RNG =====

export type DiceKind = 'd100' | 'd20' | 'd6';

export interface DiceRoll {
  /** Monotonic sequence id within a run. */
  id: number;
  /** Turn on which the roll happened (0 = character creation). */
  turn: number;
  kind: DiceKind;
  /** 1..faces inclusive. */
  value: number;
  /** Human-readable reason, shown verbatim in the audit view. */
  reason: string;
  /** PRNG internal state BEFORE the roll — enables replay verification. */
  prngStateBefore: number;
}

/** Seeded dice authority. mulberry32 is the reference PRNG. */
export interface Rng {
  readonly seed: number;
  /** Raw uniform in [0, 1). Prefer roll() so everything is audited. */
  next(): number;
  /** Audited roll; appends to the roll log via the bound recorder. */
  roll(kind: DiceKind, reason: string): DiceRoll;
  /** Current PRNG internal state (for save/replay). */
  state(): number;
}

// ===== Turn resolution =====

export type LogTone =
  | 'neutral'
  | 'good'
  | 'bad'
  | 'system'
  | 'combat'
  | 'ending';

export interface TurnLogEntry {
  turn: number;
  text: string;
  tone: LogTone;
}

export interface TurnResult<S> {
  state: S;
  logs: TurnLogEntry[];
  rolls: DiceRoll[];
}

/**
 * The single state writer. `C` is the game's parsed command union.
 * Implementations MUST be pure: no IO, no Date.now(), no Math.random().
 */
export type TurnResolver<S, C> = (state: S, command: C, rng: Rng) => TurnResult<S>;

// ===== Audit chain (anti-cheat) =====

export interface AuditEntry {
  turn: number;
  /** Normalized command string as accepted by the whitelist parser. */
  command: string;
  /** Ids of the DiceRolls consumed this turn. */
  rollIds: number[];
  prevHash: string;
  /** hash = f(prevHash, turn, command, rollIds, stateDigest) */
  hash: string;
}

// ===== Save envelope =====

export interface SaveEnvelope<S> {
  /** Save format version for migrations, e.g. 1. */
  version: number;
  /** Stable game id: 'fanren' | 'lanke' | 'mieyun' | 'daojun'. */
  gameId: string;
  seed: number;
  savedAtTurn: number;
  /** Checksum over the serialized state + audit head; mismatch ⇒ refuse load. */
  checksum: string;
  state: S;
}

/** Injected by the UI layer; engine code never touches localStorage directly. */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

// ===== Game identity =====

export interface GameMeta {
  /** Short id used in save keys, dist folders and zips. */
  id: 'fanren' | 'lanke' | 'mieyun' | 'daojun';
  /** Display title, e.g. 《烂柯棋缘·人生模拟器》. */
  title: string;
  novel: string;
  author: string;
  /** In-fiction narrator voice, e.g. 天道 / 弈者 / 天机 / 道音. */
  narrator: string;
  version: string;
}
