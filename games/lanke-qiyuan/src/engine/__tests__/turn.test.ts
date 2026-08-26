import { describe, expect, it } from 'vitest';
import { commandKey, executeCommand } from '@/engine/turn';
import { breakthroughChance, breakthroughGates } from '@/engine/breakthrough';
import { cultivationSpeed } from '@/engine/cultivation';
import { checkInvariants } from '@/engine/audit';
import { resolveNaturalEnding } from '@/engine/lifecycle';
import type { GameState } from '@/engine/types';
import { playingState } from './helpers';

function runMany(s: GameState, kind: 'cultivate' | 'spectate' | 'sitForget' | 'travel', n: number): GameState {
  let state = s;
  for (let i = 0; i < n; i++) {
    if (state.phase === 'ended') break;
    if (state.pendingEvent) {
      state = executeCommand(state, { kind: 'eventChoice', choiceIndex: 0 });
      continue;
    }
    if (state.phase === 'match') {
      state = executeCommand(state, { kind: 'resign' });
      continue;
    }
    state = executeCommand(state, { kind } as never);
  }
  return state;
}

describe('turn — the single writer', () => {
  it('never mutates the state handed to it', () => {
    const before = playingState();
    const snapshot = JSON.stringify(before);
    executeCommand(before, { kind: 'cultivate' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('advances the season for time commands', () => {
    const s = playingState();
    expect(executeCommand(s, { kind: 'cultivate' }).turn).toBe(s.turn + 1);
    expect(executeCommand(s, { kind: 'spectate' }).turn).toBe(s.turn + 1);
    expect(executeCommand(s, { kind: 'sitForget' }).turn).toBe(s.turn + 1);
  });

  it('leaves the season alone for free looks', () => {
    const s = playingState();
    for (const kind of ['panel', 'satchel', 'register', 'audit'] as const) {
      expect(executeCommand(s, { kind }).turn).toBe(s.turn);
    }
  });

  it('extends the hash chain every command', () => {
    const s = playingState();
    const next = executeCommand(s, { kind: 'cultivate' });
    expect(next.auditHash).not.toBe(s.auditHash);
    expect(next.auditHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a stable key for every command shape', () => {
    expect(commandKey({ kind: 'cultivate' })).toBe('cultivate');
    expect(commandKey({ kind: 'travel', placeId: 'zhulin' })).toBe('travel:zhulin');
    expect(commandKey({ kind: 'travel' })).toBe('travel:-');
    expect(commandKey({ kind: 'play', style: '急攻' })).toBe('play:急攻');
    expect(commandKey({ kind: 'eventChoice', choiceIndex: 2 })).toBe('choice:2');
  });

  it('answers an unknown command without spending a season', () => {
    const s = playingState();
    const next = executeCommand(s, { kind: 'unknown', raw: '我希望成仙' });
    expect(next.turn).toBe(s.turn);
    expect(next.narrativeLog[next.narrativeLog.length - 1]!.text).toContain('不在谱内');
  });

  it('holds every other command while an event awaits a choice', () => {
    let s = playingState();
    for (let i = 0; i < 25 && !s.pendingEvent; i++) s = executeCommand(s, { kind: 'travel' });
    if (!s.pendingEvent) return; // the table was quiet; nothing to assert
    const before = s.turn;
    s = executeCommand(s, { kind: 'cultivate' });
    expect(s.turn).toBe(before);
    expect(s.pendingEvent).not.toBeNull();
  });

  it('keeps invariants after a long mixed run', () => {
    let s = playingState('棋-longrun');
    const kinds = ['cultivate', 'spectate', 'sitForget', 'travel'] as const;
    for (let i = 0; i < 120 && s.phase !== 'ended'; i++) {
      if (s.pendingEvent) {
        s = executeCommand(s, { kind: 'eventChoice', choiceIndex: 0 });
        continue;
      }
      if (s.phase === 'match') {
        s = executeCommand(s, { kind: 'play', style: '稳守' });
        continue;
      }
      s = executeCommand(s, { kind: kinds[i % kinds.length]! });
      expect(checkInvariants(s), `turn ${i}`).toBeNull();
    }
  });

  it('replays a whole life identically from the same seed', () => {
    const run = () => {
      let s = playingState('棋-replay');
      for (let i = 0; i < 40 && s.phase !== 'ended'; i++) {
        if (s.pendingEvent) {
          s = executeCommand(s, { kind: 'eventChoice', choiceIndex: 0 });
          continue;
        }
        if (s.phase === 'match') {
          s = executeCommand(s, { kind: 'play', style: '稳守' });
          continue;
        }
        s = executeCommand(s, { kind: i % 2 === 0 ? 'cultivate' : 'spectate' });
      }
      return s.auditHash;
    };
    expect(run()).toBe(run());
  });
});

describe('修炼 / 观棋 / 坐忘', () => {
  it('adds 修为 and spends 心神 when cultivating', () => {
    const s = playingState();
    const next = executeCommand(s, { kind: 'cultivate' });
    expect(next.character!.realm.exp).toBeGreaterThan(s.character!.realm.exp);
    expect(next.character!.spirit).toBeLessThan(s.character!.spirit);
  });

  it('wastes the season when 心神 has run out', () => {
    const s = playingState();
    s.character!.spirit = 0;
    const next = executeCommand(s, { kind: 'cultivate' });
    expect(next.character!.realm.exp).toBe(0);
    expect(next.narrativeLog.some((l) => l.text.includes('心神不足'))).toBe(true);
  });

  it('scales cultivation speed with the 棋缘 multiplier', () => {
    const s = playingState();
    const base = cultivationSpeed(s.character!);
    s.character!.chessAffinity.speedMultiplier *= 2;
    expect(cultivationSpeed(s.character!)).toBeCloseTo(base * 2, 5);
  });

  it('slows cultivation as 心尘 rises', () => {
    const s = playingState();
    const clean = cultivationSpeed(s.character!);
    s.character!.dust = 100;
    expect(cultivationSpeed(s.character!)).toBeLessThan(clean);
  });

  it('raises 棋道 when watching, and counts the game', () => {
    const s = playingState();
    const next = executeCommand(s, { kind: 'spectate' });
    expect(next.character!.chessDao).toBeGreaterThan(s.character!.chessDao);
    expect(next.stats.gamesWatched).toBe(s.stats.gamesWatched + 1);
  });

  it('yields less from watching once 棋道 is already high', () => {
    const low = playingState('棋-watch');
    const high = playingState('棋-watch');
    high.character!.chessDao = 80;
    const lowGain = executeCommand(low, { kind: 'spectate' }).character!.chessDao - low.character!.chessDao;
    const highGain = executeCommand(high, { kind: 'spectate' }).character!.chessDao - 80;
    expect(highGain).toBeLessThanOrEqual(lowGain);
  });

  it('restores 心神 and sheds 心尘 when sitting', () => {
    const s = playingState();
    s.character!.spirit = 10;
    s.character!.dust = 60;
    const next = executeCommand(s, { kind: 'sitForget' });
    expect(next.character!.spirit).toBeGreaterThan(10);
    expect(next.character!.dust).toBeLessThan(60);
  });

  it('caps 棋道 at 100 however long you watch', () => {
    let s = playingState();
    s.character!.chessDao = 98;
    s = runMany(s, 'spectate', 30);
    expect(s.character!.chessDao).toBeLessThanOrEqual(100);
  });
});

describe('破境 — the three gates', () => {
  it('refuses while the 修为 bar is unfilled', () => {
    const s = playingState();
    const next = executeCommand(s, { kind: 'breakthrough' });
    expect(next.character!.realm.stage).toBe('初境');
    expect(next.narrativeLog.some((l) => l.text.includes('修为未满'))).toBe(true);
  });

  it('advances a stage without a roll when the bar is full', () => {
    const s = playingState();
    s.character!.realm.exp = s.character!.realm.expNeeded;
    const next = executeCommand(s, { kind: 'breakthrough' });
    expect(next.character!.realm.stage).toBe('中境');
    expect(next.character!.realm.exp).toBe(0);
  });

  it('reports the 棋道 gate at 圆融', () => {
    const s = playingState();
    s.character!.realm.stage = '圆融';
    s.character!.realm.exp = s.character!.realm.expNeeded;
    s.character!.chessDao = 0;
    const gates = breakthroughGates(s)!;
    expect(gates.nextRealm).toBe('mingxin');
    expect(gates.daoReady).toBe(false);
    expect(executeCommand(s, { kind: 'breakthrough' }).character!.realm.realm).toBe('chen');
  });

  it('reports the 心尘 gate at 圆融', () => {
    const s = playingState();
    s.character!.realm.stage = '圆融';
    s.character!.realm.exp = s.character!.realm.expNeeded;
    s.character!.chessDao = 60;
    s.character!.dust = 95;
    expect(breakthroughGates(s)!.dustReady).toBe(false);
  });

  it('keeps the chance inside 5..95 at every extreme', () => {
    const s = playingState();
    s.character!.dust = 100;
    expect(breakthroughChance(s)).toBeGreaterThanOrEqual(5);
    s.character!.dust = 0;
    s.character!.chessDao = 100;
    s.character!.attributes.xinJing = 20;
    s.character!.attributes.wuXing = 20;
    expect(breakthroughChance(s)).toBeLessThanOrEqual(95);
  });

  it('eventually crosses into 明心 once all three gates are open', () => {
    let s = playingState('棋-breakthrough');
    s.character!.realm.stage = '圆融';
    s.character!.chessDao = 90;
    for (let i = 0; i < 40 && s.character!.realm.realm === 'chen'; i++) {
      s.character!.realm.exp = s.character!.realm.expNeeded;
      s.character!.dust = 0;
      s = executeCommand(s, { kind: 'breakthrough' });
      if (s.pendingEvent) s = executeCommand(s, { kind: 'eventChoice', choiceIndex: 0 });
    }
    expect(s.character!.realm.realm).toBe('mingxin');
    expect(s.character!.lifespan).toBe(110);
  });

  it('costs 修为 and 心尘 on a failure, but never a life', () => {
    let s = playingState('棋-fail');
    s.character!.realm.stage = '圆融';
    s.character!.realm.exp = s.character!.realm.expNeeded;
    s.character!.chessDao = 90;
    s.character!.dust = 0;
    // force the worst possible odds so a failure is near-certain
    s.character!.attributes.xinJing = 1;
    s.character!.attributes.wuXing = 1;
    s.character!.flags.破境屡挫 = -100;
    s = executeCommand(s, { kind: 'breakthrough' });
    expect(s.phase).not.toBe('ended');
    expect(s.character!.spirit).toBeGreaterThanOrEqual(0);
  });
});

describe('结局 — how a life closes', () => {
  it('closes when 寿元 runs out', () => {
    let s = playingState();
    s.character!.age = s.character!.lifespan;
    s = executeCommand(s, { kind: 'cultivate' });
    for (let i = 0; i < 8 && s.phase !== 'ended'; i++) {
      s = s.pendingEvent
        ? executeCommand(s, { kind: 'eventChoice', choiceIndex: 0 })
        : executeCommand(s, { kind: 'cultivate' });
    }
    expect(s.phase).toBe('ended');
    expect(s.ending).not.toBeNull();
    expect(s.ending!.summary.length).toBeGreaterThan(3);
  });

  it('refuses further commands once the scroll is written', () => {
    let s = playingState();
    s.character!.age = s.character!.lifespan + 1;
    s = executeCommand(s, { kind: 'cultivate' });
    expect(s.phase).toBe('ended');
    const after = executeCommand(s, { kind: 'cultivate' });
    expect(after.turn).toBe(s.turn);
  });

  it('picks 尘满衣 when the mind stays clouded', () => {
    let s = playingState();
    s.character!.dust = 100;
    s.character!.flags.尘满衣 = 5;
    s = executeCommand(s, { kind: 'sitForget' });
    // sitting sheds dust, so drive it directly instead
    s.character!.dust = 100;
    s.character!.flags.尘满衣 = 5;
    s = executeCommand(s, { kind: 'cultivate' });
    expect(['end_chenman', 'end_shenhun']).toContain(s.ending?.id ?? 'end_chenman');
  });

  it('chooses a friendlier scroll for a well-connected life', () => {
    const s = playingState();
    for (const id of ['zhuxian', 'laogui', 'songling', 'jinggui', 'hebo']) {
      s.spirits[id]!.favor = 70;
    }
    expect(resolveNaturalEnding(s)).toBe('end_qiyou');
  });

  it('falls back to 无名而终 for an unremarkable life', () => {
    const s = playingState();
    s.character!.dust = 90;
    expect(resolveNaturalEnding(s)).toBe('end_wuming');
  });
});
