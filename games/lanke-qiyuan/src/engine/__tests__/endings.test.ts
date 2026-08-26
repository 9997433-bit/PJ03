import { describe, expect, it } from 'vitest';
import {
  allEndingIds,
  checkLivingEndings,
  chooseDeathEnding,
  ENDING_TRIGGERS,
  finishGame,
  isPastLifespan,
  lifespanOf,
  reachableEndingIds,
} from '../endings';
import { ENDINGS, getEnding } from '@/data/endings';
import { MANUALS } from '@/data/manuals';
import { PLACES } from '@/data/places';
import { executeCommand } from '../turn';
import { MAX_CHESS_DAO, MAX_DUST } from '../types';
import { playableState, withCharacter } from './helpers';
import type { GameState } from '../types';

/**
 * Builds the minimal state that fires one named trigger. Each patch is written
 * so the triggers ahead of it in the scan order stay false — proving the
 * ending is reachable and not occluded by a neighbour.
 */
const SETUPS: Record<string, (s: GameState) => GameState> = {
  end_tianren: (s) => {
    s.character!.realm.realm = 'tianren';
    return s;
  },
  end_wuzi: (s) =>
    withCharacter(s, { manuals: ['manual_tianpu_wuzi'], chessDao: MAX_CHESS_DAO }),
  end_shouping: (s) =>
    withCharacter(s, { flags: { ...s.character!.flags, 接过棋台: true } }),
  end_lanke: (s) => {
    const next = withCharacter(s, { chessDao: 90 });
    next.character!.realm.realm = 'tongxuan';
    next.seenEvents.push('ev_lanke_ju');
    return next;
  },
  end_zuowang: (s) => {
    const next = withCharacter(s, {
      dust: 2,
      flags: { ...s.character!.flags, 坐忘次数: 30 },
    });
    next.character!.realm.realm = 'zuowang';
    return next;
  },
  end_qiyou: (s) => {
    const next = structuredClone(s);
    for (const id of Object.keys(next.spirits).slice(0, 8)) next.spirits[id]!.favor = 60;
    return next;
  },
  end_shanshui: (s) => withCharacter(s, { visited: PLACES.map((p) => p.id) }),
  end_wenzhang: (s) =>
    withCharacter(s, {
      manuals: MANUALS.filter((m) => m.id !== 'manual_tianpu_wuzi').slice(0, 9).map((m) => m.id),
      attributes: { ...s.character!.attributes, caiXue: 16 },
    }),
  end_chenman: (s) => withCharacter(s, { dust: MAX_DUST }),
  end_shenhun: (s) => withCharacter(s, { flags: { ...s.character!.flags, 枯坐: 6 } }),
  end_qisheng: (s) => {
    const next = withCharacter(s, { chessDao: 92 });
    next.stats.matchesWon = 24;
    return next;
  },
  end_zhihei: (s) =>
    withCharacter(s, { dust: 62, flags: { ...s.character!.flags, 旧债未清: true } }),
  end_gudeng: (s) => {
    const next = structuredClone(s);
    const first = Object.keys(next.spirits)[0]!;
    next.spirits[first]!.favor = 95;
    return next;
  },
  end_guoshou: (s) => {
    const next = structuredClone(s);
    next.stats.matchesWon = 14;
    return next;
  },
  end_shouzhong: (s) => withCharacter(s, { dust: 10, chessDao: 55 }),
  end_wuming: (s) => withCharacter(s, { dust: 80, chessDao: 3 }),
};

describe('结局 — the trigger table', () => {
  it('ships twelve endings', () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(10);
    expect(ENDINGS).toHaveLength(12);
  });

  it('wires every authored ending to exactly one trigger — no decoration', () => {
    const triggers = reachableEndingIds().sort();
    expect(triggers).toEqual(allEndingIds().sort());
    expect(ENDING_TRIGGERS).toHaveLength(ENDINGS.length);
  });

  it('gives every ending a title, an epitaph, a closing and a rank', () => {
    for (const e of ENDINGS) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.epitaph.length).toBeGreaterThan(0);
      expect(e.closing.length).toBeGreaterThan(8);
      expect(['天', '地', '玄', '黄']).toContain(e.rank);
    }
  });

  it('uses unique ids throughout', () => {
    expect(new Set(allEndingIds()).size).toBe(ENDINGS.length);
  });

  it('documents a human-readable condition for every trigger', () => {
    for (const t of ENDING_TRIGGERS) expect(t.condition.length).toBeGreaterThan(2);
  });

  it('keeps a catch-all death trigger last so no life ends unnamed', () => {
    const deaths = ENDING_TRIGGERS.filter((t) => t.kind === 'death');
    expect(deaths.length).toBeGreaterThan(0);
    expect(deaths[deaths.length - 1]!.id).toBe('end_wuming');
  });
});

describe('结局 — reachability', () => {
  it.each(ENDING_TRIGGERS.filter((t) => t.kind === 'living').map((t) => t.id))(
    'living ending %s fires from a state a player can actually reach',
    (id) => {
      const setup = SETUPS[id];
      expect(setup).toBeDefined();
      const s = setup!(playableState(`结局-${id}`));
      expect(checkLivingEndings(s)).toBe(id);
    },
  );

  it.each(ENDING_TRIGGERS.filter((t) => t.kind === 'death').map((t) => t.id))(
    'death ending %s is selected when 寿元 runs out in that shape',
    (id) => {
      const setup = SETUPS[id];
      expect(setup).toBeDefined();
      const s = setup!(playableState(`寿终-${id}`));
      expect(chooseDeathEnding(s)).toBe(id);
    },
  );

  it('returns null while nothing has closed the story', () => {
    expect(checkLivingEndings(playableState())).toBeNull();
  });

  it('falls back to 无名 rather than throwing on a stateless death', () => {
    const s = playableState();
    s.character = null;
    expect(chooseDeathEnding(s)).toBe('end_wuming');
  });
});

describe('结局 — closing the scroll', () => {
  it('writes the ending, seals the phase and clears any pending state', () => {
    const s = SETUPS.end_chenman!(playableState('封卷'));
    const result = finishGame(s, 'end_chenman');
    expect(result?.id).toBe('end_chenman');
    expect(s.phase).toBe('ended');
    expect(s.ending?.title).toBe(getEnding('end_chenman')!.title);
    expect(s.pendingEvent).toBeNull();
    expect(s.match).toBeNull();
  });

  it('is idempotent — a second call cannot overwrite the first ending', () => {
    const s = playableState('两次');
    finishGame(s, 'end_shanshui');
    const again = finishGame(s, 'end_tianren');
    expect(again?.id).toBe('end_shanshui');
  });

  it('falls back to 无名 for an ending id that does not exist', () => {
    const s = playableState('无此结局');
    expect(finishGame(s, 'end_nonsense')?.id).toBe('end_wuming');
  });

  it('summarises the life in the closing scroll', () => {
    const s = playableState('小结');
    const result = finishGame(s, 'end_wuming');
    expect(result!.summary.length).toBeGreaterThanOrEqual(8);
    expect(result!.summary.join('\n')).toContain('享年');
    expect(result!.summary.join('\n')).toContain('棋道');
  });

  it('records the closing lines in the narrative scroll', () => {
    const s = playableState('落幕');
    const before = s.narrativeLog.length;
    finishGame(s, 'end_shouzhong');
    expect(s.narrativeLog.length).toBeGreaterThan(before + 2);
  });
});

describe('寿元 — the lifespan clock', () => {
  it('reports the realm lifespan for the panel', () => {
    expect(lifespanOf(playableState())).toBeGreaterThan(0);
  });

  it('only reads as past lifespan once age exceeds it', () => {
    const s = playableState();
    expect(isPastLifespan(s)).toBe(false);
    const old = withCharacter(s, { age: s.character!.lifespan + 1 });
    expect(isPastLifespan(old)).toBe(true);
  });

  it('closes the life through the turn pipeline when a living trigger fires', () => {
    const s = withCharacter(SETUPS.end_shanshui!(playableState('走遍')), {
      coin: 300,
      spirit: 90,
    });
    const out = executeCommand(s, '坐忘');
    expect(out.endingId).toBe('end_shanshui');
    expect(out.state.phase).toBe('ended');
  });
});
