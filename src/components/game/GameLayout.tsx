"use client";

import * as React from "react";
import { BookUser, ScrollText } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface GameLayoutProps {
  /** Compact status strip pinned to the top (TopBar). */
  topBar?: React.ReactNode;
  /** Left column — the character panel (面板). Sheet drawer below lg. */
  characterPanel?: React.ReactNode;
  /** Center column — the narrative log. The hero; always visible. */
  log: React.ReactNode;
  /** Right column — context tabs (背包/任务/坊市/炼丹/审计). Sheet drawer below lg. */
  contextPanel?: React.ReactNode;
  /** Bottom command bar. */
  commandBar?: React.ReactNode;
  className?: string;
}

/**
 * The cultivation chamber — desktop 3-zone layout:
 *
 *   ┌─────────────── TopBar ───────────────┐
 *   │ 面板 300px │  NarrativeLog  │ 事务 340px │
 *   └────────────── CommandBar ────────────┘
 *
 * Below lg the side columns collapse into edge-mounted Sheet drawers so the
 * narration keeps the whole screen.
 */
export function GameLayout({
  topBar,
  characterPanel,
  log,
  contextPanel,
  commandBar,
  className,
}: GameLayoutProps) {
  return (
    <div className={cn("relative flex h-dvh flex-col overflow-hidden", className)}>
      {topBar ? <header className="shrink-0 z-20">{topBar}</header> : null}

      <div className="mx-auto grid w-full max-w-[1520px] flex-1 min-h-0 grid-cols-1 gap-3 px-3 py-3 lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:px-4">
        {characterPanel ? (
          <aside className="hidden min-h-0 overflow-y-auto lg:block">
            {characterPanel}
          </aside>
        ) : null}

        <main className="flex min-h-0 flex-col">{log}</main>

        {contextPanel ? (
          <aside className="hidden min-h-0 lg:flex lg:flex-col">
            {contextPanel}
          </aside>
        ) : null}
      </div>

      {commandBar ? <footer className="shrink-0 z-20">{commandBar}</footer> : null}

      {/* mobile edge drawers */}
      {characterPanel ? (
        <Sheet>
          <SheetTrigger
            aria-label="打开面板"
            className="fixed top-1/2 left-0 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-md border border-l-0 border-gold-600/40 bg-ink-900/85 px-1.5 py-3 text-gold-300 backdrop-blur-md transition-colors hover:bg-gold-400/10 lg:hidden"
          >
            <BookUser className="size-4" />
            <span className="text-[10px] tracking-widest [writing-mode:vertical-rl]">
              面板
            </span>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88%] gap-0 p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-ink-700/70 pb-3">
              <SheetTitle>人物面板</SheetTitle>
              <SheetDescription className="sr-only">
                查看修士属性、境界与装备
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {characterPanel}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {contextPanel ? (
        <Sheet>
          <SheetTrigger
            aria-label="打开事务"
            className="fixed top-1/2 right-0 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-md border border-r-0 border-gold-600/40 bg-ink-900/85 px-1.5 py-3 text-gold-300 backdrop-blur-md transition-colors hover:bg-gold-400/10 lg:hidden"
          >
            <ScrollText className="size-4" />
            <span className="text-[10px] tracking-widest [writing-mode:vertical-rl]">
              事务
            </span>
          </SheetTrigger>
          <SheetContent side="right" className="w-[92%] gap-0 p-0 sm:max-w-md">
            <SheetHeader className="border-b border-ink-700/70 pb-3">
              <SheetTitle>诸般事务</SheetTitle>
              <SheetDescription className="sr-only">
                背包、任务、坊市、炼丹与审计
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
              {contextPanel}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
