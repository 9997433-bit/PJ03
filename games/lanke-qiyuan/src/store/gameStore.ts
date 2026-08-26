/**
 * gameStore.ts — the only bridge between React and the engine.
 *
 * The store owns exactly three things: the immutable GameState produced by
 * `turn.ts`, a little ephemeral UI state (toasts, the open side panel, the
 * breakthrough animation), and persistence. Every state transition goes
 * through `executeCommand`, so the "single writer" rule survives contact with
 * the UI layer.
 *
 * Persistence writes the same checksummed envelope the engine defines, under
 * `lanke_save_v1`. A tampered or truncated blob does not crash the app: it
 * sets `corruptSave`, and the title screen offers 重开 only.
 */

'use client';

import { create } from 'zustand';
import {
  deserializeSave,
  serializeSave,
  SAVE_KEY,
  SAVE_CORRUPT_MESSAGE,
  getBrowserStorage,
  exportSave,
  importSave,
} from '@/engine/save';
import { generateSeed } from '@/engine/rng';
import {
  drawChessAffinity,
  newGame,
  setAttributes,
  setName,
  setOrigin,
  type AllocationInput,
} from '@/engine/creation';
import { executeCommand, runCommand, type Notice } from '@/engine/turn';
import type { BoardStyle, GameState } from '@/engine/types';

export type ContextTab = 'panel' | 'satchel' | 'market' | 'register' | 'audit' | 'board' | 'places';

export interface Toast {
  id: number;
  tone: Notice['tone'];
  text: string;
}

export interface BreakthroughFx {
  success: boolean;
  d100: number;
  chance: number;
  backlash: boolean;
}

interface GameStore {
  state: GameState | null;
  hydrated: boolean;
  corruptSave: string | null;
  toasts: Toast[];
  tab: ContextTab;
  breakthroughFx: BreakthroughFx | null;
  lastCommandAt: number;

  hydrate: () => void;
  startNewLife: (seed?: string) => void;
  abandonSave: () => void;

  // creation
  commitName: (name: string, courtesy: string) => boolean;
  commitOrigin: (originId: string) => boolean;
  commitAttributes: (alloc: AllocationInput) => boolean;
  drawAffinity: () => boolean;

  // play
  runTurn: (raw: string) => void;
  chooseEvent: (index: number) => void;
  playStyle: (style: BoardStyle) => void;
  openBoard: (opponentId: string) => void;
  goTo: (placeId: string) => void;

  setTab: (tab: ContextTab) => void;
  dismissToast: (id: number) => void;
  clearBreakthroughFx: () => void;
  exportSaveString: () => string | null;
  importSaveString: (b64: string) => boolean;
}

let toastSeq = 1;

function persist(state: GameState | null): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    if (state === null) storage.removeItem(SAVE_KEY);
    else storage.setItem(SAVE_KEY, serializeSave(state));
  } catch {
    // A full or blocked quota must never break the game loop.
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  hydrated: false,
  corruptSave: null,
  toasts: [],
  tab: 'panel',
  breakthroughFx: null,
  lastCommandAt: 0,

  hydrate: () => {
    if (get().hydrated) return;
    const storage = getBrowserStorage();
    if (!storage) {
      set({ hydrated: true });
      return;
    }
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) {
      set({ hydrated: true });
      return;
    }
    const result = deserializeSave<GameState>(raw);
    if (result.ok) set({ state: result.state, hydrated: true, corruptSave: null });
    else if (result.code === 'empty') set({ hydrated: true });
    else set({ hydrated: true, corruptSave: result.message || SAVE_CORRUPT_MESSAGE });
  },

  startNewLife: (seed?: string) => {
    const state = newGame(seed && seed.trim().length > 0 ? seed.trim() : generateSeed());
    persist(state);
    set({ state, corruptSave: null, toasts: [], tab: 'panel', breakthroughFx: null });
  },

  abandonSave: () => {
    persist(null);
    set({ state: null, corruptSave: null, toasts: [] });
  },

  // ---- creation --------------------------------------------------------
  commitName: (name, courtesy) => applyCreation(set, get, (s) => setName(s, name, courtesy)),
  commitOrigin: (originId) => applyCreation(set, get, (s) => setOrigin(s, originId)),
  commitAttributes: (alloc) => applyCreation(set, get, (s) => setAttributes(s, alloc)),
  drawAffinity: () => applyCreation(set, get, (s) => drawChessAffinity(s)),

  // ---- play ------------------------------------------------------------
  runTurn: (raw: string) => {
    const current = get().state;
    if (!current) return;
    commit(set, get, executeCommand(current, raw));
  },

  chooseEvent: (index: number) => {
    const current = get().state;
    if (!current) return;
    commit(set, get, runCommand(current, { kind: 'eventChoice', choiceIndex: index }));
  },

  playStyle: (style: BoardStyle) => {
    const current = get().state;
    if (!current) return;
    commit(set, get, runCommand(current, { kind: 'play', style }));
  },

  openBoard: (opponentId: string) => {
    const current = get().state;
    if (!current) return;
    commit(set, get, runCommand(current, { kind: 'match', opponentId }));
  },

  goTo: (placeId: string) => {
    const current = get().state;
    if (!current) return;
    commit(set, get, runCommand(current, { kind: 'travel', placeId }));
  },

  // ---- ui --------------------------------------------------------------
  setTab: (tab) => set({ tab }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearBreakthroughFx: () => set({ breakthroughFx: null }),

  exportSaveString: () => {
    const state = get().state;
    return state ? exportSave(state) : null;
  },

  importSaveString: (b64: string) => {
    const result = importSave<GameState>(b64);
    if (!result.ok) {
      pushToasts(set, [{ tone: 'bad', text: result.message }]);
      return false;
    }
    persist(result.state);
    set({ state: result.state, corruptSave: null });
    pushToasts(set, [{ tone: 'good', text: '棋谱已续。' }]);
    return true;
  },
}));

// ============================================================================
// helpers
// ============================================================================

type SetFn = (partial: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) => void;
type GetFn = () => GameStore;

function pushToasts(set: SetFn, notices: readonly Notice[]): void {
  if (notices.length === 0) return;
  const fresh: Toast[] = notices.map((n) => ({ id: toastSeq++, tone: n.tone, text: n.text }));
  // Only the newest handful stay on screen; the log keeps the full record.
  set((s) => ({ toasts: [...s.toasts, ...fresh].slice(-4) }));
}

function commit(set: SetFn, get: GetFn, result: ReturnType<typeof executeCommand>): void {
  pushToasts(set, result.notices);
  if (!result.accepted) return;
  persist(result.state);
  const patch: Partial<GameStore> = { state: result.state, lastCommandAt: Date.now() };
  if (result.breakthrough) patch.breakthroughFx = result.breakthrough;
  if (result.state.phase === 'match') patch.tab = 'board';
  else if (get().tab === 'board') patch.tab = 'panel';
  set(patch);
}

function applyCreation(
  set: SetFn,
  get: GetFn,
  step: (s: GameState) => { ok: boolean; message: string },
): boolean {
  const current = get().state;
  if (!current) return false;
  const g = globalThis as { structuredClone?: <T>(v: T) => T };
  const draft = g.structuredClone
    ? g.structuredClone(current)
    : (JSON.parse(JSON.stringify(current)) as GameState);
  const result = step(draft);
  if (!result.ok) {
    pushToasts(set, [{ tone: 'bad', text: result.message }]);
    return false;
  }
  persist(draft);
  set({ state: draft });
  return true;
}
