import { describe, expect, it } from 'vitest';
import {
  allocateAttributes,
  chooseOrigin,
  createNewGame,
  rollHiddenStep,
  rollSpiritRootStep,
  setIdentity,
} from '../creation';
import { executeCommand } from '../turn';
import { parseCommand } from '../commands';
import { deserializeGame, serializeGame } from '../save';
import { NO_WISHING } from '../narrative';
import type { GameState } from '../types';

function makePlayingState(seed: string): GameState {
  let s = createNewGame(seed);
  s = setIdentity(s, '陈平', '男');
  s = chooseOrigin(s, 'scholar');
  s = allocateAttributes(s, { genGu: 7, wuXing: 9, xinXing: 7, qiYun: 7 });
  s = rollSpiritRootStep(s);
  s = rollHiddenStep(s);
  return s;
}

describe('turn — the single writer', () => {
  it('修炼 gains exp, advances the turn and fires the event roll', () => {
    const s0 = makePlayingState('回合-修炼');
    const s1 = executeCommand(s0, { kind: 'cultivate' });

    expect(s1.turn).toBe(s0.turn + 1);
    const progressed =
      s1.character!.realm.exp > s0.character!.realm.exp ||
      s1.character!.realm.realm !== s0.character!.realm.realm;
    expect(progressed).toBe(true);
    expect(s1.rolls.some((r) => r.reason === '遭遇事件')).toBe(true);
    expect(s1.auditHash).not.toBe(s0.auditHash);
    // immutability: the previous state was not touched
    expect(s0.rolls.some((r) => r.reason === '遭遇事件')).toBe(false);
  });

  it('free actions (面板) cost no time and leak no 机缘', () => {
    const s0 = makePlayingState('回合-面板');
    const s1 = executeCommand(s0, { kind: 'panel' });
    expect(s1.turn).toBe(s0.turn);

    const panelEntry = s1.narrativeLog.find((l) => l.text.includes('【命盘】'))!;
    expect(panelEntry).toBeTruthy();
    expect(panelEntry.text).not.toContain('机缘');
    expect(panelEntry.text).toContain('根骨');
    expect(panelEntry.text).toContain('气运');
  });

  it('wishes are refused: 「天道不受愿。」', () => {
    const s0 = makePlayingState('回合-许愿');
    const s1 = executeCommand(s0, parseCommand('我希望获得神器'));
    expect(s1.turn).toBe(s0.turn);
    expect(s1.narrativeLog[s1.narrativeLog.length - 1]!.text).toBe(NO_WISHING);
  });

  it('same seed + same command sequence ⇒ identical playthrough', () => {
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
  });
});

describe('save — versioned, checksummed round trip', () => {
  it('round-trips a mid-game state losslessly', () => {
    let s = makePlayingState('存档-往返');
    s = executeCommand(s, parseCommand('修炼'));
    const raw = serializeGame(s);
    const loaded = deserializeGame(raw);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state).toEqual(s);
    }
  });

  it('detects tampering — 「此界因果紊乱,不可续。」', () => {
    const s = makePlayingState('存档-篡改');
    const raw = serializeGame(s);
    const envelope = JSON.parse(raw) as { payload: string };
    envelope.payload = envelope.payload.replace('"spiritStones":10', '"spiritStones":999999');
    const loaded = deserializeGame(JSON.stringify(envelope));
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe('corrupt');
  });

  it('rejects empty and garbage blobs gracefully', () => {
    expect(deserializeGame(null).ok).toBe(false);
    expect(deserializeGame('not-json').ok).toBe(false);
    expect(deserializeGame('{"v":999,"checksum":"x","payload":"{}"}').ok).toBe(false);
  });
});
