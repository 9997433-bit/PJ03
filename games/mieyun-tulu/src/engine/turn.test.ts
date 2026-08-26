import { describe, expect, it } from 'vitest';
import { verifyChain } from './audit';
import { execute, guardFreeText, type Command } from './turn';
import { forceRealm, give, newRun, setCalamity } from '@/test/helpers';
import type { GameState } from './types';

function run(state: GameState, commands: Command[]): GameState {
  let s = state;
  for (const c of commands) s = execute(s, c).state;
  return s;
}

describe('turn · 白名单', () => {
  it('accepts 修炼 while playing', () => {
    const r = execute(newRun('ok'), { kind: '修炼' });
    expect(r.rejected).toBeUndefined();
    expect(r.state.turn).toBe(2);
  });

  it('refuses combat verbs outside a fight', () => {
    const r = execute(newRun('nofight'), { kind: '战斗', action: '出手' });
    expect(r.rejected).toBe('此令不在册。');
  });

  it('refuses ordinary commands during a fight', () => {
    const s = forceRealm(newRun('locked'), 'tongxuan');
    const started = execute(s, { kind: '斗法' }).state;
    if (started.phase === 'combat') {
      const r = execute(started, { kind: '修炼' });
      expect(r.rejected).toBe('斗法之中,唯战与走。');
      expect(r.state).toBe(started);
    }
  });

  it('allows 用物 mid-fight so a losing turn can still be saved', () => {
    const s = give(forceRealm(newRun('pill'), 'tongxuan'), 'huiyuandan', 2);
    const started = execute(s, { kind: '斗法' }).state;
    if (started.phase === 'combat') {
      started.character!.hp = 10;
      const r = execute(started, { kind: '用物', itemId: 'huiyuandan' });
      expect(r.rejected).toBeUndefined();
      expect(r.state.character!.hp).toBeGreaterThan(10);
    }
  });

  it('refuses everything but 抉择 while an event is pending', () => {
    const s = newRun('event-lock');
    s.phase = 'event';
    s.pendingEvent = { eventId: 'd_shanbeng', options: [] };
    expect(execute(s, { kind: '修炼' }).rejected).toBe('事在眼前,先作抉择。');
  });

  it('refuses any command after the run has ended', () => {
    const s = newRun('ended');
    s.phase = 'ended';
    s.ending = {
      id: 'guiyin',
      title: '山中归隐',
      kind: 'retire',
      summary: '',
      closing: '',
      stats: s.stats,
    };
    expect(execute(s, { kind: '修炼' }).rejected).toContain('此生已终');
  });

  it('gates 归隐 behind realm and elapsed time', () => {
    const early = newRun('retire-early');
    expect(execute(early, { kind: '归隐' }).rejected).toBeTruthy();
    const late = forceRealm(newRun('retire-late'), 'tongxuan');
    late.turn = 40;
    expect(execute(late, { kind: '归隐' }).rejected).toBeUndefined();
  });

  it('rejects wishes typed as free text', () => {
    expect(guardFreeText('我想要直接飞升')).toContain('天机不受祈请');
    expect(guardFreeText('god mode')).toBeTruthy();
    expect(guardFreeText('沈无咎')).toBeNull();
  });
});

describe('turn · 顺序与结算', () => {
  it('runs the 劫运 phase before the command body', () => {
    const s = setCalamity(newRun('order'), 80);
    const before = s.rolls.length;
    const next = execute(s, { kind: '修炼' }).state;
    expect(next.rolls[before]!.reason).toBe('劫运判定');
  });

  it('advances the year for turn-costing commands only', () => {
    const s = give(newRun('cost'), 'huiyuandan', 1);
    expect(execute(s, { kind: '用物', itemId: 'huiyuandan' }).state.turn).toBe(s.turn);
    expect(execute(s, { kind: '修炼' }).state.turn).toBe(s.turn + 1);
  });

  it('ages the character exactly one year per turn-costing command', () => {
    const s = newRun('age');
    const next = run(s, [{ kind: '修炼' }, { kind: '修炼' }, { kind: '修炼' }]);
    expect(next.character!.age).toBe(s.character!.age + 3);
  });

  it('defers the year-end upkeep while a fight is unresolved', () => {
    const s = forceRealm(newRun('defer'), 'tongxuan');
    const started = execute(s, { kind: '斗法' }).state;
    if (started.phase === 'combat') {
      expect(started.turn).toBe(s.turn);
      expect(started.character!.flags.pendingUpkeep).toBe(true);
    }
  });

  it('lets a 劫 preempt the command the player chose', () => {
    const s = setCalamity(forceRealm(newRun('preempt'), 'xuanguang'), 99);
    const r = execute(s, { kind: '修炼' });
    if (r.state.phase === 'combat') {
      expect(r.entries.some((l) => l.text.includes('做不成'))).toBe(true);
    }
  });

  it('ticks injuries down and clears them when they expire', () => {
    const s = newRun('heal');
    s.character!.injuries.push({
      id: 'jingmaiSun',
      name: '经脉损',
      severity: 1,
      turnsLeft: 2,
      effect: { cultivation: -0.25 },
    });
    const after = run(s, [{ kind: '修炼' }, { kind: '修炼' }]);
    expect(after.character!.injuries).toHaveLength(0);
  });

  it('wakes the 图录 once all three fragments are carried', () => {
    let s = give(newRun('tulu'), 'tulu1', 1);
    s = give(s, 'tulu2', 1);
    s = give(s, 'tulu3', 1);
    const after = execute(s, { kind: '修炼' }).state;
    expect(after.character!.flags.tuluAll).toBe(true);
  });

  it('punishes an over-scryed life once', () => {
    const s = newRun('overscry');
    s.stats.divinations = 30;
    const after = execute(s, { kind: '修炼' }).state;
    expect(after.character!.flags.tianjiLost).toBe(true);
    const again = execute(after, { kind: '修炼' }).state;
    expect(again.character!.calamity.value).toBeLessThan(
      after.character!.calamity.value + 8,
    );
  });
});

describe('turn · 原子性与哈希链', () => {
  it('leaves the original state untouched on every accepted command', () => {
    const s = newRun('immutable');
    const snapshot = JSON.stringify(s);
    execute(s, { kind: '修炼' });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('returns the identical state object on rejection', () => {
    const s = newRun('reject');
    const r = execute(s, { kind: '战斗', action: '出手' });
    expect(r.state).toBe(s);
    expect(r.entries).toHaveLength(0);
  });

  it('rolls the whole turn back when an invariant would break', () => {
    const s = newRun('invariant');
    s.character!.spiritStones = 10;
    // 万法坊卖 of a nonexistent item is a no-op; force a violation instead.
    s.character!.fortune = 500;
    const r = execute(s, { kind: '修炼' });
    expect(r.rejected).toContain('因果紊乱');
    expect(r.state).toBe(s);
  });

  it('extends the hash chain on every accepted command', () => {
    const s = run(newRun('chain'), [{ kind: '修炼' }, { kind: '修炼' }, { kind: '闭关' }]);
    expect(s.chain).toHaveLength(4);
    expect(verifyChain(s.chain).valid).toBe(true);
  });

  it('detects a chain edited after the fact', () => {
    const s = run(newRun('tamper'), [{ kind: '修炼' }, { kind: '修炼' }]);
    s.chain[1]!.rollValues = [1, 1, 1];
    const check = verifyChain(s.chain);
    expect(check.valid).toBe(false);
    expect(check.brokenAt).toBe(1);
  });

  it('labels each chain link with the command that produced it', () => {
    const s = execute(newRun('label'), { kind: '推演命数', depth: 'shallow' }).state;
    expect(s.chain[s.chain.length - 1]!.command).toBe('推演命数·shallow');
  });

  it('replays byte-identically from the same seed and command list', () => {
    const script: Command[] = [
      { kind: '修炼' },
      { kind: '探索' },
      { kind: '修炼' },
      { kind: '闭关' },
      { kind: '修炼' },
    ];
    const a = run(newRun('replay'), script);
    const b = run(newRun('replay'), script);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('diverges when the command list differs', () => {
    const a = run(newRun('diverge'), [{ kind: '修炼' }, { kind: '修炼' }]);
    const b = run(newRun('diverge'), [{ kind: '闭关' }, { kind: '修炼' }]);
    expect(a.auditHash).not.toBe(b.auditHash);
  });

  it('survives a long unattended run without breaking an invariant', () => {
    let s = newRun('endurance');
    for (let i = 0; i < 120 && !s.ending; i++) {
      const r = execute(s, { kind: i % 3 === 0 ? '探索' : '修炼' });
      if (r.rejected) {
        expect(r.rejected).not.toContain('因果紊乱');
        // A phase lock is fine; resolve it and carry on.
        if (s.phase === 'combat') s = execute(s, { kind: '战斗', action: '出手' }).state;
        else if (s.phase === 'event') {
          const first = s.pendingEvent?.options.find((o) => o.affordable);
          if (first) s = execute(s, { kind: '抉择', choiceId: first.id }).state;
          else break;
        } else break;
      } else {
        s = r.state;
      }
    }
    expect(s.character!.hp).toBeGreaterThanOrEqual(0);
    expect(s.character!.spiritStones).toBeGreaterThanOrEqual(0);
    expect(verifyChain(s.chain).valid).toBe(true);
  });
});
