'use client';

import { useState } from 'react';
import { NarrativeLog } from './NarrativeLog';
import { CommandBar } from './CommandBar';
import { ContextPanel } from './ContextPanel';
import { TopBar } from './TopBar';
import { Toasts } from './Toasts';
import { BreakthroughModal } from './BreakthroughModal';
import type { GameState } from '@/engine/types';

/**
 * Two columns on desktop (scroll + side panel); on anything narrower the side
 * panel becomes a drawer opened from the 命盘 button in the top bar.
 */
export function GameLayout({ state }: { state: GameState }) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="board-grid-faint flex h-dvh flex-col">
      <TopBar state={state} onOpenDrawer={() => setDrawer(true)} />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <NarrativeLog entries={state.narrativeLog} />
          </div>
          <CommandBar state={state} />
        </main>

        <aside className="hidden w-[330px] shrink-0 border-l border-xuan-300 bg-xuan-50/70 lg:block xl:w-[380px]">
          <ContextPanel state={state} />
        </aside>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-yan-900/25"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 right-0 flex w-[88vw] max-w-[380px] flex-col bg-xuan-50 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="命盘与行囊"
          >
            <div className="flex items-center justify-between border-b border-xuan-300 px-3 py-2">
              <h2 className="font-display text-sm tracking-[0.18em] text-zhu-600">命盘</h2>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="关闭命盘"
                className="border border-xuan-400 px-2 py-0.5 text-xs rounded-sm"
              >
                收
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ContextPanel state={state} />
            </div>
          </div>
        </div>
      )}

      <Toasts />
      <BreakthroughModal />
    </div>
  );
}
