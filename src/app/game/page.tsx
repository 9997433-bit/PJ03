"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PanelRightOpen } from "lucide-react";

import { useGameStore, type ContextTab } from "@/store/gameStore";
import type { CombatTactic } from "@/engine/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import TopBar from "@/components/game/TopBar";
import NarrativeLog from "@/components/game/NarrativeLog";
import CommandBar from "@/components/game/CommandBar";
import CharacterPanel from "@/components/game/CharacterPanel";
import CombatView from "@/components/game/CombatView";
import BreakthroughModal from "@/components/game/BreakthroughModal";
import MarketView from "@/components/game/MarketView";
import AlchemyView from "@/components/game/AlchemyView";
import InventoryView from "@/components/game/InventoryView";
import QuestView from "@/components/game/QuestView";
import AuditView from "@/components/game/AuditView";
import EndingScreen from "@/components/game/EndingScreen";
import OriginStep from "@/components/game/creation/OriginStep";
import AttributeStep from "@/components/game/creation/AttributeStep";
import SpiritRootStep from "@/components/game/creation/SpiritRootStep";
import HiddenRollStep from "@/components/game/creation/HiddenRollStep";

const COMBAT_TACTICS: CombatTactic[] = ["强攻", "游斗", "设伏", "术法", "服药", "遁走"];

const TAB_ITEMS: { value: ContextTab; label: string }[] = [
  { value: "panel", label: "面板" },
  { value: "inventory", label: "背包" },
  { value: "quests", label: "任务" },
  { value: "market", label: "坊市" },
  { value: "alchemy", label: "炼丹" },
  { value: "audit", label: "审计" },
];

export default function GamePage() {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const corrupt = useGameStore((s) => s.corrupt);
  const phase = useGameStore((s) => s.game.phase);

  // Rehydrate the persisted save on mount (store is SSG-safe via skipHydration).
  useEffect(() => {
    useGameStore.persist.rehydrate();
  }, []);

  // No run in progress → back to the title screen.
  useEffect(() => {
    if (hydrated && !corrupt && phase === "title") {
      router.replace("/");
    }
  }, [hydrated, corrupt, phase, router]);

  // ===== keyboard shortcuts 1–9 =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;

      const { game, dispatch, setActiveTab } = useGameStore.getState();

      if (game.phase === "combat") {
        if (n <= COMBAT_TACTICS.length) {
          e.preventDefault();
          dispatch({ kind: "combat", tactic: COMBAT_TACTICS[n - 1] });
        }
        return;
      }
      if (game.phase !== "playing") return;

      // An event is waiting on a choice — numbers pick the option.
      if (game.pendingEvent) {
        e.preventDefault();
        dispatch({ kind: "eventChoice", choiceIndex: n - 1 });
        return;
      }

      e.preventDefault();
      switch (n) {
        case 1: dispatch({ kind: "cultivate" }); break;
        case 2: dispatch({ kind: "breakthrough" }); break;
        case 3: dispatch({ kind: "explore" }); break;
        case 4: dispatch({ kind: "rest" }); break;
        case 5: dispatch({ kind: "market" }); setActiveTab("market"); break;
        case 6: dispatch({ kind: "alchemy" }); setActiveTab("alchemy"); break;
        case 7: dispatch({ kind: "inventory" }); setActiveTab("inventory"); break;
        case 8: dispatch({ kind: "quests" }); setActiveTab("quests"); break;
        case 9: dispatch({ kind: "audit" }); setActiveTab("audit"); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) {
    return <LoadingScreen />;
  }
  if (corrupt) {
    return <CorruptSaveScreen />;
  }

  switch (phase) {
    case "creation":
      return <CreationWizard />;
    case "playing":
    case "combat":
      return <GameBoard />;
    case "ended":
      return <EndingScreen />;
    default:
      return <LoadingScreen />; // 'title' — redirect effect is in flight
  }
}

// ============================================================================
// Loading / corrupt-save screens
// ============================================================================

function LoadingScreen() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[var(--bg,#0B0F0E)]">
      <span className="animate-pulse select-none font-[family-name:var(--font-mashan)] text-3xl text-[var(--muted,#7C8A80)]">
        天机推演中…
      </span>
    </main>
  );
}

function CorruptSaveScreen() {
  const restart = useGameStore((s) => s.restart);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 bg-[var(--bg,#0B0F0E)] px-6 text-center">
      <p className="select-none font-[family-name:var(--font-mashan)] text-4xl text-[var(--vermilion,#B3402E)]">
        此界因果紊乱，不可续。
      </p>
      <p className="max-w-md font-[family-name:var(--font-noto-serif)] leading-8 text-[var(--muted,#7C8A80)]">
        存档已被篡改或损毁，天道拒绝续写此段因果。唯有散尽此世，再入轮回。
      </p>
      <Button
        onClick={() => setConfirmOpen(true)}
        className="h-11 border border-[var(--vermilion,#B3402E)]/60 bg-[var(--vermilion,#B3402E)]/15 px-8 font-[family-name:var(--font-noto-serif)] tracking-[0.4em] text-[var(--vermilion,#B3402E)] hover:bg-[var(--vermilion,#B3402E)]/30"
      >
        重开
      </Button>
      <RestartConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={restart}
      />
    </main>
  );
}

function RestartConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border border-[var(--border,#2A3A32)] bg-[var(--surface,#121815)] text-[var(--ink-text,#D8D3C4)]"
      >
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-mashan)] text-2xl text-[var(--vermilion,#B3402E)]">
            因果尽散，再入轮回？
          </DialogTitle>
          <DialogDescription className="font-[family-name:var(--font-noto-serif)] leading-7 text-[var(--muted,#7C8A80)]">
            此世一切修为、灵石、因果，皆将归于虚无。天道不留情面，亦不容反悔。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t-0 bg-transparent">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[var(--muted,#7C8A80)] hover:text-[var(--ink-text,#D8D3C4)]"
          >
            且慢
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            className="border border-[var(--vermilion,#B3402E)]/60 bg-[var(--vermilion,#B3402E)]/15 text-[var(--vermilion,#B3402E)] hover:bg-[var(--vermilion,#B3402E)]/30"
          >
            再入轮回
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Creation wizard — 4-step gate (creationStep 0 identity → 4 hidden roll)
// ============================================================================

const WIZARD_STEPS = ["立名", "出身", "属性", "灵根", "天命"] as const;

function CreationWizard() {
  const step = useGameStore((s) => s.game.creationStep);

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center overflow-hidden bg-[var(--bg,#0B0F0E)] px-4 py-10 sm:py-14">
      {/* quiet mist backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(62,155,122,0.10),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(4,7,6,0.85)_100%)]" />
      </div>

      <header className="relative z-10 mb-8 flex flex-col items-center gap-5">
        <h1 className="select-none font-[family-name:var(--font-mashan)] text-4xl text-[var(--gold,#C9A227)] sm:text-5xl">
          逆天改命
        </h1>
        {/* progress dots — no going back past a confirmed step */}
        <ol className="flex items-center gap-3">
          {WIZARD_STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "now" : "later";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 select-none items-center justify-center rounded-full border font-[family-name:var(--font-noto-serif)] text-xs transition-colors ${
                    state === "done"
                      ? "border-[var(--jade,#3E9B7A)] bg-[var(--jade,#3E9B7A)]/15 text-[var(--jade-bright,#5FD4A7)]"
                      : state === "now"
                        ? "border-[var(--gold,#C9A227)] bg-[var(--gold,#C9A227)]/10 text-[var(--gold-bright,#E8C96A)] shadow-[0_0_12px_rgba(201,162,39,0.25)]"
                        : "border-[var(--border,#2A3A32)] text-[var(--muted,#7C8A80)]"
                  }`}
                >
                  {label}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <span
                    className={`h-px w-6 ${
                      i < step
                        ? "bg-[var(--jade,#3E9B7A)]/60"
                        : "bg-[var(--border,#2A3A32)]"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </header>

      <div className="relative z-10 w-full max-w-3xl flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {step === 0 && <IdentityStep />}
            {step === 1 && <OriginStep />}
            {step === 2 && <AttributeStep />}
            {step === 3 && <SpiritRootStep />}
            {step === 4 && <HiddenRollStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/** Step 0 — name & gender. 天道 asks who dares tread the path. */
function IdentityStep() {
  const creationIdentity = useGameStore((s) => s.creationIdentity);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"男" | "女">("男");

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 6;

  const submit = useCallback(() => {
    if (valid) creationIdentity(trimmed, gender);
  }, [valid, trimmed, gender, creationIdentity]);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-8 rounded-lg border border-[var(--border,#2A3A32)] bg-[var(--surface,#121815)]/80 p-8 backdrop-blur-sm">
      <p className="text-center font-[family-name:var(--font-noto-serif)] leading-8 text-[var(--ink-text,#D8D3C4)]/90">
        天道垂目，万物如刍狗。
        <br />
        汝欲以凡人之躯，踏仙途、逆天命。
        <br />
        <span className="text-[var(--muted,#7C8A80)]">——报上名来。</span>
      </p>

      <div className="flex w-full flex-col gap-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          maxLength={6}
          placeholder="姓名（一至六字）"
          autoFocus
          className="h-11 border-[var(--border,#2A3A32)] bg-[var(--bg,#0B0F0E)]/60 text-center font-[family-name:var(--font-noto-serif)] text-lg tracking-widest text-[var(--ink-text,#D8D3C4)] placeholder:text-[var(--muted,#7C8A80)]/60"
        />
        <div className="flex justify-center gap-3">
          {(["男", "女"] as const).map((g) => (
            <Button
              key={g}
              variant="outline"
              onClick={() => setGender(g)}
              className={`h-10 w-20 font-[family-name:var(--font-noto-serif)] text-base transition-all ${
                gender === g
                  ? "border-[var(--jade,#3E9B7A)] bg-[var(--jade,#3E9B7A)]/15 text-[var(--jade-bright,#5FD4A7)]"
                  : "border-[var(--border,#2A3A32)] bg-transparent text-[var(--muted,#7C8A80)] hover:text-[var(--ink-text,#D8D3C4)]"
              }`}
            >
              {g}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={submit}
        disabled={!valid}
        className="h-11 w-full border border-[var(--gold,#C9A227)]/60 bg-[var(--gold,#C9A227)]/10 font-[family-name:var(--font-noto-serif)] tracking-[0.4em] text-[var(--gold-bright,#E8C96A)] hover:bg-[var(--gold,#C9A227)]/20"
      >
        落笔定名
      </Button>
    </section>
  );
}

// ============================================================================
// Main board — TopBar / NarrativeLog + context tabs / CommandBar
// ============================================================================

function GameBoard() {
  const phase = useGameStore((s) => s.game.phase);
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const contextTabs = (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as ContextTab)}
      className="flex h-full min-h-0 flex-col"
    >
      <TabsList className="grid w-full shrink-0 grid-cols-6 bg-[var(--surface,#121815)]">
        {TAB_ITEMS.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="px-1 font-[family-name:var(--font-noto-serif)] text-xs data-[state=active]:text-[var(--gold-bright,#E8C96A)] sm:text-sm"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TabsContent value="panel" className="mt-0 h-full">
          <CharacterPanel />
        </TabsContent>
        <TabsContent value="inventory" className="mt-0 h-full">
          <InventoryView />
        </TabsContent>
        <TabsContent value="quests" className="mt-0 h-full">
          <QuestView />
        </TabsContent>
        <TabsContent value="market" className="mt-0 h-full">
          <MarketView />
        </TabsContent>
        <TabsContent value="alchemy" className="mt-0 h-full">
          <AlchemyView />
        </TabsContent>
        <TabsContent value="audit" className="mt-0 h-full">
          <AuditView />
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <main className="flex h-dvh flex-col bg-[var(--bg,#0B0F0E)]">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        {/* narrative — the hero zone */}
        <section className="relative flex min-w-0 flex-1 flex-col">
          <NarrativeLog />
          {/* combat overlays the log area */}
          <AnimatePresence>
            {phase === "combat" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-20 overflow-y-auto bg-[var(--bg,#0B0F0E)]/92 backdrop-blur-sm"
              >
                <CombatView />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* context panel — desktop */}
        <aside className="hidden w-[380px] shrink-0 border-l border-[var(--border,#2A3A32)] lg:block">
          {contextTabs}
        </aside>
      </div>

      {/* context panel — mobile bottom sheet */}
      <div className="flex items-center justify-end border-t border-[var(--border,#2A3A32)] px-3 py-1.5 lg:hidden">
        <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 font-[family-name:var(--font-noto-serif)] text-xs text-[var(--muted,#7C8A80)]"
            >
              <PanelRightOpen className="size-3.5" />
              {TAB_ITEMS.find((t) => t.value === activeTab)?.label ?? "面板"}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-[75dvh] border-[var(--border,#2A3A32)] bg-[var(--bg,#0B0F0E)] p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>面板</SheetTitle>
            </SheetHeader>
            <div className="h-full pt-2">{contextTabs}</div>
          </SheetContent>
        </Sheet>
      </div>

      <CommandBar />

      {/* 突破 tension modal — reads breakthroughFx from the store */}
      <BreakthroughModal />
    </main>
  );
}
