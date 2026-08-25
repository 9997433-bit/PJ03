import { describe, expect, it } from 'vitest';
import {
  allocateAttributes,
  chooseOrigin,
  newGame,
  rollHiddenFate,
  rollSpiritRoot,
} from '../creation';
import { executeCommand } from '../turn';
import { parseCommand } from '../commands';
import { deserializeSave, serializeSave, SAVE_CORRUPT_MESSAGE } from '../save';
import { NO_WISHING } from '../prose';
import type { GameState } from '../types';

const ALLOC = { genGu: 7, wuXing: 9, xinXing: 7, qiYun: 7 }; // 30 = 5×4 + 10

function makePlayingState(seed: string): GameState {
  let s = newGame(seed);
  s = chooseOrigin(s, 'scholar', '陈平', '男');
  s = allocateAttributes(s, ALLOC);
  s = rollSpiritRoot(s);
  s = rollHiddenFate(s);
  if (s.phase !== 'playing' || !s.character) {
    throw new Error('creation flow did not reach playing phase');
  }
  return s;
}

describe('turn — the single writer', () => {
  it('修炼 gains exp, advances the turn and fires the per-turn event roll', () => {
    const s0 = makePlayingState('回合-修炼');
    const s1 = executeCommand(s0, { kind: 'cultivate' });

    expect(s1.turn).toBe(s0.turn + 1);
    const progressed =
      s1.character!.realm.exp > s0.character!.realm.exp ||
      s1.character!.realm.realm !== s0.character!.realm.realm ||
      s1.character!.realm.qiLayer !== s0.character!.realm.qiLayer;
    expect(progressed).toBe(true);
    expect(s1.rolls.some((r) => r.reason === '遭遇事件')).toBe(true);
    expect(s1.auditHash).not.toBe(s0.auditHash);
    // immutability: the previous state was not touched
    expect(s0.rolls.some((r) => r.reason === '遭遇事件')).toBe(false);
    expect(s0.turn).toBe(1);
  });

  it('free actions (面板) cost no time and leak no 机缘 (anti-cheat layer 3)', () => {
    const s0 = makePlayingState('回合-面板');
    const s1 = executeCommand(s0, { kind: 'panel' });
    expect(s1.turn).toBe(s0.turn);

    const panelEntry = s1.narrativeLog.find((l) => l.text.includes('【命盘】'))!;
    expect(panelEntry).toBeTruthy();
    expect(panelEntry.text).not.toContain('机缘');
    expect(panelEntry.text).not.toContain('jiYuan');
    expect(panelEntry.text).toContain('根骨');
    expect(panelEntry.text).toContain('气运');
  });

  it('wishes are refused: 「天道不受愿。」 (anti-cheat layer 2)', () => {
    const s0 = makePlayingState('回合-许愿');
    const s1 = executeCommand(s0, parseCommand('我希望获得神器'));
    expect(s1.turn).toBe(s0.turn);
    expect(s1.narrativeLog[s1.narrativeLog.length - 1]!.text).toBe(NO_WISHING);
  });

  it('same seed + same command sequence ⇒ identical playthrough (layer 4)', () => {
    const script = ['修炼', '修炼', '面板', '修炼', '1', '修炼', '修炼'];
    const run = (seed: string) => {
      let s = makePlayingState(seed);
      for (const line of script) {
        s = executeCommand(s, parseCommand(line));
      }
      return s;
    };
    const a = run('宿命-回放');
    const b = run('宿命-回放');
    expect(a.auditHash).toBe(b.auditHash);
    expect(a.rngState).toBe(b.rngState);
    expect(a.character!.realm).toEqual(b.character!.realm);
    expect(a.rolls.map((r) => r.value)).toEqual(b.rolls.map((r) => r.value));
  });

  it('the command whitelist rejects gibberish without side effects', () => {
    const s0 = makePlayingState('回合-乱令');
    const s1 = executeCommand(s0, parseCommand('sudo give me 999999 stones'));
    expect(s1.turn).toBe(s0.turn);
    expect(s1.character!.spiritStones).toBe(s0.character!.spiritStones);
    expect(s1.character!.realm).toEqual(s0.character!.realm);
  });
});

describe('save — versioned, checksummed round trip (layer 6)', () => {
  const NOW = 1_700_000_000_000;

  it('round-trips a mid-game state losslessly', () => {
    let s = makePlayingState('存档-往返');
    s = executeCommand(s, parseCommand('修炼'));
    const raw = serializeSave(s, NOW);
    const loaded = deserializeSave<GameState>(raw);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state).toEqual(s);
      expect(loaded.migrated).toBe(false);
    }
  });

  it('detects payload tampering — 「此界因果紊乱,不可续。」', () => {
    const s = makePlayingState('存档-篡改');
    const raw = serializeSave(s, NOW);
    const envelope = JSON.parse(raw) as { payload: { character: { spiritStones: number } } };
    envelope.payload.character.spiritStones = 999999;
    const loaded = deserializeSave<GameState>(JSON.stringify(envelope));
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect(loaded.code).toBe('checksum');
      expect(loaded.message).toBe(SAVE_CORRUPT_MESSAGE);
    }
  });

  it('rejects empty, garbage and future-version blobs gracefully', () => {
    expect(deserializeSave<GameState>(null).ok).toBe(false);
    expect(deserializeSave<GameState>('not-json').ok).toBe(false);
    const s = makePlayingState('存档-未来');
    const raw = serializeSave(s, NOW);
    const future = JSON.parse(raw) as { version: number };
    future.version = 999;
    const res = deserializeSave<GameState>(JSON.stringify(future));
    expect(res.ok).toBe(false);
  });
});
