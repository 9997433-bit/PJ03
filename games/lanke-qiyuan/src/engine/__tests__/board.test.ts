import { describe, expect, it } from 'vitest';
import {
  availableOpponents,
  BOARD_STYLES,
  handDC,
  openMatch,
  playHand,
  resign,
  SEAL_FROM_HAND,
  STYLE_HELP,
} from '../board';
import { getOpponent } from '@/data/opponents';
import { playableState, withCharacter } from './helpers';
import type { GameState } from '../types';

/** A state sitting across the board from 茶馆老张, purse full enough to play. */
function seated(seed = '弈道-1'): GameState {
  const s = withCharacter(playableState(seed), { coin: 500, spirit: 90, maxSpirit: 90 });
  const opened = openMatch(s, 'chaguan_laozhang');
  expect(opened.ok).toBe(true);
  return s;
}

describe('弈道 — opening a match', () => {
  it('offers only opponents who sit at the place you are standing in', () => {
    const s = withCharacter(playableState(), { coin: 500 });
    const here = availableOpponents(s);
    expect(here.length).toBeGreaterThan(0);
    expect(here.every((o) => o.title.startsWith('宁安县'))).toBe(true);
  });

  it('refuses an opponent who is somewhere else entirely', () => {
    const s = withCharacter(playableState(), { coin: 500 });
    expect(openMatch(s, 'chuanjia_wu').ok).toBe(false);
    expect(s.match).toBeNull();
  });

  it('refuses an unknown opponent id without touching the phase', () => {
    const s = withCharacter(playableState(), { coin: 500 });
    const out = openMatch(s, 'nobody_at_all');
    expect(out.ok).toBe(false);
    expect(s.phase).toBe('playing');
  });

  it('refuses when the stake is beyond the purse', () => {
    const s = withCharacter(playableState(), { coin: 1 });
    const out = openMatch(s, 'chaguan_laozhang');
    expect(out.ok).toBe(false);
    expect(out.message).toContain('彩头');
  });

  it('refuses when 心神 is too low to sit down', () => {
    const s = withCharacter(playableState(), { coin: 500, spirit: 4 });
    expect(openMatch(s, 'chaguan_laozhang').ok).toBe(false);
  });

  it('refuses an opponent above your 境界', () => {
    const s = withCharacter(playableState(), { coin: 5000 });
    s.placeId = 'yunhai';
    expect(openMatch(s, 'yunhai_weiqi').ok).toBe(false);
  });

  it('enters the match phase with a zeroed 目数 and full hand count', () => {
    const s = seated();
    expect(s.phase).toBe('match');
    expect(s.match?.margin).toBe(0);
    expect(s.match?.hand).toBe(1);
    expect(s.match?.hands).toBe(getOpponent('chaguan_laozhang')?.hands);
  });

  it('will not open a second board while one is still running', () => {
    const s = seated();
    expect(openMatch(s, 'shudong_axiao').ok).toBe(false);
  });
});

describe('弈道 — the five 棋风', () => {
  it('names and documents exactly five styles', () => {
    expect(BOARD_STYLES).toHaveLength(5);
    for (const style of BOARD_STYLES) expect(STYLE_HELP[style].length).toBeGreaterThan(4);
  });

  it('scales the exchange DC off opponent strength', () => {
    const weak = getOpponent('chaguan_laozhang')!;
    const strong = getOpponent('yunhai_weiqi')!;
    expect(handDC(strong)).toBeGreaterThan(handDC(weak));
    expect(handDC(weak)).toBe(8 + Math.round(weak.strength / 3));
  });

  it('spends 心神 and advances the hand counter on a played exchange', () => {
    const s = seated();
    const before = s.character!.spirit;
    const out = playHand(s, '稳守');
    expect(out.ok).toBe(true);
    expect(s.character!.spirit).toBeLessThan(before);
    expect(s.match?.hand).toBe(2);
  });

  it('弃子 always concedes 目数 but arms the 劫', () => {
    const s = seated();
    const out = playHand(s, '弃子');
    expect(out.ok).toBe(true);
    expect(s.match!.margin).toBeLessThan(0);
    expect(s.match!.ko).toBe(true);
  });

  it('spends the armed 劫 on the very next exchange', () => {
    const s = seated();
    playHand(s, '弃子');
    expect(s.match!.ko).toBe(true);
    playHand(s, '稳守');
    expect(s.match!.ko).toBe(false);
  });

  it('试探 hands you 先手', () => {
    const s = seated();
    expect(s.match!.initiative).toBe(false);
    playHand(s, '试探');
    expect(s.match!.initiative).toBe(true);
  });

  it('急攻 consumes the 先手 it was saved for', () => {
    const s = seated();
    playHand(s, '试探');
    playHand(s, '急攻');
    expect(s.match!.initiative).toBe(false);
  });

  it('refuses 封盘 before the third hand', () => {
    const s = seated();
    const out = playHand(s, '封盘');
    expect(out.ok).toBe(false);
    expect(out.message).toContain(String(SEAL_FROM_HAND));
    expect(s.phase).toBe('match');
  });

  it('封盘 settles the board immediately once legal', () => {
    const s = seated();
    playHand(s, '稳守');
    playHand(s, '稳守');
    const out = playHand(s, '封盘');
    expect(out.ok).toBe(true);
    expect(out.matchOver).toBe(true);
    expect(s.match).toBeNull();
    expect(s.phase).toBe('playing');
  });

  it('records every exchange in the match log', () => {
    const s = seated();
    playHand(s, '稳守');
    playHand(s, '试探');
    expect(s.match!.log).toHaveLength(2);
    expect(s.match!.log[0]).toContain('D20');
  });
});

describe('弈道 — settlement', () => {
  it('resigning ends the board, costs the stake and adds 心尘', () => {
    const s = seated();
    const coinBefore = s.character!.coin;
    const dustBefore = s.character!.dust;
    const out = resign(s);
    expect(out.outcome?.result).toBe('resigned');
    expect(s.character!.coin).toBeLessThan(coinBefore);
    expect(s.character!.dust).toBeGreaterThan(dustBefore);
    expect(s.match).toBeNull();
  });

  it('teaches 棋道 even from a loss — losing is also chess', () => {
    const s = seated();
    const daoBefore = s.character!.chessDao;
    resign(s);
    expect(s.character!.chessDao).toBeGreaterThan(daoBefore);
  });

  it('counts every finished match in the life statistics', () => {
    const s = seated();
    expect(s.stats.matchesPlayed).toBe(0);
    resign(s);
    expect(s.stats.matchesPlayed).toBe(1);
  });

  it('resolves a full-length match into exactly one of the four results', () => {
    const s = seated('弈道-终局');
    let out = playHand(s, '稳守');
    while (!out.matchOver) out = playHand(s, '稳守');
    expect(['win', 'loss', 'draw', 'resigned']).toContain(out.outcome!.result);
    expect(s.match).toBeNull();
    expect(s.phase).toBe('playing');
  });

  it('refuses any exchange once no board is open', () => {
    const s = withCharacter(playableState(), { coin: 500 });
    expect(playHand(s, '稳守').ok).toBe(false);
    expect(resign(s).ok).toBe(false);
  });
});
