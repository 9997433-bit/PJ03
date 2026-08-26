import { describe, expect, it } from 'vitest';
import { executeCommand, runCommand, seasonLabel } from '../turn';
import { commandKey, isFreeCommand, isTimeCommand, parseCommand } from '../commands';
import {
  buildAuditTable,
  buildChainEntry,
  chainAuditHash,
  checkInvariants,
  GENESIS_HASH,
  isForbiddenWish,
  realmAtLeast,
  SEALED_ROLL_DISPLAY,
  verifyChain,
  WISH_REJECTION,
} from '../audit';
import { newGame } from '../creation';
import { openMatch } from '../board';
import { fireEvent } from '../events';
import { EVENTS } from '@/data/events';
import { TURNS_PER_YEAR } from '../types';
import { playableState, withCharacter } from './helpers';
import type { GameState } from '../types';

const rich = (seed = '回合-1'): GameState =>
  withCharacter(playableState(seed), { coin: 900, spirit: 100, maxSpirit: 100 });

describe('指令解析', () => {
  it('maps every documented alias onto a command kind', () => {
    expect(parseCommand('修炼').kind).toBe('cultivate');
    expect(parseCommand('观棋').kind).toBe('spectate');
    expect(parseCommand('坐忘').kind).toBe('sitForget');
    expect(parseCommand('游历').kind).toBe('travel');
    expect(parseCommand('弈道').kind).toBe('match');
    expect(parseCommand('破境').kind).toBe('breakthrough');
    expect(parseCommand('墟市').kind).toBe('market');
    expect(parseCommand('棋录').kind).toBe('audit');
  });

  it('reads a bare digit as an event choice, one-indexed for the player', () => {
    const cmd = parseCommand('2');
    expect(cmd.kind).toBe('eventChoice');
    expect(cmd.kind === 'eventChoice' && cmd.choiceIndex).toBe(1);
    expect(parseCommand('0').kind).toBe('unknown');
    expect(parseCommand('42').kind).toBe('unknown');
  });

  it('reads a bare 棋风 as a played hand', () => {
    const cmd = parseCommand('急攻');
    expect(cmd.kind).toBe('play');
    expect(cmd.kind === 'play' && cmd.style).toBe('急攻');
  });

  it('resolves places and opponents by display name as well as id', () => {
    expect(parseCommand('游历 幽篁竹海')).toEqual({ kind: 'travel', placeId: 'zhulin' });
    expect(parseCommand('游历 zhulin')).toEqual({ kind: 'travel', placeId: 'zhulin' });
    expect(parseCommand('游历 无何有之乡').kind).toBe('unknown');
  });

  it('parses a trailing quantity on 买/卖', () => {
    const cmd = parseCommand('买 粗芽茶 3');
    expect(cmd.kind).toBe('buy');
    expect(cmd.kind === 'buy' && cmd.count).toBe(3);
  });

  it('falls back to unknown on empty or unlisted input', () => {
    expect(parseCommand('').kind).toBe('unknown');
    expect(parseCommand('   ').kind).toBe('unknown');
    expect(parseCommand('御剑飞行').kind).toBe('unknown');
  });

  it('separates verbs that spend a season from free looks', () => {
    expect(isTimeCommand({ kind: 'cultivate' })).toBe(true);
    expect(isTimeCommand({ kind: 'travel' })).toBe(true);
    expect(isTimeCommand({ kind: 'panel' })).toBe(false);
    expect(isFreeCommand({ kind: 'audit' })).toBe(true);
    expect(isFreeCommand({ kind: 'cultivate' })).toBe(false);
  });

  it('builds a stable audit key that never carries free text', () => {
    expect(commandKey({ kind: 'travel', placeId: 'zhulin' })).toBe('travel:zhulin');
    expect(commandKey({ kind: 'play', style: '稳守' })).toBe('play:稳守');
    expect(commandKey({ kind: 'unknown', raw: '我希望有钱' })).toBe('unknown');
  });
});

describe('turn pipeline — guards', () => {
  it('refuses a wish outright, without spending the clock or a die', () => {
    const s = rich();
    const out = executeCommand(s, '我希望直接突破');
    expect(out.accepted).toBe(false);
    expect(out.notices[0]!.text).toBe(WISH_REJECTION);
    expect(out.state).toBe(s);
    expect(out.state.rolls).toHaveLength(s.rolls.length);
  });

  it('recognises wishes in both languages', () => {
    expect(isForbiddenWish('give me god mode')).toBe(true);
    expect(isForbiddenWish('cheat')).toBe(true);
    expect(isForbiddenWish('修改银钱')).toBe(true);
    expect(isForbiddenWish('修炼')).toBe(false);
  });

  it('refuses everything while the character is still being made', () => {
    const s = newGame('未成局');
    const out = executeCommand(s, '修炼');
    expect(out.accepted).toBe(false);
    expect(out.state.turn).toBe(s.turn);
  });

  it('refuses everything once the life has closed', () => {
    const s = rich();
    s.phase = 'ended';
    expect(executeCommand(s, '修炼').accepted).toBe(false);
  });

  it('locks the turn to the pending event, but still allows free looks', () => {
    const s = rich();
    const choiceEvent = EVENTS.find((e) => e.realms.includes('chen') && e.choices)!;
    fireEvent(s, choiceEvent);
    expect(executeCommand(s, '修炼').accepted).toBe(false);
    expect(executeCommand(s, '命盘').accepted).toBe(true);
    expect(executeCommand(s, '1').accepted).toBe(true);
  });

  it('locks the turn to the board while a match is running', () => {
    const s = rich();
    openMatch(s, 'chaguan_laozhang');
    expect(executeCommand(s, '游历').accepted).toBe(false);
    expect(executeCommand(s, '行囊').accepted).toBe(true);
    expect(executeCommand(s, '稳守').accepted).toBe(true);
  });

  it('refuses a played hand when there is no board', () => {
    const s = rich();
    const out = executeCommand(s, '稳守');
    expect(out.accepted).toBe(false);
    expect(out.notices[0]!.text).toContain('并无棋局');
  });

  it('refuses an event choice when nothing is pending', () => {
    expect(executeCommand(rich(), '1').accepted).toBe(false);
  });

  it('refuses an unparsable command with the stock refusal', () => {
    const out = executeCommand(rich(), '御剑飞行');
    expect(out.accepted).toBe(false);
    expect(out.notices[0]!.text).toContain('不在谱内');
  });
});

describe('turn pipeline — the clock', () => {
  it('advances the season only on a time verb', () => {
    const s = rich();
    const look = executeCommand(s, '命盘');
    expect(look.advanced).toBe(false);
    expect(look.state.turn).toBe(s.turn);
    const act = executeCommand(s, '修炼');
    expect(act.advanced).toBe(true);
    expect(act.state.turn).toBe(s.turn + 1);
  });

  it('ages the character one year every four seasons', () => {
    let s = rich('岁月');
    const startAge = s.character!.age;
    for (let i = 0; i < TURNS_PER_YEAR; i += 1) {
      const out = executeCommand(s, '坐忘');
      expect(out.accepted).toBe(true);
      s = out.state;
    }
    expect(s.character!.age).toBe(startAge + 1);
  });

  it('names the season from the turn counter', () => {
    const s = rich();
    expect(seasonLabel(s).length).toBeGreaterThan(0);
    expect(seasonLabel(s)).not.toBe(seasonLabel({ ...s, turn: s.turn + 1 }));
  });

  it('never mutates the state handed in — the turn works on a clone', () => {
    const s = rich();
    const snapshot = JSON.stringify(s);
    executeCommand(s, '修炼');
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('keeps every invariant after a long, mixed run of turns', () => {
    let s = rich('长局');
    const script = ['修炼', '观棋', '坐忘', '游历', '修炼', '命盘', '观棋', '坐忘'];
    for (let i = 0; i < 6; i += 1) {
      for (const raw of script) {
        const out = executeCommand(s, raw);
        if (out.accepted) s = out.state;
        // A pending event must be answered before the script can continue.
        if (s.pendingEvent) {
          const answered = executeCommand(s, '1');
          if (answered.accepted) s = answered.state;
        }
        expect(checkInvariants(s)).toBeNull();
        if (s.phase === 'ended') return;
      }
    }
    expect(s.turn).toBeGreaterThan(20);
  });
});

describe('审计 — the hash chain', () => {
  it('starts from a fixed genesis hash', () => {
    const s = newGame('创世');
    expect(s.auditHash).toBe(GENESIS_HASH);
    expect(GENESIS_HASH).toMatch(/^[0-9a-f]{64}$/);
  });

  it('advances the chain on every accepted turn', () => {
    const s = rich();
    const out = executeCommand(s, '修炼');
    expect(out.state.auditHash).not.toBe(s.auditHash);
    expect(out.state.auditHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic in its inputs and sensitive to each of them', () => {
    const a = chainAuditHash(GENESIS_HASH, 3, 'cultivate', [7, 11]);
    expect(chainAuditHash(GENESIS_HASH, 3, 'cultivate', [7, 11])).toBe(a);
    expect(chainAuditHash(GENESIS_HASH, 4, 'cultivate', [7, 11])).not.toBe(a);
    expect(chainAuditHash(GENESIS_HASH, 3, 'spectate', [7, 11])).not.toBe(a);
    expect(chainAuditHash(GENESIS_HASH, 3, 'cultivate', [7, 12])).not.toBe(a);
  });

  it('verifies an untouched chain and rejects a doctored one', () => {
    const first = buildChainEntry(GENESIS_HASH, 1, 'cultivate', [4]);
    const entries = [first, buildChainEntry(first.hash, 2, 'spectate', [19])];
    const clean = verifyChain(entries);
    expect(clean.valid).toBe(true);
    expect(clean.brokenAt).toBeNull();

    const doctored = structuredClone(entries);
    doctored[1]!.rollValues = [20];
    const checked = verifyChain(doctored);
    expect(checked.valid).toBe(false);
    expect(checked.brokenAt).toBe(1);
  });

  it('publishes every roll in the audit table, sealing only the hidden ones', () => {
    const s = playableState('封印');
    const table = buildAuditTable(s.rolls);
    expect(table.length).toBe(s.rolls.length);
    expect(table.some((r) => r.sealed && r.display === SEALED_ROLL_DISPLAY)).toBe(true);
    for (const row of table) {
      expect(row.recordId).toMatch(/^QL-\d{4}$/);
      if (!row.sealed) expect(row.display).toMatch(/^\d+$/);
    }
  });

  it('orders the realms so that gates compare correctly', () => {
    expect(realmAtLeast('tongxuan', 'chen')).toBe(true);
    expect(realmAtLeast('chen', 'chen')).toBe(true);
    expect(realmAtLeast('chen', 'tianren')).toBe(false);
    expect(realmAtLeast('nonsense', 'chen')).toBe(false);
  });

  it('rolls a turn back rather than committing a state that breaks an invariant', () => {
    const s = rich();
    // 修为 above its own ceiling is unreachable in play; force it and confirm
    // the writer refuses to hand the state on.
    const broken = withCharacter(s, { coin: -50 });
    expect(checkInvariants(broken)).not.toBeNull();
    const out = runCommand(broken, { kind: 'cultivate' });
    expect(out.accepted).toBe(false);
    expect(out.state).toBe(broken);
    expect(out.notices[0]!.text).toContain('弈者不容');
  });
});
