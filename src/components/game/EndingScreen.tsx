'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '@/engine/types';
import { realmLabel } from '@/data/realmData';
import { useGameStore } from '@/store/gameStore';
import { ConfirmDialog } from './ConfirmDialog';

/** Death / ending summary + 重开. Slow ink-bleed entrance. */
export function EndingScreen({ state }: { state: GameState }) {
  const rebirth = useGameStore((s) => s.restart);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ending = state.ending!;
  const c = state.character;
  const isVictory = ending.id === 'ascension';

  const lastLine = [...state.narrativeLog].reverse().find((e) => e.speaker === '天道')?.text ?? '';

  const stats: [string, string][] = c
    ? [
        ['在世', `${c.age} 载`],
        ['巅峰境界', realmLabel(c.realm)],
        ['历劫', `${state.turn} 转`],
        ['天道掷骰', `${(state.rollSeq ?? 1) - 1} 次`],
        ['身家灵石', `${c.spiritStones} 枚`],
        ['斩敌', `${state.killCount ?? 0} 众`],
      ]
    : [];

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="mist-layer" aria-hidden />
      <motion.div
        initial={{ opacity: 0, filter: 'blur(14px)', scale: 1.03 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="panel-ornate corner-brackets relative z-10 w-full max-w-lg p-10 text-center"
      >
        <span className="cb cb-tl" /><span className="cb cb-tr" /><span className="cb cb-bl" /><span className="cb cb-br" />

        <p className="font-sans text-xs tracking-[0.5em] text-paper-500">此生终局</p>
        <h1
          className={`font-display mt-4 text-5xl tracking-wide sm:text-6xl ${
            isVictory ? 'text-gold-gradient' : 'text-crimson-500'
          }`}
        >
          {ending.title}
        </h1>

        <p className="font-serif mt-6 text-sm leading-8 text-paper-200">{lastLine}</p>

        <div className="mx-auto mt-8 grid max-w-xs grid-cols-2 gap-x-6 gap-y-2.5 font-sans text-sm">
          {stats.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-ink-600/60 pb-1">
              <span className="text-paper-500">{k}</span>
              <span className="text-gold-300 tabular-nums">{v}</span>
            </div>
          ))}
        </div>

        <p className="font-serif mt-6 text-xs text-paper-500">{ending.summary}</p>

        {/* red seal */}
        <div className="mt-8 flex justify-center">
          <span className="seal-stamp h-14 w-14 text-2xl">{isVictory ? '飞升' : '寂'}</span>
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          className="mt-10 w-full border border-gold-600/50 py-3 font-sans text-base tracking-[0.5em] text-gold-300 transition-all hover:border-gold-400 hover:bg-gold-400/10"
        >
          轮回重开
        </button>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        title="因果尽散，再入轮回？"
        description="天道将重掷命数，前尘尽忘。"
        confirmText="入轮回"
        cancelText="且慢"
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          rebirth();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
