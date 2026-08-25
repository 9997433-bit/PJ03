'use client';

/**
 * /game — the single game screen. GameState.phase drives everything:
 *   creation → the 4-step wizard · playing → 3-zone layout
 *   combat   → full overlay      · ended  → EndingScreen
 *
 * Also owned here: global 1-9 keyboard shortcuts, the corrupt-save
 * refusal screen (anti-cheat layer 6), and the 重开 confirm dialog.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { useGameStore, type ContextTab } from '@/store/gameStore';
import { TopBar } from '@/components/game/TopBar';
import { NarrativeLog } from '@/components/game/NarrativeLog';
import { CommandBar } from '@/components/game/CommandBar';
import CharacterPanel from '@/components/game/CharacterPanelConnected';
import { CombatView } from '@/components/game/CombatView';
import { BreakthroughModal } from '@/components/game/BreakthroughModal';
import { MarketView } from '@/components/game/MarketView';
import { AlchemyView } from '@/components/game/AlchemyView';
import { InventoryView } from '@/components/game/InventoryView';
import { QuestView } from '@/components/game/QuestView';
import { AuditView } from '@/components/game/AuditView';
import { EndingScreen } from '@/components/game/EndingScreen';
import OriginStep from '@/components/game/creation/OriginStep';
import AttributeStep from '@/components/game/creation/AttributeStep';
import SpiritRootStep from '@/components/game/creation/SpiritRootStep';
import HiddenRollStep from '@/components/game/creation/HiddenRollStep';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TABS: { value: ContextTab; label: string }[] = [
  { value: 'panel', label: '面板' },
  { value: 'inventory', label: '背包' },
  { value: 'quests', label: '任务' },
  { value: 'market', label: '坊市' },
  { value: 'alchemy', label: '炼丹' },
  { value: 'audit', label: '审计' },
];

const COMBAT_KEYS = ['强攻', '游斗', '设伏', '术法', '服药', '遁走'] as const;
const PLAY_KEYS = ['修炼', '突破', '探索'] as const;
const TAB_KEYS: ContextTab[] = ['坊市', '炼丹', '背包', '任务', '面板', '审计'].map(
  (label) => TABS.find((t) => t.label === label)!.value,
);

/** true when the keystroke belongs to a text field, not to us */
function typingInField(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function GamePage() {
  const router = useRouter();
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);
  const game = useGameStore((s) => s.game);
  const corruptSave = useGameStore((s) => s.corruptSave);
  const breakthroughFx = useGameStore((s) => s.breakthroughFx);
  const clearBreakthroughFx = useGameStore((s) => s.clearBreakthroughFx);
  const eventChoice = useGameStore((s) => s.eventChoice);
  const execute = useGameStore((s) => s.execute);
  const restart = useGameStore((s) => s.restart);
  const rebirthPrompt = useGameStore((s) => s.rebirthPrompt);
  const cancelRebirth = useGameStore((s) => s.cancelRebirth);
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !corruptSave && (!game || game.phase === 'title')) router.replace('/');
  }, [hydrated, corruptSave, game, router]);

  // ===== keyboard shortcuts 1-9 =====
  // pending event → choose · combat → 1出手 2术法 3服药 4遁走
  // playing → 1修炼 2突破 3探索 · 4-9 switch context tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typingInField(e)) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const g = useGameStore.getState().game;
      if (!g || g.phase === 'creation' || g.phase === 'ended') return;
      if (useGameStore.getState().breakthroughFx) return;
      const n = Number(e.key);

      if (g.pendingEvent) {
        if (n <= g.pendingEvent.choices.length) {
          e.preventDefault();
          eventChoice(n - 1);
        }
        return;
      }
      if (g.phase === 'combat') {
        if (n <= COMBAT_KEYS.length) {
          e.preventDefault();
          execute(COMBAT_KEYS[n - 1]!);
        }
        return;
      }
      if (n <= PLAY_KEYS.length) {
        e.preventDefault();
        execute(PLAY_KEYS[n - 1]!);
      } else if (n - PLAY_KEYS.length <= TAB_KEYS.length) {
        e.preventDefault();
        setActiveTab(TAB_KEYS[n - 1 - PLAY_KEYS.length]!);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eventChoice, execute, setActiveTab]);

  // ===== corrupt save — 天道拒绝续命 (anti-cheat layer 6) =====
  if (hydrated && corruptSave && !game) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink-950 px-6 text-center">
        <p className="font-display text-4xl text-crimson-500">因果紊乱</p>
        <p className="max-w-sm font-serif text-sm leading-7 text-paper-400">
          天道垂察：此界存档已遭篡改，天机错乱，不可续。
          <br />
          欲问仙途，唯有轮回重来。
        </p>
        <Button
          variant="outline"
          className="border-crimson-600/60 tracking-[0.3em] text-crimson-400 hover:bg-crimson-600/10"
          onClick={() => restart()}
        >
          入轮回 · 重开一世
        </Button>
      </main>
    );
  }

  if (!hydrated || !game || game.phase === 'title') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink-950">
        <p className="animate-pulse font-display text-mist-400">天机推演中…</p>
      </main>
    );
  }

  if (game.phase === 'ended') return <EndingScreen state={game} />;

  // ===== creation wizard =====
  if (game.phase === 'creation') {
    const step = game.creationStep;
    return (
      <main className="min-h-dvh bg-ink-950 px-4 py-10">
        <h1 className="mb-2 text-center font-display text-4xl text-gold-300 text-glow-gold">
          逆天改命
        </h1>
        <p className="mb-8 text-center font-sans text-xs tracking-[0.5em] text-mist-500">
          第{['一', '二', '三', '四'][Math.min(step, 3)]}步 · 共四步
        </p>
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
        </div>
      </main>
    );
  }

  // ===== playing / combat =====
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
      <TopBar character={c} turn={game.turn} onOpenPanel={() => setActiveTab('panel')} />

      <div className="flex min-h-0 flex-1">
        {/* center: narrative + (combat overlay) */}
        <section className="relative flex min-w-0 flex-1 flex-col lg:border-r lg:border-ink-800">
          <NarrativeLog log={game.narrativeLog} />
          {game.pendingEvent && (
            <div className="border-t border-gold-600/25 bg-ink-900/90 px-4 py-3">
              <p className="font-serif text-sm leading-6 text-paper-100">
                {game.pendingEvent.narrative}
              </p>
            </div>
          )}
          <AnimatePresence>
            {game.phase === 'combat' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-ink-950/95 backdrop-blur-sm"
              >
                <CombatView state={game} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* right: context tabs (desktop) */}
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto p-3 lg:block">
          {sidePanel}
        </aside>
      </div>

      {/* context tabs (mobile) */}
      <div className="border-t border-ink-800 p-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full tracking-[0.3em]">
              命盘 · 百宝 · 万事
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[72dvh] overflow-y-auto bg-ink-950 p-3">
            <SheetTitle className="sr-only">面板</SheetTitle>
            {sidePanel}
          </SheetContent>
        </Sheet>
      </div>

      <CommandBar state={game} />

      <p className="hidden border-t border-ink-800/60 bg-ink-950 px-5 py-1 text-center font-sans text-[10px] tracking-widest text-paper-500/50 select-none lg:block">
        快捷键 1修炼 2突破 3探索 · 4-9切换面板 · 战斗中1-6战法 · 抉择中1-9直选
      </p>

      {breakthroughFx && <BreakthroughModal fx={breakthroughFx} onClose={clearBreakthroughFx} />}

      {/* 重开 confirm — typed 「重开」 or clicked anywhere */}
      <Dialog open={rebirthPrompt} onOpenChange={(open) => !open && cancelRebirth()}>
        <DialogContent className="border-crimson-600/40 bg-ink-900">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-crimson-400">
              重开一世？
            </DialogTitle>
            <DialogDescription className="font-serif leading-7 text-paper-400">
              此举将抹去今生一切因果——{c.name}的修为、机缘、恩怨，尽归尘土。
              轮回之后，天道重掷骰，前尘不可追。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={cancelRebirth}>
              再想想
            </Button>
            <Button
              variant="outline"
              className="border-crimson-600/60 text-crimson-400 hover:bg-crimson-600/10"
              onClick={() => restart()}
            >
              入轮回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
