import { describe, expect, it } from 'vitest';
import {
  attemptBreakthrough,
  breakthroughChance,
  breakthroughGate,
  BREAKTHROUGH_SPIRIT_COST,
  PITY_CAP,
  PITY_PER_FAILURE,
} from '../breakthrough';
import { playableState, withCharacter } from './helpers';
import { getRealm } from '@/data/realms';
import type { GameState } from '../types';

/** A character sitting at the very edge of 破境, with every gate open. */
function readyToBreak(seed = '破境'): GameState {
  const s = playableState(seed);
  const c = s.character!;
  const def = getRealm(c.realm.realm);
  c.realm.stage = '圆融';
  c.realm.expNeeded = def.expPerStage[2];
  c.realm.exp = c.realm.expNeeded;
  c.chessDao = def.chessDaoGate + 10;
  c.dust = 0;
  c.spirit = c.maxSpirit;
  return s;
}

describe('breakthrough — the three gates', () => {
  it('opens when 圆融, 修为满, 棋道达标 and 心尘 clear', () => {
    expect(breakthroughGate(readyToBreak()).ok).toBe(true);
  });

  it('refuses below 圆融', () => {
    const s = readyToBreak();
    s.character!.realm.stage = '中境';
    expect(breakthroughGate(s).ok).toBe(false);
  });

  it('refuses on an unfilled 修为 bar', () => {
    const s = readyToBreak();
    s.character!.realm.exp = 0;
    const gate = breakthroughGate(s);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('修为');
  });

  it('refuses below the 棋道 gate — grinding cannot buy understanding', () => {
    const s = readyToBreak();
    s.character!.chessDao = 0;
    const gate = breakthroughGate(s);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('棋道');
  });

  it('refuses above the 心尘 ceiling', () => {
    const s = readyToBreak();
    s.character!.dust = 99;
    const gate = breakthroughGate(s);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain('心尘');
  });

  it('refuses when 心神 cannot pay the cost', () => {
    const s = readyToBreak();
    s.character!.spirit = BREAKTHROUGH_SPIRIT_COST - 1;
    expect(breakthroughGate(s).ok).toBe(false);
  });

  it('refuses at the top of the ladder', () => {
    const s = readyToBreak();
    s.character!.realm.realm = 'tianren';
    expect(breakthroughGate(s).ok).toBe(false);
  });

  it('does not roll a die when the gate is shut', () => {
    const s = readyToBreak();
    s.character!.chessDao = 0;
    const rolls = s.rolls.length;
    expect(attemptBreakthrough(s).attempted).toBe(false);
    expect(s.rolls).toHaveLength(rolls);
  });
});

describe('breakthrough — the published odds', () => {
  it('sums to the advertised total', () => {
    const t = breakthroughChance(readyToBreak());
    const sum = t.base + t.chessDaoBonus + t.composureBonus + t.dustPenalty + t.pity + t.itemBonus;
    expect(t.total).toBe(Math.max(3, Math.min(96, sum)));
  });

  it('stays inside 3..96 however extreme the inputs', () => {
    const low = withCharacter(readyToBreak(), { dust: 100, attributes: { xinJing: 1, wuXing: 1, caiXue: 1, qiYun: 1, yuanFa: 1 } });
    const high = withCharacter(readyToBreak(), { chessDao: 100, attributes: { xinJing: 30, wuXing: 1, caiXue: 1, qiYun: 1, yuanFa: 10 } });
    expect(breakthroughChance(low).total).toBeGreaterThanOrEqual(3);
    expect(breakthroughChance(high).total).toBeLessThanOrEqual(96);
  });

  it('rewards 棋道 above the gate', () => {
    const bare = readyToBreak();
    bare.character!.chessDao = getRealm('chen').chessDaoGate;
    const deep = readyToBreak();
    deep.character!.chessDao = getRealm('chen').chessDaoGate + 40;
    expect(breakthroughChance(deep).total).toBeGreaterThan(breakthroughChance(bare).total);
  });

  it('punishes 心尘', () => {
    const clean = readyToBreak();
    const dusty = readyToBreak();
    dusty.character!.dust = 40;
    expect(breakthroughChance(dusty).total).toBeLessThan(breakthroughChance(clean).total);
  });

  it('caps the pity counter', () => {
    const s = readyToBreak();
    s.character!.flags['破境积怨'] = 99;
    expect(breakthroughChance(s).pity).toBe(PITY_CAP);
  });
});

describe('breakthrough — resolution', () => {
  it('advances the realm and refills 心神 on success', () => {
    const s = readyToBreak();
    s.character!.flags['破境加持'] = 90; // guarantee the roll clears
    const out = attemptBreakthrough(s);
    expect(out.attempted).toBe(true);
    expect(out.success).toBe(true);
    expect(s.character!.realm.realm).toBe('mingxin');
    expect(s.character!.realm.stage).toBe('初境');
    expect(s.character!.spirit).toBe(s.character!.maxSpirit);
    expect(s.character!.lifespan).toBe(getRealm('mingxin').lifespan);
  });

  it('clears the pity counter on success', () => {
    const s = readyToBreak();
    s.character!.flags['破境积怨'] = 3;
    s.character!.flags['破境加持'] = 90;
    attemptBreakthrough(s);
    expect(s.character!.flags['破境积怨']).toBe(0);
  });

  it('spends the one-shot item bonus whether it wins or loses', () => {
    const s = readyToBreak();
    s.character!.flags['破境加持'] = 10;
    attemptBreakthrough(s);
    expect(s.character!.flags['破境加持']).toBe(0);
  });

  it('burns 修为, floods 心尘 and raises pity on failure', () => {
    const s = readyToBreak();
    // A chance of 3 makes failure overwhelmingly likely; loop until it lands.
    let failed = false;
    for (let i = 0; i < 20 && !failed; i++) {
      const attempt = readyToBreak(`失手-${i}`);
      attempt.character!.dust = getRealm('chen').dustCeiling;
      attempt.character!.attributes.xinJing = 1;
      const before = attempt.character!.realm.exp;
      const out = attemptBreakthrough(attempt);
      if (out.success === false) {
        failed = true;
        expect(attempt.character!.realm.exp).toBeLessThan(before);
        expect(attempt.stats.breakthroughsFailed).toBe(1);
        expect(Number(attempt.character!.flags['破境积怨'])).toBe(1);
      }
    }
    expect(failed).toBe(true);
  });

  it('adds exactly one pity step per failure', () => {
    const s = readyToBreak();
    s.character!.flags['破境积怨'] = 2;
    expect(breakthroughChance(s).pity).toBe(2 * PITY_PER_FAILURE);
  });

  it('hands the 天人 ending back to the caller rather than ending itself', () => {
    const s = readyToBreak();
    const c = s.character!;
    const def = getRealm('xiaoyao');
    c.realm = { realm: 'xiaoyao', stage: '圆融', exp: def.expPerStage[2], expNeeded: def.expPerStage[2] };
    c.chessDao = 100;
    c.dust = 0;
    c.maxSpirit = 400;
    c.spirit = 400;
    c.flags['破境加持'] = 90;
    const out = attemptBreakthrough(s);
    expect(out.success).toBe(true);
    expect(out.ending).toBe('end_tianren');
    // finishGame is the turn pipeline's job, not breakthrough's.
    expect(s.phase).not.toBe('ended');
  });
});
