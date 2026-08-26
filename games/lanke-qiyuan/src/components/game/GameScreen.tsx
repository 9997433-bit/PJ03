'use client';

import type { GameState } from '@/engine';
import { formatRealm, formatSeason } from '@/engine';
import { getPlace } from '@/data/places';
import { useGameStore } from '@/store/gameStore';
import { ActionDock } from './ActionDock';
import { NarrativeLog } from './NarrativeLog';
import { SidePanel } from './SidePanel';
import { StatusRail } from './StatusRail';
import { Panel, cx } from '../ui';

export function GameScreen({ state }: { state: GameState }) {
  const c = state.character;
  if (!c) return null;
  const place = getPlace(state.placeId);

  return (
    <main className="goban-field flex h-screen flex-col overflow-hidden">
      <div className="goban-stars" />

      <TopBar state={state} placeName={place?.name ?? ''} />

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden px-3 pb-3 lg:grid-cols-[19rem_1fr_20rem]">
        <div className="hidden min-h-0 overflow-y-auto lg:block">
          <StatusRail state={state} />
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <Panel className="flex min-h-0 flex-1 flex-col p-0">
            <NarrativeLog entries={state.narrativeLog} />
          </Panel>
          <ActionDock state={state} />
        </div>

        <div className="hidden min-h-0 lg:block">
          <SidePanel state={state} />
        </div>
      </div>

      {/* narrow screens: the rail and panel stack below the log */}
      <div className="grid gap-3 px-3 pb-3 lg:hidden">
        <StatusRail state={state} />
        <div className="h-[26rem]">
          <SidePanel state={state} />
        </div>
      </div>
    </main>
  );
}

function TopBar({ state, placeName }: { state: GameState; placeName: string }) {
  const abandon = useGameStore((s) => s.abandon);
  const c = state.character!;

  return (
    <header className="border-ink-600 flex items-center justify-between gap-4 border-b px-4 py-2.5">
      <div className="flex items-baseline gap-3">
        <span className="text-bamboo-300 text-[13px] tracking-[0.28em]">烂柯棋缘</span>
        <span className="text-paper-500 hidden text-[11px] tracking-[0.18em] sm:inline">
          {formatSeason(state.turn)} · {placeName}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] sm:gap-5">
        <Pill label="境" value={formatRealm(c.realm)} tone="text-bamboo-200" />
        <Pill label="棋道" value={`${c.chessDao}`} tone="text-moon-300" />
        <Pill label="心神" value={`${c.spirit}/${c.maxSpirit}`} tone="text-jade-300" />
        <Pill
          label="心尘"
          value={`${c.dust}`}
          tone={c.dust >= 70 ? 'text-dusk-400' : 'text-paper-300'}
        />
        <Pill label="钱" value={`${c.coin}`} />
        <button
          type="button"
          onClick={() => {
            if (confirm('弃此局,另起一世?此局棋谱将被抹去。')) abandon();
          }}
          className="text-paper-500 hover:text-dusk-400 text-[11px] tracking-[0.18em] transition-colors"
        >
          弃局
        </button>
      </div>
    </header>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="hidden items-baseline gap-1.5 sm:inline-flex">
      <span className="text-paper-500 tracking-[0.16em]">{label}</span>
      <span className={cx('tabular-nums', tone ?? 'text-paper-200')}>{value}</span>
    </span>
  );
}
