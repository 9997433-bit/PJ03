'use client';

import type { GameState } from '@/engine';
import { useGameStore } from '@/store/gameStore';
import { Btn, Panel, Rule, Stone, cx } from './ui';

const RANK_TONE: Record<string, string> = {
  天: 'text-moon-100 glow-moon',
  地: 'text-bamboo-200 glow-bamboo',
  玄: 'text-jade-300',
  黄: 'text-dusk-300',
};

export function EndingScreen({ state }: { state: GameState }) {
  const abandon = useGameStore((s) => s.abandon);
  const ending = state.ending;
  if (!ending) return null;

  return (
    <main className="goban-field relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="goban-stars" />
      <div className="animate-fade-rise w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-paper-500 mb-4 text-[11px] tracking-[0.4em]">
            {ending.rank} 品 结 局
          </p>
          <h1 className={cx('text-4xl tracking-[0.28em] sm:text-5xl', RANK_TONE[ending.rank])}>
            {ending.title}
          </h1>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Stone />
            <Stone white />
            <Stone />
          </div>
        </div>

        <Panel className="px-7 py-8 sm:px-10" corners>
          <p className="text-paper-200 text-[14.5px] leading-[2.15] whitespace-pre-wrap">
            {ending.epitaph}
          </p>

          <Rule />

          <p className={cx('text-center text-[16px] tracking-[0.2em]', RANK_TONE[ending.rank])}>
            {ending.closing}
          </p>

          <Rule />

          <ul className="space-y-1.5">
            {ending.summary.map((line, i) => (
              <li key={i} className="text-paper-500 font-sans text-[12px] leading-[1.85]">
                {line}
              </li>
            ))}
          </ul>

          <Btn primary className="mt-8 w-full py-3 tracking-[0.32em]" onClick={abandon}>
            另 起 一 世
          </Btn>
        </Panel>

        <p className="text-paper-500 mt-6 text-center text-[11px] tracking-[0.2em]">
          种子 {state.seed}
        </p>
      </div>
    </main>
  );
}
