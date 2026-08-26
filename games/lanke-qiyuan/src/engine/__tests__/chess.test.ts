import { describe, expect, it } from 'vitest';
import { ALL_STYLES, STYLE_HINTS, availableOpponents, boardPower, playHand, resignMatch, startMatch } from '@/engine/chess';
import { executeCommand } from '@/engine/turn';
import { OPPONENTS } from '@/data/opponents';
import { playingState } from './helpers';

describe('弈道 — board power', () => {
  it('is positive for a fresh character', () => {
    expect(boardPower(playingState().character!)).toBeGreaterThan(0);
  });

  it('rises with 棋道 and falls with 心尘', () => {
    const s = playingState();
    const base = boardPower(s.character!);
    s.character!.chessDao += 30;
    const risen = boardPower(s.character!);
    expect(risen).toBeGreaterThan(base);
    s.character!.dust = 80;
    expect(boardPower(s.character!)).toBeLessThan(risen);
  });

  it('counts the manual currently being studied', () => {
    const s = playingState();
    const withManual = boardPower(s.character!);
    s.character!.studyingId = null;
    expect(boardPower(s.character!)).toBeLessThanOrEqual(withManual);
  });
});

describe('弈道 — opponents', () => {
  it('offers only opponents at the current place and realm', () => {
    const s = playingState();
    const here = availableOpponents(s);
    expect(here.length).toBeGreaterThan(0);
    for (const o of here) expect(o.minRealm).toBe('chen');
  });

  it('names five distinct styles, each with a hint', () => {
    expect(new Set(ALL_STYLES).size).toBe(5);
    for (const style of ALL_STYLES) expect(STYLE_HINTS[style].length).toBeGreaterThan(4);
  });

  it('gives every opponent a counter and a weakness that differ', () => {
    for (const o of OPPONENTS) {
      expect(ALL_STYLES).toContain(o.counters);
      expect(ALL_STYLES).toContain(o.weakTo);
      expect(o.counters).not.toBe(o.weakTo);
    }
  });
});

describe('弈道 — running a match', () => {
  it('enters the match phase and records the attempt', () => {
    const s = playingState();
    const before = s.stats.matchesPlayed;
    startMatch(s, 'chaguan_laozhang');
    expect(s.phase).toBe('match');
    expect(s.match?.opponentId).toBe('chaguan_laozhang');
    expect(s.match?.hand).toBe(1);
    expect(s.stats.matchesPlayed).toBe(before + 1);
  });

  it('refuses an opponent who is not here', () => {
    const s = playingState();
    startMatch(s, 'yunhai_weiqi');
    expect(s.phase).toBe('playing');
    expect(s.match).toBeNull();
  });

  it('refuses when the stake is beyond the purse', () => {
    const s = playingState();
    s.character!.coin = 0;
    startMatch(s, 'chaguan_laozhang');
    expect(s.match).toBeNull();
  });

  it('advances one hand per stone and logs it', () => {
    const s = playingState();
    startMatch(s, 'chaguan_laozhang');
    playHand(s, '试探');
    expect(s.match?.hand).toBe(2);
    expect(s.match?.log).toHaveLength(1);
  });

  it('spends two hands on 封盘', () => {
    const s = playingState();
    startMatch(s, 'chaguan_laozhang');
    playHand(s, '封盘');
    expect(s.match?.hand).toBe(3);
  });

  it('arms 劫争 after 弃子', () => {
    const s = playingState();
    startMatch(s, 'chaguan_laozhang');
    playHand(s, '弃子');
    expect(s.match?.ko).toBe(true);
  });

  it('closes the match once the hands run out', () => {
    const s = playingState();
    startMatch(s, 'chaguan_laozhang');
    for (let i = 0; i < 8 && s.phase === 'match'; i++) playHand(s, '稳守');
    expect(s.phase).toBe('playing');
    expect(s.match).toBeNull();
  });

  it('teaches something even when the game is lost', () => {
    const s = playingState();
    // a hopeless position against a strong hand
    s.character!.chessDao = 0;
    s.character!.dust = 90;
    const daoBefore = s.character!.chessDao;
    startMatch(s, 'chaguan_laozhang');
    for (let i = 0; i < 8 && s.phase === 'match'; i++) playHand(s, '急攻');
    expect(s.character!.chessDao).toBeGreaterThanOrEqual(daoBefore);
    expect(s.character!.coin).toBeGreaterThanOrEqual(0);
  });

  it('lets you resign at any point', () => {
    const s = playingState();
    startMatch(s, 'chaguan_laozhang');
    playHand(s, '试探');
    resignMatch(s);
    expect(s.phase).toBe('playing');
    expect(s.match).toBeNull();
  });

  it('never lets a stake push the purse negative', () => {
    const s = playingState();
    s.character!.coin = 6;
    startMatch(s, 'chaguan_laozhang');
    for (let i = 0; i < 8 && s.phase === 'match'; i++) playHand(s, '急攻');
    expect(s.character!.coin).toBeGreaterThanOrEqual(0);
  });

  it('holds the season still until the last stone is played', () => {
    let s = playingState();
    const turn = s.turn;
    s = executeCommand(s, { kind: 'match', opponentId: 'chaguan_laozhang' });
    expect(s.turn).toBe(turn);
    while (s.phase === 'match') s = executeCommand(s, { kind: 'play', style: '稳守' });
    expect(s.turn).toBe(turn);
  });

  it('blocks non-board commands while a match is live', () => {
    let s = playingState();
    s = executeCommand(s, { kind: 'match', opponentId: 'chaguan_laozhang' });
    const before = s.character!.realm.exp;
    s = executeCommand(s, { kind: 'cultivate' });
    expect(s.phase).toBe('match');
    expect(s.character!.realm.exp).toBe(before);
  });

  it('plays out the same way for the same seed', () => {
    const run = () => {
      let s = playingState('棋-match-determinism');
      s = executeCommand(s, { kind: 'match', opponentId: 'chaguan_laozhang' });
      while (s.phase === 'match') s = executeCommand(s, { kind: 'play', style: '急攻' });
      return { coin: s.character!.coin, dao: s.character!.chessDao, hash: s.auditHash };
    };
    expect(run()).toEqual(run());
  });
});
