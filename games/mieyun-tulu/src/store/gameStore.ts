/**
 * gameStore.ts — the thin shell around the engine
 *
 * The store holds one `GameState` and forwards commands. It contains no rules:
 * every transition is produced by `engine/turn.execute` or by a creation-step
 * function, and the store's only jobs are keeping the latest state, surfacing
 * the rejection message when the engine refuses, and autosaving.
 *
 * That separation is why the whole simulation is testable without React, and
 * why the UI can never disagree with the engine about what is legal.
 */

import { create } from 'zustand';
import {
  beginCreation,
  drawDestiny,
  finishCreation,
  initialState,
  submitAllocation,
  submitName,
  submitOrigin,
} from '@/engine/creation';
import { generateSeed } from '@/engine/rng';
import { browserStorage, clearSave, persist, restore } from '@/engine/save';
import { execute, type Command } from '@/engine/turn';
import type { Attributes, GameState, TurnResult } from '@/engine/types';

export interface GameStore {
  state: GameState;
  /** Last engine rejection or storage message, shown as a transient banner. */
  notice: string | null;
  /** True once the first client-side render has attempted a save restore. */
  hydrated: boolean;
  hasSave: boolean;

  hydrate: () => void;
  dismissNotice: () => void;

  newGame: (seed?: string) => void;
  begin: () => void;
  setName: (name: string, gender: '男' | '女') => void;
  setOrigin: (originId: string) => void;
  setAllocation: (allocation: Attributes) => void;
  draw: () => void;
  enterWorld: () => void;

  dispatch: (command: Command) => void;
  saveNow: () => void;
  loadSave: () => void;
  abandon: () => void;
}

const storage = () => browserStorage();

function apply(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  result: TurnResult,
): void {
  if (result.rejected) {
    set({ notice: result.rejected });
    return;
  }
  const saved = persist(storage(), result.state);
  set({ state: result.state, notice: null, hasSave: saved || get().hasSave });
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: initialState('图-序'),
  notice: null,
  hydrated: false,
  hasSave: false,

  hydrate: () => {
    if (get().hydrated) return;
    const loaded = restore(storage());
    if (loaded.ok) {
      set({ state: loaded.state, hydrated: true, hasSave: true });
    } else {
      set({
        state: initialState(generateSeed()),
        hydrated: true,
        hasSave: false,
        notice: loaded.reason === '无存档。' ? null : loaded.reason,
      });
    }
  },

  dismissNotice: () => set({ notice: null }),

  newGame: (seed) => {
    const fresh = initialState(seed ?? generateSeed());
    clearSave(storage());
    set({ state: fresh, notice: null, hasSave: false });
  },

  begin: () => apply(set, get, beginCreation(get().state)),
  setName: (name, gender) => apply(set, get, submitName(get().state, name, gender)),
  setOrigin: (originId) => apply(set, get, submitOrigin(get().state, originId)),
  setAllocation: (allocation) => apply(set, get, submitAllocation(get().state, allocation)),
  draw: () => apply(set, get, drawDestiny(get().state)),
  enterWorld: () => apply(set, get, finishCreation(get().state)),

  dispatch: (command) => apply(set, get, execute(get().state, command)),

  saveNow: () => {
    const ok = persist(storage(), get().state);
    set({ notice: ok ? '已录入图录。' : '此处无存档之所。', hasSave: ok });
  },

  loadSave: () => {
    const loaded = restore(storage());
    if (loaded.ok) set({ state: loaded.state, notice: '续读前卷。' });
    else set({ notice: loaded.reason });
  },

  abandon: () => {
    clearSave(storage());
    set({ state: initialState(generateSeed()), notice: '前卷已焚。', hasSave: false });
  },
}));
