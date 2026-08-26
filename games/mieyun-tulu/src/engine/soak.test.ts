import { describe, expect, it } from 'vitest';
import { checkInvariants, verifyChain } from './audit';
import { isReadyForBreakthrough } from './cultivation';
import { decodeSave, encodeSave } from './save';
import { CHAIN_WINDOW, execute, type Command } from './turn';
import type { GameState } from './types';
import { newRun } from '@/test/helpers';

/**
 * Long unattended runs. A human takes a hundred turns to reach an ending; these
 * take thousands, across many seeds, and assert the properties that must hold at
 * *every* step rather than at a hand-picked one.
 */

/** A dumb but legal autopilot: always答 the phase it finds itself in. */
function nextCommand(state: GameState): Command {
  if (state.phase === 'combat') {
    if (state.combat?.awaitingSpoils) return { kind: '战利', choice: '搜刮' };
    return { kind: '战斗', action: '出手' };
  }
  if (state.phase === 'event') {
    const options = state.pendingEvent?.options ?? [];
    const pick = options.find((o) => o.affordable) ?? options[0];
    return { kind: '抉择', choiceId: pick?.id ?? 'none' };
  }
  const c = state.character!;
  if (isReadyForBreakthrough(c.realm)) return { kind: '突破' };
  return state.turn % 3 === 0 ? { kind: '探索' } : { kind: '修炼' };
}

/** A player who actually watches the 劫运 meter and pays it down. */
function cautiousCommand(state: GameState): Command {
  if (state.phase === 'combat' || state.phase === 'event') return nextCommand(state);
  const c = state.character!;
  if (c.calamity.value >= 40) return { kind: '化解劫运', mitigation: 'yinNi' };
  return nextCommand(state);
}

interface SoakResult {
  state: GameState;
  steps: number;
  rejections: number;
}

function soak(
  seed: string,
  maxSteps = 600,
  onStep?: (s: GameState) => void,
  policy: (s: GameState) => Command = nextCommand,
): SoakResult {
  let state = newRun(seed);
  let rejections = 0;
  let steps = 0;
  while (!state.ending && steps < maxSteps) {
    const result = execute(state, policy(state));
    steps += 1;
    if (result.rejected) {
      rejections += 1;
      // A stuck autopilot falls back to the one command always available.
      const fallback = execute(state, { kind: '修炼' });
      if (fallback.rejected) break;
      state = fallback.state;
    } else {
      state = result.state;
    }
    onStep?.(state);
  }
  return { state, steps, rejections };
}

const SEEDS = ['soak-1', 'soak-2', 'soak-3', 'soak-4', 'soak-5', 'soak-6', 'soak-7', 'soak-8'];

describe('soak · 长跑', () => {
  it('never breaks an invariant across eight full lifetimes', () => {
    for (const seed of SEEDS) {
      let violation: string | null = null;
      const { state } = soak(seed, 600, (s) => {
        violation ??= checkInvariants(s);
      });
      expect(violation, `${seed}: ${violation}`).toBeNull();
      expect(checkInvariants(state)).toBeNull();
    }
  });

  it('reaches an ending on every seed rather than running forever', () => {
    for (const seed of SEEDS) {
      const { state } = soak(seed, 1200);
      expect(state.ending, `${seed} never ended`).not.toBeNull();
    }
  });

  it('finds several different endings across seeds and policies', () => {
    const ids = new Set([
      ...SEEDS.map((s) => soak(s, 1200).state.ending?.id),
      ...SEEDS.map((s) => soak(s, 1200, undefined, cautiousCommand).state.ending?.id),
    ]);
    expect(ids.size).toBeGreaterThan(1);
  });

  it('rewards watching the 劫运 meter — the cautious policy dies of it less often', () => {
    const doomed = (policy: (s: GameState) => Command) =>
      SEEDS.filter((s) => soak(s, 1200, undefined, policy).state.ending?.id === 'tianzhu').length;
    expect(doomed(cautiousCommand)).toBeLessThanOrEqual(doomed(nextCommand));
  });

  it('keeps the autopilot mostly legal — the whitelist is not fighting it', () => {
    const { steps, rejections } = soak('soak-legal', 400);
    expect(rejections / Math.max(1, steps)).toBeLessThan(0.15);
  });

  it('refuses every command once the run has ended', () => {
    const { state } = soak('soak-dead', 1200);
    expect(state.ending).not.toBeNull();
    for (const cmd of ['修炼', '突破', '探索'] as const) {
      expect(execute(state, { kind: cmd }).rejected).toBeTruthy();
    }
  });

  it('is reproducible — the same seed plays the same life twice', () => {
    const a = soak('soak-repro', 1200).state;
    const b = soak('soak-repro', 1200).state;
    expect(a.auditHash).toBe(b.auditHash);
    expect(a.ending?.id).toBe(b.ending?.id);
    expect(a.log.map((l) => l.text)).toEqual(b.log.map((l) => l.text));
  });

  it('grows the ledger monotonically and never reuses a roll id', () => {
    const { state } = soak('soak-rolls', 600);
    for (let i = 1; i < state.rolls.length; i++) {
      expect(state.rolls[i]!.id).toBeGreaterThan(state.rolls[i - 1]!.id);
    }
  });
});

describe('soak · 链与卷', () => {
  it('bounds the hash chain instead of growing it without limit', () => {
    let longest = 0;
    for (const seed of SEEDS) {
      const { state } = soak(seed, 1200);
      longest = Math.max(longest, state.chain.length);
      expect(state.chain.length).toBeLessThanOrEqual(CHAIN_WINDOW);
    }
    expect(longest).toBeGreaterThan(0);
  });

  it('keeps a trimmed chain verifiable against its recorded base', () => {
    const { state } = soak('soak-trim', 1200);
    expect(verifyChain(state.chain, state.chainBase).valid).toBe(true);
    expect(state.chain.at(-1)?.hash).toBe(state.auditHash);
  });

  it('round-trips a save at any point in a long run', () => {
    let state = newRun('soak-save');
    for (let i = 0; i < 250 && !state.ending; i++) {
      const r = execute(state, nextCommand(state));
      state = r.rejected ? execute(state, { kind: '修炼' }).state : r.state;
      if (i % 50 === 0) {
        const loaded = decodeSave(encodeSave(state));
        expect(loaded.ok, `turn ${state.turn} failed to load`).toBe(true);
      }
    }
    expect(decodeSave(encodeSave(state)).ok).toBe(true);
  });

  it('still rejects tampering after the chain has been trimmed', () => {
    const { state } = soak('soak-tamper', 1200);
    const envelope = JSON.parse(encodeSave(state));
    envelope.state.chain[0].rollValues = [99];
    expect(decodeSave(JSON.stringify(envelope)).ok).toBe(false);
  });
});
