/**
 * gameStore.ts — Zustand store wrapping stubEngine (single runtime path).
 */

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { GameState, SpiritRoot } from '@/engine/types';
import {
  attemptBreakthrough,
  beginCreation,
  brewRecipe,
  buyItem,
  combatAction,
  creationAllocate,
  creationChooseOrigin,
  creationEnterWorld,
  creationHiddenRoll,
  creationRollSpiritRoot,
  resolveEventChoice,
  runCommand,
  sellItem,
  type BreakthroughAttempt,
} from '@/engine/stubEngine';
import { deserializeSave, SAVE_KEY, serializeSave } from '@/engine/save';

export type ContextTab = 'panel' | 'inventory' | 'quests' | 'market' | 'alchemy' | 'audit';

export type BreakthroughFx = BreakthroughAttempt & { realmName: string };

let corruptSaveDetected = false;

const checksummedStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    const result = deserializeSave<GameState>(raw);
    if (!result.ok) {
      corruptSaveDetected = true;
      return null;
    }
    return JSON.stringify({ state: { game: result.state } });
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value) as { state?: { game?: GameState } };
      const game = parsed.state?.game;
      if (game) window.localStorage.setItem(name, serializeSave(game));
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};

export interface GameStore {
  game: GameState | null;
  corruptSave: boolean;
  hydrated: boolean;
  breakthroughFx: BreakthroughFx | null;
  activeTab: ContextTab;

  hydrate: () => void;
  hasSave: () => boolean;
  newGame: () => void;
  continueGame: () => boolean;
  restart: () => void;

  creationChoose: (name: string, gender: '男' | '女', originId: string) => void;
  creationAllocate: (alloc: { genGu: number; wuXing: number; xinXing: number; qiYun: number }) => void;
  creationRollRoot: () => SpiritRoot | null;
  creationFinish: () => void;

  execute: (text: string) => void;
  dispatch: (text: string) => void;
  buy: (itemId: string) => void;
  sell: (itemId: string) => void;
  craft: (recipeId: string) => void;
  eventChoice: (idx: number) => void;
  clearBreakthroughFx: () => void;
  setActiveTab: (tab: ContextTab) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,
      corruptSave: false,
      hydrated: false,
      breakthroughFx: null,
      activeTab: 'panel',

      hydrate: () => set({ hydrated: true, corruptSave: corruptSaveDetected }),

      hasSave: () => {
        const g = get().game;
        return g !== null && g.phase !== 'title';
      },

      newGame: () => set({ game: beginCreation(), corruptSave: false, breakthroughFx: null }),

      continueGame: () => {
        const g = get().game;
        return g !== null && g.phase !== 'title';
      },

      restart: () => {
        if (typeof window !== 'undefined') window.localStorage.removeItem(SAVE_KEY);
        corruptSaveDetected = false;
        set({ game: null, breakthroughFx: null });
      },

      creationChoose: (name, gender, originId) => {
        const g = get().game;
        if (!g) return;
        set({ game: creationChooseOrigin(g, originId, name, gender) });
      },

      creationAllocate: (alloc) => {
        const g = get().game;
        if (!g) return;
        set({ game: creationAllocate(g, alloc) });
      },

      creationRollRoot: () => {
        const g = get().game;
        if (!g) return null;
        const next = creationRollSpiritRoot(g);
        set({ game: next });
        return next.character?.spiritRoot ?? null;
      },

      creationFinish: () => {
        let g = get().game;
        if (!g) return;
        if (g.creationStep === 3) g = creationHiddenRoll(g);
        if (g.creationStep === 4) g = creationEnterWorld(g);
        set({ game: g });
      },

      execute: (text) => {
        const g = get().game;
        if (!g) return;
        const cmd = text.trim();
        if (!cmd) return;

        if (g.phase === 'combat' && ['出手', '术法', '服药', '遁走'].includes(cmd)) {
          set({ game: combatAction(g, cmd as '出手' | '术法' | '服药' | '遁走') });
          return;
        }

        if (cmd === '突破' && g.phase === 'playing') {
          const { state, result } = attemptBreakthrough(g);
          if (result) {
            set({ game: state, breakthroughFx: { ...result, realmName: result.toLabel } });
          } else {
            set({ game: state });
          }
          return;
        }

        const outcome = runCommand(g, cmd);
        const next = { ...outcome.state };
        if (outcome.pendingEvent) next.pendingEvent = outcome.pendingEvent;
        if (outcome.openView) set({ activeTab: outcome.openView });
        set({ game: next });
      },

      dispatch: (text) => get().execute(text),

      buy: (itemId) => {
        const g = get().game;
        if (!g) return;
        set({ game: buyItem(g, itemId) });
      },

      sell: (itemId) => {
        const g = get().game;
        if (!g) return;
        set({ game: sellItem(g, itemId) });
      },

      craft: (recipeId) => {
        const g = get().game;
        if (!g) return;
        const out = brewRecipe(g, recipeId);
        if ('state' in out) set({ game: out.state });
      },

      eventChoice: (idx) => {
        const g = get().game;
        if (!g?.pendingEvent) return;
        const next = resolveEventChoice(g, g.pendingEvent.eventId, idx);
        next.pendingEvent = null;
        set({ game: next });
      },

      clearBreakthroughFx: () => set({ breakthroughFx: null }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => checksummedStorage),
      partialize: (s) => ({ game: s.game }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          state.corruptSave = corruptSaveDetected;
        }
      },
    },
  ),
);
