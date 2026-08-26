import { describe, expect, it } from 'vitest';
import {
  ANTI_CHEAT_LAYERS,
  CHAIN_LIMIT,
  GENESIS_HASH,
  ROLL_TRAIL_LIMIT,
  beginCommand,
  buildAuditTable,
  chainAuditHash,
  checkInvariants,
  commitCommand,
  formatAuditId,
  formatAuditRecord,
  recordDie,
  recordSpan,
  sha256Hex,
  verifyChain,
  verifyStateChain,
} from './audit';
import { chooseEvent, performAction } from './game';
import { grantPatterns, newGame } from './testkit';
import type { GameState } from './types';

const settle = (state: GameState): GameState =>
  state.pendingEvent ? chooseEvent(state, 1).state : state;

const playTurns = (state: GameState, count: number): GameState => {
  let current = state;
  for (let i = 0; i < count; i += 1) current = settle(performAction(current, '悟道').state);
  return current;
};

describe('sha256', () => {
  it('matches the published digest of the empty string', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('matches the published digest of "abc"', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('handles inputs longer than one 64-byte block', () => {
    expect(sha256Hex('a'.repeat(200))).toHaveLength(64);
    expect(sha256Hex('a'.repeat(200))).not.toBe(sha256Hex('a'.repeat(201)));
  });

  it('handles multi-byte UTF-8 without collapsing distinct inputs', () => {
    expect(sha256Hex('道君')).not.toBe(sha256Hex('道纹'));
  });
});

describe('audited rolls', () => {
  it('records the reason and the pre-roll seed', () => {
    const state = newGame({}, 42);
    const seedBefore = state.seed;
    const value = recordSpan(state, 1, 6, '试掷');
    expect(state.rolls).toHaveLength(1);
    expect(state.rolls[0]).toMatchObject({ id: 1, die: 'D6', reason: '试掷', seedBefore, value });
  });

  it('advances the seed on every roll', () => {
    const state = newGame({}, 42);
    recordSpan(state, 1, 6, '试掷');
    expect(state.seed).not.toBe(newGame({}, 42).seed);
  });

  it('keeps values inside the requested span', () => {
    const state = newGame({}, 5);
    for (let i = 0; i < 400; i += 1) {
      const value = recordSpan(state, 3, 9, '范围');
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('numbers rolls monotonically even after the trail is trimmed', () => {
    const state = newGame({}, 5);
    for (let i = 0; i < ROLL_TRAIL_LIMIT + 25; i += 1) recordDie(state, 20, '连掷');
    expect(state.rolls).toHaveLength(ROLL_TRAIL_LIMIT);
    expect(state.rollCount).toBe(ROLL_TRAIL_LIMIT + 25);
    expect(state.rolls[0]!.id).toBe(26);
  });

  it('seals rolls whose reason carries the 暗掷 marker', () => {
    const state = newGame({}, 5);
    recordDie(state, 100, '命数·暗掷');
    expect(state.rolls[0]!.sealed).toBe(true);
    expect(formatAuditRecord(state.rolls[0]!).display).toBe('??');
  });

  it('shows plain rolls verbatim in the 审计 table', () => {
    const state = newGame({}, 5);
    recordDie(state, 20, '明掷');
    const [record] = buildAuditTable(state.rolls);
    expect(record).toMatchObject({ recordId: 'TZ-0001', die: 'D20', sealed: false });
    expect(record!.display).toBe(String(state.rolls[0]!.value));
  });

  it('formats record ids with four digits', () => {
    expect(formatAuditId(1)).toBe('TZ-0001');
    expect(formatAuditId(1234)).toBe('TZ-1234');
  });
});

describe('hash chain', () => {
  it('starts every life at genesis', () => {
    const state = newGame();
    expect(state.auditHash).toBe(GENESIS_HASH);
    expect(state.chainStart).toBe(GENESIS_HASH);
    expect(verifyStateChain(state)).toBe(true);
  });

  it('advances the head hash once per command', () => {
    const before = newGame({}, 9);
    const after = performAction(before, '调息').state;
    expect(after.auditHash).not.toBe(before.auditHash);
    expect(after.auditChain).toHaveLength(1);
    expect(after.auditChain[0]!.command).toBe('行动:调息');
  });

  it('links each entry to the previous hash', () => {
    const state = playTurns(newGame({}, 9), 3);
    expect(verifyChain(state.auditChain, state.chainStart).valid).toBe(true);
    expect(verifyChain(state.auditChain, state.chainStart).headHash).toBe(state.auditHash);
  });

  it('detects a tampered roll value', () => {
    const state = playTurns(newGame({}, 9), 3);
    const forged = structuredClone(state);
    forged.auditChain[0]!.rollValues = [99];
    const result = verifyChain(forged.auditChain, forged.chainStart);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it('detects a tampered command label', () => {
    const state = playTurns(newGame({}, 9), 3);
    const forged = structuredClone(state);
    forged.auditChain[1]!.command = '行动:突破';
    expect(verifyChain(forged.auditChain, forged.chainStart).valid).toBe(false);
  });

  it('rejects a chain that no longer reproduces the stored head', () => {
    const state = playTurns(newGame({}, 9), 2);
    expect(verifyStateChain({ ...state, auditHash: sha256Hex('伪造') })).toBe(false);
  });

  it('moves chainStart forward when the retained window overflows', () => {
    const state = playTurns(newGame({}, 9), CHAIN_LIMIT + 6);
    expect(state.auditChain).toHaveLength(CHAIN_LIMIT);
    expect(state.chainStart).not.toBe(GENESIS_HASH);
    expect(verifyStateChain(state)).toBe(true);
  });

  it('bundles only the rolls made since the command began', () => {
    const state = newGame({}, 9);
    recordDie(state, 6, '前置');
    const since = beginCommand(state);
    recordDie(state, 6, '本令一');
    recordDie(state, 6, '本令二');
    expect(commitCommand(state, '试令', since).rollValues).toHaveLength(2);
  });

  it('derives the same hash for the same inputs', () => {
    expect(chainAuditHash(GENESIS_HASH, 3, '行动:悟道', [4, 5])).toBe(
      chainAuditHash(GENESIS_HASH, 3, '行动:悟道', [4, 5]),
    );
    expect(chainAuditHash(GENESIS_HASH, 3, '行动:悟道', [4, 5])).not.toBe(
      chainAuditHash(GENESIS_HASH, 3, '行动:悟道', [4, 6]),
    );
  });
});

describe('state invariants', () => {
  it('passes a freshly created life', () => {
    expect(checkInvariants(newGame())).toBeNull();
  });

  it('passes after a long played run', () => {
    expect(checkInvariants(playTurns(newGame({}, 31), 40))).toBeNull();
  });

  it('catches negative spirit stones', () => {
    const state = newGame();
    state.territory.spiritStones = -1;
    expect(checkInvariants(state)).toContain('玄玉');
  });

  it('catches health above its cap', () => {
    const state = newGame();
    state.character.health = state.character.maxHealth + 1;
    expect(checkInvariants(state)).toContain('气血逾上限');
  });

  it('catches soul power above its cap', () => {
    const state = newGame();
    state.soul.power = state.soul.maxPower + 5;
    expect(checkInvariants(state)).toContain('神魂越界');
  });

  it('catches a realm index outside the realm ladder', () => {
    const state = newGame();
    state.character.realm = 99;
    expect(checkInvariants(state)).toContain('境界越界');
  });

  it('catches engraved patterns with no matching names', () => {
    const state = newGame();
    state.daoPattern.engraved = 4;
    expect(checkInvariants(state)).toContain('纹名与纹数不符');
  });

  it('accepts patterns granted through the engraving path', () => {
    const state = newGame();
    grantPatterns(state, 4);
    expect(checkInvariants(state)).toBeNull();
  });

  it('catches an out-of-order roll trail', () => {
    const state = newGame();
    recordDie(state, 6, '一');
    recordDie(state, 6, '二');
    state.rolls[1]!.id = 1;
    expect(checkInvariants(state)).toContain('掷序紊乱');
  });
});

describe('anti-cheat documentation surface', () => {
  it('documents every layer once, numbered in order', () => {
    expect(ANTI_CHEAT_LAYERS.length).toBeGreaterThanOrEqual(6);
    expect(ANTI_CHEAT_LAYERS.map((layer) => layer.layer)).toEqual(
      ANTI_CHEAT_LAYERS.map((_, index) => index + 1),
    );
    expect(ANTI_CHEAT_LAYERS.every((layer) => layer.name && layer.desc)).toBe(true);
  });
});
