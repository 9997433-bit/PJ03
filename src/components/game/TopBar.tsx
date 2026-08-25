'use client';

import Link from 'next/link';
import type { Character } from '@/engine/types';
import { realmLabel } from '@/data/realmData';
import { Coins, Hourglass, ScrollText } from 'lucide-react';

export function TopBar({
  character,
  turn,
  onOpenPanel,
}: {
  character: Character;
  turn: number;
  onOpenPanel: () => void;
}) {
  const lifeRatio = Math.max(0, Math.min(1, (character.lifespan - character.age) / character.lifespan));
  const lifeDanger = character.lifespan - character.age <= 10;

  return (
    <header className="flex items-center gap-3 border-b border-ink-600 bg-ink-900/80 px-3 py-2 backdrop-blur sm:px-5">
      <Link
        href="/"
        className="font-display shrink-0 text-lg text-gold-400/90 transition-colors hover:text-gold-300"
        title="回到题目"
      >
        凡人修仙传
      </Link>
      <span className="hidden h-4 w-px bg-ink-600 sm:block" />

      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto font-sans text-sm whitespace-nowrap sm:gap-5">
        <span className="text-paper-200">{character.name}</span>
        <span className="border border-gold-600/40 bg-gold-400/5 px-2 py-0.5 text-xs tracking-widest text-gold-300">
          {realmLabel(character.realm)}
        </span>
        <span className={`flex items-center gap-1.5 text-xs ${lifeDanger ? 'text-crimson-500' : 'text-paper-400'}`}>
          <Hourglass className="h-3.5 w-3.5" />
          {character.age}/{character.lifespan}岁
          <span className="bar-track ml-1 hidden h-1 w-14 sm:block">
            <span
              className={lifeDanger ? 'bar-fill-crimson block' : 'bar-fill-jade block'}
              style={{ width: `${lifeRatio * 100}%`, height: '100%' }}
            />
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gold-300">
          <Coins className="h-3.5 w-3.5" />
          {character.spiritStones}
        </span>
        <span className="hidden items-center gap-1.5 text-xs text-paper-500 md:flex">
          <ScrollText className="h-3.5 w-3.5" />第{turn}转
        </span>
      </div>

      <button
        onClick={onOpenPanel}
        className="shrink-0 border border-ink-600 px-3 py-1 font-sans text-xs tracking-widest text-paper-200 transition-colors hover:border-gold-600/60 hover:text-gold-300 lg:hidden"
      >
        面板
      </button>
    </header>
  );
}
