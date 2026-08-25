"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";

import { useGameStore } from "@/store/gameStore";
import { TopBar } from "@/components/game/TopBar";
import { NarrativeLog } from "@/components/game/NarrativeLog";
import { CommandBar } from "@/components/game/CommandBar";
import CharacterPanel from "@/components/game/CharacterPanelConnected";
import { CombatView } from "@/components/game/CombatView";
import { BreakthroughModal } from "@/components/game/BreakthroughModal";
import { MarketView } from "@/components/game/MarketView";
import { AlchemyView } from "@/components/game/AlchemyView";
import { InventoryView } from "@/components/game/InventoryView";
import { QuestView } from "@/components/game/QuestView";
import { AuditView } from "@/components/game/AuditView";
import { EndingScreen } from "@/components/game/EndingScreen";
import OriginStep from "@/components/game/creation/OriginStep";
import AttributeStep from "@/components/game/creation/AttributeStep";
import SpiritRootStep from "@/components/game/creation/SpiritRootStep";
import HiddenRollStep from "@/components/game/creation/HiddenRollStep";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ContextTab } from "@/store/gameStore";

const TABS: { value: ContextTab; label: string }[] = [
  { value: "panel", label: "面板" },
  { value: "inventory", label: "背包" },
  { value: "quests", label: "任务" },
  { value: "market", label: "坊市" },
  { value: "alchemy", label: "炼丹" },
  { value: "audit", label: "审计" },
];

export default function GamePage() {
  const router = useRouter();
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);
  const game = useGameStore((s) => s.game);
  const breakthroughFx = useGameStore((s) => s.breakthroughFx);
  const clearBreakthroughFx = useGameStore((s) => s.clearBreakthroughFx);
  const eventChoice = useGameStore((s) => s.eventChoice);
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && game?.phase === "title") router.replace("/");
  }, [hydrated, game?.phase, router]);

  if (!hydrated || !game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950">
        <p className="animate-pulse font-display text-mist-400">天机推演中…</p>
      </main>
    );
  }

  if (game.phase === "title") {
    router.replace("/");
    return null;
  }

  if (game.phase === "ended") return <EndingScreen state={game} />;

  if (game.phase === "creation") {
    const step = game.creationStep;
    return (
      <main className="min-h-screen bg-ink-950 px-4 py-10">
        <Toaster position="top-center" />
        <h1 className="mb-8 text-center font-display text-4xl text-gold-300">逆天改命</h1>
        <div className="mx-auto max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {step === 0 && <OriginStep />}
              {step === 1 && <AttributeStep />}
              {step === 2 && <SpiritRootStep />}
              {step >= 3 && <HiddenRollStep />}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8">
            <NarrativeLog log={game.narrativeLog} />
          </div>
        </div>
      </main>
    );
  }

  const c = game.character!;

  const sidePanel = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContextTab)}>
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="panel"><CharacterPanel /></TabsContent>
      <TabsContent value="inventory"><InventoryView state={game} /></TabsContent>
      <TabsContent value="quests"><QuestView state={game} /></TabsContent>
      <TabsContent value="market"><MarketView state={game} /></TabsContent>
      <TabsContent value="alchemy"><AlchemyView state={game} /></TabsContent>
      <TabsContent value="audit"><AuditView state={game} /></TabsContent>
    </Tabs>
  );

  return (
    <main className="flex h-dvh flex-col bg-ink-950">
      <Toaster position="top-center" />
      <TopBar
        character={c}
        turn={game.turn}
        onOpenPanel={() => setActiveTab("panel")}
      />

      <div className="flex min-h-0 flex-1">
        <section className="relative flex min-w-0 flex-1 flex-col border-r border-ink-800">
          <NarrativeLog log={game.narrativeLog} />
          {game.pendingEvent && (
            <div className="border-t border-ink-800 bg-ink-900/90 p-4">
              <p className="mb-3 font-serif text-sm text-paper-100">{game.pendingEvent.narrative}</p>
              <div className="flex flex-col gap-2">
                {game.pendingEvent.choices.map((ch, i) => (
                  <Button key={i} variant="outline" size="sm" onClick={() => eventChoice(i)}>
                    {i + 1}. {ch.text}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {game.phase === "combat" && (
            <div className="absolute inset-0 z-10 bg-ink-950/95 backdrop-blur-sm">
              <CombatView state={game} />
            </div>
          )}
        </section>

        <aside className="hidden w-[360px] shrink-0 overflow-y-auto p-3 lg:block">
          {sidePanel}
        </aside>
      </div>

      <div className="border-t border-ink-800 p-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              打开面板
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70dvh] bg-ink-950">
            {sidePanel}
          </SheetContent>
        </Sheet>
      </div>

      <CommandBar state={game} />
      {breakthroughFx ? (
        <BreakthroughModal fx={breakthroughFx} onClose={clearBreakthroughFx} />
      ) : null}
    </main>
  );
}
