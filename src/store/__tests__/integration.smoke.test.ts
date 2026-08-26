import { describe, expect, it } from 'vitest';

import { newGame, chooseOrigin, allocateAttributes, rollSpiritRoot, rollHiddenFate } from '@/engine/creation';
import { parseCommand } from '@/engine/commands';
import { executeCommand } from '@/engine/turn';
import { serializeSave, deserializeSave } from '@/engine/save';
import type { GameState } from '@/engine/types';

describe('store integration path (smoke)', () => {
  it('runs creation → playing → turns → save round-trip exactly as the store does', () => {
    let g = newGame('smoke-seed-1');
    expect(g.phase).toBe('creation');
    expect(Object.keys(g.npcs).length).toBeGreaterThan(0);
    expect(g.quests.length).toBeGreaterThan(0);

    g = chooseOrigin(g, 'farmer', '韩立', '男');
    expect(g.creationStep).toBe(1);

    g = allocateAttributes(g, { genGu: 8, wuXing: 7, xinXing: 7, qiYun: 8 });
    expect(g.creationStep).toBe(2);

    g = rollSpiritRoot(g);
    expect(g.creationStep).toBe(3);

    g = rollHiddenFate(g);
    expect(g.phase).toBe('playing');
    expect(g.character).not.toBeNull();

    // a few turns through the same text → parseCommand → executeCommand path
    for (const text of ['修炼', '修炼', '探索', '面板', '背包', '坊市']) {
      if (g.phase !== 'playing' && g.phase !== 'combat') break;
      if (g.pendingEvent) g = executeCommand(g, parseCommand('1'));
      if (g.phase === 'combat') {
        for (let i = 0; i < 30 && g.phase === 'combat'; i++) {
          g = executeCommand(g, parseCommand('强攻'));
        }
        continue;
      }
      g = executeCommand(g, parseCommand(text));
    }
    expect(g.rolls.length).toBeGreaterThan(0);

    // checksummed persistence round-trip (what checksummedStorage does)
    const raw = serializeSave(g);
    const back = deserializeSave<GameState>(raw);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.state.turn).toBe(g.turn);

    // tampering must be refused
    const tampered = deserializeSave<GameState>(raw.replace('"turn":', '"turn_":'));
    expect(tampered.ok).toBe(false);
  });
});
