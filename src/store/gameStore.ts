/**
 * gameStore.ts — the single Zustand store wrapping the pure engine.
 *
 * Architecture (PLAN §1, §3.9-8 single-writer):
 *   UI components  →  store actions  →  engine (pure functions)  →  new GameState
 *
 * - Every mutation flows through the engine; the UI has no direct setters.
 * - Persistence: zustand `persist` with a custom storage that wraps the
 *   engine's checksummed SaveEnvelope (save.ts) — auto-saves on every action.
 * - Side effects owned here: sonner toasts for 突破 / 获得物品 / 寿元警告,
 *   and the breakthrough-animation payload for BreakthroughModal.
 */

import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { toast } from "sonner";

import type { Attributes, Command, GameState, RealmState } from "@/engine/types";
import { generateSeed } from "@/engine/rng";
import {
  SAVE_KEY,
  clearSave,
  getBrowserStorage,
  loadGame,
  saveGame,
} from "@/engine/save";
import {
  startCreation,
  setIdentity,
  chooseOrigin,
  allocateAttributes,
  rollSpiritRoot,
  rollHiddenFate,
} from "@/engine/creation";
import { parseCommand } from "@/engine/commands";
import { resolveTurn } from "@/engine/turn";
import { realmLabel, REALM_ORDER, STAGES } from "@/data/realmData";
import { getItem } from "@/data/items";

// ============================================================================
// Public store types
// ============================================================================

/** Context-panel tabs shared between CommandBar / shortcuts / the game page. */
export type ContextTab =
  | "panel"
  | "inventory"
  | "quests"
  | "market"
  | "alchemy"
  | "audit";

/** Payload consumed by BreakthroughModal for the D100 tension animation. */
export interface BreakthroughFx {
  /** the D100 that decided fate (null if the attempt never rolled) */
  roll: number | null;
  success: boolean;
  fromLabel: string;
  toLabel: string;
}

export type Allocation = Pick<Attributes, "genGu" | "wuXing" | "xinXing" | "qiYun">;

export interface GameStore {
  /** the engine-owned game state — render-only for components */
  game: GameState;
  /** persisted save has been read (or found absent) */
  hydrated: boolean;
  /** save failed integrity check — 天道: 此界因果紊乱,不可续。 */
  corrupt: boolean;
  /** breakthrough animation payload (set on 突破, cleared by the modal) */
  breakthroughFx: BreakthroughFx | null;
  /** which context tab is open (UI-only, not persisted) */
  activeTab: ContextTab;

  hasSave: () => boolean;
  /** 开始游戏 — fresh seed, enter creation */
  newGame: () => void;
  /** 重开 — wipe save, fresh seed (caller owns the confirm dialog) */
  restart: () => void;
  /**
   * The only gameplay mutation path: raw text (goes through the command
   * whitelist parser) or a structured Command → engine turn resolver.
   */
  dispatch: (input: string | Command) => void;
  clearBreakthroughFx: () => void;
  setActiveTab: (tab: ContextTab) => void;

  // ---- creation wizard actions (creationStep 0→4) ----
  creationIdentity: (name: string, gender: "男" | "女") => void;
  creationOrigin: (originId: string) => void;
  creationAttributes: (alloc: Allocation) => void;
  creationSpiritRoot: () => void;
  creationHiddenRoll: () => void;
}

// ============================================================================
// Helpers — realm progression scoring & labels
// ============================================================================

function realmStateLabel(r: RealmState): string {
  return realmLabel(r.realm, r.qiLayer, r.stage);
}

/** Monotonic score for "did cultivation advance" comparisons. */
function progressScore(r: RealmState): number {
  const realmIdx = REALM_ORDER.indexOf(r.realm);
  const stageIdx = Math.max(0, STAGES.indexOf(r.stage));
  return realmIdx * 10000 + r.qiLayer * 100 + stageIdx;
}

function isMajorAdvance(prev: RealmState, next: RealmState): boolean {
  return (
    REALM_ORDER.indexOf(next.realm) > REALM_ORDER.indexOf(prev.realm) ||
    (next.realm === prev.realm &&
      next.realm !== "qi" &&
      STAGES.indexOf(next.stage) > STAGES.indexOf(prev.stage))
  );
}

function itemName(itemId: string): string {
  return getItem(itemId)?.name ?? itemId;
}

// ============================================================================
// Toast side effects — 突破 / 获得物品 / 寿元警告
// ============================================================================

const LIFESPAN_WARN_THRESHOLDS = [20, 10, 5] as const;

function emitToasts(prev: GameState, next: GameState): void {
  const pc = prev.character;
  const nc = next.character;
  if (!pc || !nc || next.ending) return;

  // --- 突破 / 修为精进 ---
  if (progressScore(nc.realm) > progressScore(pc.realm)) {
    const label = realmStateLabel(nc.realm);
    if (isMajorAdvance(pc.realm, nc.realm)) {
      toast.success(`突破成功 · ${label}`, {
        description: "天地灵气翻涌，道基更进一层。",
        duration: 6000,
      });
    } else {
      toast.success(`修为精进 · ${label}`, { duration: 3200 });
    }
  }

  // --- 突破失败 ---
  if (next.stats.breakthroughsFailed > prev.stats.breakthroughsFailed) {
    toast.error("突破失败", {
      description: "气机逆行，经脉俱震。汝之道，止步于此乎？",
      duration: 5000,
    });
  }

  // --- 获得物品 ---
  const before = new Map(pc.inventory.map((s) => [s.itemId, s.count]));
  const gained: string[] = [];
  for (const s of nc.inventory) {
    const delta = s.count - (before.get(s.itemId) ?? 0);
    if (delta > 0) gained.push(delta > 1 ? `${itemName(s.itemId)} ×${delta}` : itemName(s.itemId));
  }
  if (gained.length > 0) {
    toast(`获得物品`, { description: gained.join("、"), duration: 4200 });
  }

  // --- 寿元警告 (fires once per threshold crossing) ---
  const prevLeft = pc.lifespan - pc.age;
  const nextLeft = nc.lifespan - nc.age;
  for (const t of LIFESPAN_WARN_THRESHOLDS) {
    if (prevLeft > t && nextLeft <= t) {
      toast.warning("寿元警告", {
        description: `寿元仅余约${Math.max(0, nextLeft)}载。大限将至，天道不待。`,
        duration: 6000,
      });
      break;
    }
  }
}

/** Capture the D100 of a 突破 attempt for the BreakthroughModal animation. */
function captureBreakthroughFx(
  command: Command,
  prev: GameState,
  next: GameState
): BreakthroughFx | null {
  if (command.kind !== "breakthrough") return null;
  const pc = prev.character;
  const nc = next.character;
  if (!pc || !nc) return null;
  // no roll appended ⇒ the attempt was rejected before dice (e.g. not at cap)
  const newRolls = next.rolls.filter(
    (r) => r.id >= prev.nextRollId && r.reason.includes("突破")
  );
  if (newRolls.length === 0) return null;
  return {
    roll: newRolls[0].value,
    success: progressScore(nc.realm) > progressScore(pc.realm),
    fromLabel: realmStateLabel(pc.realm),
    toLabel: realmStateLabel(nc.realm),
  };
}

// ============================================================================
// Persistence — zustand persist over the engine's checksummed SaveEnvelope
// ============================================================================

interface PersistedSlice {
  game: GameState;
}

/** Set when the save blob exists but fails integrity/version checks. */
let corruptOnLoad = false;

const envelopeStorage: PersistStorage<PersistedSlice> = {
  getItem: (name): StorageValue<PersistedSlice> | null => {
    const adapter = getBrowserStorage();
    if (!adapter) return null;
    const result = loadGame<GameState>(adapter, name);
    if (!result.ok) {
      if (result.code !== "empty") corruptOnLoad = true;
      return null;
    }
    return { state: { game: result.state }, version: 0 };
  },
  setItem: (name, value): void => {
    const adapter = getBrowserStorage();
    if (!adapter) return;
    const game = value.state.game;
    // Never clobber a real save with the pristine title placeholder.
    if (game.phase === "title" && game.character === null) return;
    saveGame(adapter, game, name);
  },
  removeItem: (name): void => {
    const adapter = getBrowserStorage();
    if (adapter) clearSave(adapter, name);
  },
};

/** Pristine pre-game state shown until a save is hydrated or a game starts. */
function titleState(): GameState {
  return startCreation("__title__").state.phase === "creation"
    ? { ...startCreation("__title__").state, phase: "title" }
    : startCreation("__title__").state;
}

// ============================================================================
// The store
// ============================================================================

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** Run an engine transition, emit side effects, commit the new state. */
      const commit = (fn: (game: GameState) => GameState, command?: Command) => {
        const prev = get().game;
        let next: GameState;
        try {
          next = fn(prev);
        } catch (err) {
          // Engine invariant violation ⇒ the turn is rolled back (layer 7).
          console.error("[engine]", err);
          toast.error("天机紊乱", { description: "此举有违天道，未能成行。" });
          return;
        }
        emitToasts(prev, next);
        const fx = command ? captureBreakthroughFx(command, prev, next) : null;
        set({ game: next, ...(fx ? { breakthroughFx: fx } : {}) });
      };

      return {
        game: titleState(),
        hydrated: false,
        corrupt: false,
        breakthroughFx: null,
        activeTab: "panel" as ContextTab,

        hasSave: () => {
          const g = get().game;
          return g.phase !== "title" || g.character !== null;
        },

        newGame: () => {
          set({
            game: startCreation(generateSeed()).state,
            corrupt: false,
            breakthroughFx: null,
            activeTab: "panel",
          });
        },

        restart: () => {
          const adapter = getBrowserStorage();
          if (adapter) clearSave(adapter, SAVE_KEY);
          corruptOnLoad = false;
          set({
            game: startCreation(generateSeed()).state,
            corrupt: false,
            breakthroughFx: null,
            activeTab: "panel",
          });
        },

        dispatch: (input) => {
          const command: Command =
            typeof input === "string" ? parseCommand(input) : input;
          commit((g) => resolveTurn(g, command), command);
        },

        clearBreakthroughFx: () => set({ breakthroughFx: null }),
        setActiveTab: (tab) => set({ activeTab: tab }),

        // ---- creation wizard ----
        creationIdentity: (name, gender) =>
          commit((g) => setIdentity(g, name, gender)),
        creationOrigin: (originId) => commit((g) => chooseOrigin(g, originId)),
        creationAttributes: (alloc) =>
          commit((g) => allocateAttributes(g, alloc)),
        creationSpiritRoot: () => commit((g) => rollSpiritRoot(g)),
        creationHiddenRoll: () => commit((g) => rollHiddenFate(g)),
      };
    },
    {
      name: SAVE_KEY,
      storage: envelopeStorage,
      version: 0,
      // Only the engine state persists; UI state (tabs, fx) is ephemeral.
      partialize: (s) => ({ game: s.game }),
      // SSG-safe: pages call useGameStore.persist.rehydrate() on mount.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useGameStore.setState({ hydrated: true, corrupt: corruptOnLoad });
      },
    }
  )
);
