/**
 * gameStore.ts — the single Zustand store wrapping the pure engine.
 *
 * Architecture (PLAN §1, anti-cheat layer 8 single-writer):
 *   UI → store actions → engine pure functions → new GameState
 *
 * - Gameplay mutations flow through `executeCommand` (the engine turn
 *   resolver in turn.ts); creation flows through the 4-step creation module.
 * - Persistence: zustand `persist` over the engine's checksummed save
 *   envelope — every action auto-saves; tampered saves are refused
 *   (天道: 此界因果紊乱,不可续。).
 * - Side effects owned here: sonner toasts (突破 / 获得物品 / 寿元警告),
 *   the BreakthroughModal animation payload, and the 重开 confirm flow.
 */

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { toast } from 'sonner';

import type { GameState, RealmState, SpiritRoot } from '@/engine/types';
import { STAGES } from '@/engine/types';
import { generateSeed } from '@/engine/rng';
import {
  newGame as engineNewGame,
  chooseOrigin,
  allocateAttributes,
  rollSpiritRoot,
  rollHiddenFate,
} from '@/engine/creation';
import { parseCommand, COMMAND_SPECS } from '@/engine/commands';
import { executeCommand } from '@/engine/turn';
import { breakthroughChance } from '@/engine/breakthrough';
import { realmTier } from '@/engine/realms';
import { formatRealm } from '@/engine/prose';
import { deserializeSave, SAVE_KEY, serializeSave } from '@/engine/save';
import { getItem } from '@/data/items';

// ============================================================================
// UI-only types
// ============================================================================

export type ContextTab = 'panel' | 'inventory' | 'quests' | 'market' | 'alchemy' | 'audit';

/** Payload consumed by BreakthroughModal (D100 tension animation). */
export interface BreakthroughFx {
  roll: number;
  chance: number;
  success: boolean;
  died: boolean;
  realmName: string;
}

export interface Allocation {
  genGu: number;
  wuXing: number;
  xinXing: number;
  qiYun: number;
}

// ============================================================================
// Toast side effects — 突破 / 获得物品 / 寿元警告
// ============================================================================

/** Monotonic score for "did cultivation advance" comparisons. */
function progressScore(r: RealmState): number {
  return realmTier(r.realm) * 10000 + r.qiLayer * 100 + Math.max(0, STAGES.indexOf(r.stage));
}

function isMajorAdvance(prev: RealmState, next: RealmState): boolean {
  if (realmTier(next.realm) > realmTier(prev.realm)) return true;
  return (
    next.realm === prev.realm &&
    next.realm !== 'qi' &&
    STAGES.indexOf(next.stage) > STAGES.indexOf(prev.stage)
  );
}

const LIFESPAN_WARN_THRESHOLDS = [10, 5, 3, 1] as const;

function emitToasts(prev: GameState, next: GameState): void {
  const pc = prev.character;
  const nc = next.character;
  if (!pc || !nc) return;

  // --- 突破 / 修为精进 ---
  if (progressScore(nc.realm) > progressScore(pc.realm)) {
    const label = formatRealm(nc.realm);
    if (isMajorAdvance(pc.realm, nc.realm)) {
      toast.success(`突破成功 · ${label}`, {
        description: '天地灵气翻涌，道基更进一层。',
        duration: 6000,
      });
    } else {
      toast.success(`修为精进 · ${label}`, { duration: 3000 });
    }
  }

  // --- 突破失败 ---
  const prevFails = prev.stats?.breakthroughsFailed ?? 0;
  const nextFails = next.stats?.breakthroughsFailed ?? 0;
  if (nextFails > prevFails && !next.ending) {
    toast.error('突破失败', {
      description: '气机逆行，经脉俱震。汝之道，止步于此乎？',
      duration: 5000,
    });
  }

  // --- 获得物品 ---
  const before = new Map(pc.inventory.map((s) => [s.itemId, s.count]));
  const gained: string[] = [];
  for (const s of nc.inventory) {
    const delta = s.count - (before.get(s.itemId) ?? 0);
    if (delta > 0) {
      const name = getItem(s.itemId)?.name ?? s.itemId;
      gained.push(delta > 1 ? `${name} ×${delta}` : name);
    }
  }
  if (gained.length > 0) {
    toast('获得物品', { description: gained.join('、'), duration: 4200 });
  }

  // --- 寿元警告 (fires once per threshold crossing) ---
  const prevLeft = pc.lifespan - pc.age;
  const nextLeft = nc.lifespan - nc.age;
  if (!next.ending) {
    for (const t of LIFESPAN_WARN_THRESHOLDS) {
      if (prevLeft > t && nextLeft <= t) {
        toast.warning('寿元警告', {
          description: `寿元仅余约${Math.max(0, nextLeft)}载。大限将至，天道不待。`,
          duration: 6000,
        });
        break;
      }
    }
  }
}

// ============================================================================
// Checksummed persistence — engine SaveEnvelope under zustand persist
// ============================================================================

let corruptSaveDetected = false;

const checksummedStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    const result = deserializeSave<GameState>(raw);
    if (!result.ok) {
      // 天道: 此界因果紊乱,不可续。 (anti-cheat layer 6)
      corruptSaveDetected = true;
      return null;
    }
    return JSON.stringify({ state: { game: result.state } });
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value) as { state?: { game?: GameState | null } };
      const game = parsed.state?.game;
      if (game) window.localStorage.setItem(name, serializeSave(game));
    } catch {
      /* never let a persistence hiccup break a turn */
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};

// ============================================================================
// Store
// ============================================================================

export interface GameStore {
  game: GameState | null;
  corruptSave: boolean;
  hydrated: boolean;
  breakthroughFx: BreakthroughFx | null;
  activeTab: ContextTab;
  /** 重开 was requested (typed or clicked) — the page shows the confirm dialog */
  rebirthPrompt: boolean;

  hydrate: () => void;
  hasSave: () => boolean;
  /** 开始游戏 — fresh seed, enter creation */
  newGame: () => void;
  continueGame: () => boolean;
  /** 重开 — wipe the save, fresh seed, back to creation (confirm handled by UI) */
  restart: () => void;
  requestRebirth: () => void;
  cancelRebirth: () => void;

  // ---- creation wizard (4 steps, gated by the engine) ----
  creationChoose: (name: string, gender: '男' | '女', originId: string) => void;
  creationAllocate: (alloc: Allocation) => void;
  creationRollRoot: () => SpiritRoot | null;
  creationFinish: () => void;

  // ---- gameplay: everything flows through the engine turn resolver ----
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
    (set, get) => {
      /** Run one engine turn, emit toast side effects, commit. */
      const runTurn = (text: string): void => {
        const g = get().game;
        if (!g) return;
        const cmd = parseCommand(text);

        // capture the 突破 target/chance BEFORE the dice fall
        const pre = cmd.kind === 'breakthrough' ? breakthroughChance(g) : null;
        const firstNewRollId = g.nextRollId ?? g.rolls.length;

        let next: GameState;
        try {
          next = executeCommand(g, cmd);
        } catch (err) {
          console.error('[engine]', err);
          toast.error('天机紊乱', { description: '此举有违天道，未能成行。' });
          return;
        }

        emitToasts(g, next);

        let fx: BreakthroughFx | null = null;
        if (cmd.kind === 'breakthrough' && pre && g.character) {
          const mainRoll = next.rolls.find(
            (r) => r.id >= firstNewRollId && r.reason.includes('突破'),
          );
          if (mainRoll) {
            fx = {
              roll: mainRoll.value,
              chance: pre.chance,
              success:
                next.character !== null &&
                progressScore(next.character.realm) > progressScore(g.character.realm),
              died: next.phase === 'ended',
              realmName: pre.targetName,
            };
          }
        }

        set({ game: next, ...(fx ? { breakthroughFx: fx } : {}) });
      };

      return {
        game: null,
        corruptSave: false,
        hydrated: false,
        breakthroughFx: null,
        activeTab: 'panel' as ContextTab,
        rebirthPrompt: false,

        hydrate: () => set({ hydrated: true, corruptSave: corruptSaveDetected }),

        hasSave: () => {
          const g = get().game;
          return g !== null && g.phase !== 'title';
        },

        newGame: () =>
          set({
            game: engineNewGame(generateSeed()),
            corruptSave: false,
            breakthroughFx: null,
            rebirthPrompt: false,
            activeTab: 'panel',
          }),

        continueGame: () => {
          const g = get().game;
          return g !== null && g.phase !== 'title';
        },

        restart: () => {
          if (typeof window !== 'undefined') window.localStorage.removeItem(SAVE_KEY);
          corruptSaveDetected = false;
          set({
            game: engineNewGame(generateSeed()),
            corruptSave: false,
            breakthroughFx: null,
            rebirthPrompt: false,
            activeTab: 'panel',
          });
        },

        requestRebirth: () => set({ rebirthPrompt: true }),
        cancelRebirth: () => set({ rebirthPrompt: false }),

        // ---- creation ----
        creationChoose: (name, gender, originId) => {
          const g = get().game;
          if (!g) return;
          set({ game: chooseOrigin(g, originId, name, gender) });
        },

        creationAllocate: (alloc) => {
          const g = get().game;
          if (!g) return;
          set({ game: allocateAttributes(g, alloc) });
        },

        creationRollRoot: () => {
          const g = get().game;
          if (!g) return null;
          const next = rollSpiritRoot(g);
          set({ game: next });
          return next.creationDraft?.spiritRoot ?? next.character?.spiritRoot ?? null;
        },

        creationFinish: () => {
          const g = get().game;
          if (!g) return;
          set({ game: rollHiddenFate(g) });
        },

        // ---- gameplay ----
        execute: (text) => {
          const t = text.trim();
          if (!t) return;
          // 重开 needs a confirm dialog — intercept before the engine
          if (t === '重开' || t === '轮回') {
            set({ rebirthPrompt: true });
            return;
          }
          if (t === '帮助' || t.toLowerCase() === 'help') {
            toast.info('可行之事', {
              description: COMMAND_SPECS.map((s) => s.token).join(' · '),
              duration: 7000,
            });
            return;
          }
          runTurn(t);
        },

        dispatch: (text) => get().execute(text),

        buy: (itemId) => runTurn(`购买 ${getItem(itemId)?.name ?? itemId}`),
        sell: (itemId) => runTurn(`出售 ${getItem(itemId)?.name ?? itemId}`),
        craft: (recipeId) => runTurn(`炼丹 ${recipeId}`),
        eventChoice: (idx) => runTurn(String(idx + 1)),

        clearBreakthroughFx: () => set({ breakthroughFx: null }),
        setActiveTab: (tab) => set({ activeTab: tab }),
      };
    },
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
