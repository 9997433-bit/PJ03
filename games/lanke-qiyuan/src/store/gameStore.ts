'use client';

/**
 * gameStore.ts — the only bridge between React and the engine.
 *
 * The UI never mutates game state. It calls an action here, the action calls
 * exactly one engine entry point (`executeCommand` during play, or a creation
 * step before that), and the returned state replaces the old one wholesale.
 * Persistence is a side effect of every successful transition.
 */

import { create } from 'zustand';
import type { AllocationInput, BoardStyle, Command, GameState } from '@/engine';
import {
  SAVE_KEY,
  allocateAttributes,
  chooseOrigin,
  clearSave,
  createMemoryStorage,
  executeCommand,
  generateSeed,
  getBrowserStorage,
  loadGame,
  newGame,
  rollChessAffinity,
  saveGame,
  setIdentity,
  type StorageAdapter,
} from '@/engine';

/** Chosen once per session: the real thing in a browser, memory elsewhere. */
let storage: StorageAdapter | null = null;
function getStorage(): StorageAdapter {
  storage ??= getBrowserStorage() ?? createMemoryStorage();
  return storage;
}

export type Screen = 'title' | 'creation' | 'play' | 'ending';

interface GameStore {
  state: GameState | null;
  screen: Screen;
  /** set when a save blob failed verification */
  loadError: string | null;
  hasSave: boolean;

  boot: () => void;
  startNew: (seed?: string) => void;
  continueSaved: () => void;
  abandon: () => void;

  // creation steps
  submitIdentity: (name: string, courtesy: string) => void;
  submitOrigin: (originId: string) => void;
  submitAttributes: (alloc: AllocationInput) => void;
  drawChessAffinity: () => void;

  // play
  run: (cmd: Command) => void;
  cultivate: () => void;
  spectate: () => void;
  sitForget: () => void;
  travel: (placeId?: string) => void;
  openMatch: (opponentId?: string) => void;
  playHand: (style: BoardStyle) => void;
  resign: () => void;
  market: () => void;
  buy: (itemId: string, count?: number) => void;
  sell: (itemId: string, count?: number) => void;
  use: (itemId: string) => void;
  gift: (spiritId: string, itemId: string) => void;
  study: (manualId: string) => void;
  learn: (manualId: string) => void;
  breakthrough: () => void;
  choose: (index: number) => void;
}

function screenFor(state: GameState): Screen {
  if (state.phase === 'ended') return 'ending';
  if (state.phase === 'creation') return 'creation';
  return 'play';
}

function persist(state: GameState): void {
  try {
    saveGame(getStorage(), state, SAVE_KEY);
  } catch {
    // A full or unavailable quota must never break a turn.
  }
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Replace the state, persist it, and follow the phase to a screen. */
  const commit = (next: GameState) => {
    persist(next);
    set({ state: next, screen: screenFor(next), hasSave: true });
  };

  /** Run a creation step, which is a pure `GameState → GameState`. */
  const step = (fn: (s: GameState) => GameState) => {
    const current = get().state;
    if (!current) return;
    commit(fn(current));
  };

  return {
    state: null,
    screen: 'title',
    loadError: null,
    hasSave: false,

    boot: () => {
      const result = loadGame<GameState>(getStorage(), SAVE_KEY);
      if (result.ok) {
        set({ hasSave: true, loadError: null });
      } else {
        set({
          hasSave: false,
          loadError: result.code === 'empty' ? null : result.message,
        });
      }
    },

    startNew: (seed) => {
      commit(newGame(seed && seed.trim().length > 0 ? seed.trim() : generateSeed()));
      set({ loadError: null });
    },

    continueSaved: () => {
      const result = loadGame<GameState>(getStorage(), SAVE_KEY);
      if (!result.ok) {
        set({ loadError: result.message, hasSave: false });
        return;
      }
      set({ state: result.state, screen: screenFor(result.state), loadError: null, hasSave: true });
    },

    abandon: () => {
      clearSave(getStorage(), SAVE_KEY);
      set({ state: null, screen: 'title', hasSave: false, loadError: null });
    },

    submitIdentity: (name, courtesy) => step((s) => setIdentity(s, name, courtesy)),
    submitOrigin: (originId) => step((s) => chooseOrigin(s, originId)),
    submitAttributes: (alloc) => step((s) => allocateAttributes(s, alloc)),
    drawChessAffinity: () => step((s) => rollChessAffinity(s)),

    run: (cmd) => step((s) => executeCommand(s, cmd)),

    cultivate: () => get().run({ kind: 'cultivate' }),
    spectate: () => get().run({ kind: 'spectate' }),
    sitForget: () => get().run({ kind: 'sitForget' }),
    travel: (placeId) => get().run({ kind: 'travel', ...(placeId ? { placeId } : {}) }),
    openMatch: (opponentId) => get().run({ kind: 'match', ...(opponentId ? { opponentId } : {}) }),
    playHand: (style) => get().run({ kind: 'play', style }),
    resign: () => get().run({ kind: 'resign' }),
    market: () => get().run({ kind: 'market' }),
    buy: (itemId, count) => get().run({ kind: 'buy', itemId, ...(count ? { count } : {}) }),
    sell: (itemId, count) => get().run({ kind: 'sell', itemId, ...(count ? { count } : {}) }),
    use: (itemId) => get().run({ kind: 'use', itemId }),
    gift: (spiritId, itemId) => get().run({ kind: 'gift', spiritId, itemId }),
    study: (manualId) => get().run({ kind: 'study', manualId }),
    learn: (manualId) => get().run({ kind: 'learn', manualId }),
    breakthrough: () => get().run({ kind: 'breakthrough' }),
    choose: (index) => get().run({ kind: 'eventChoice', choiceIndex: index }),
  };
});
