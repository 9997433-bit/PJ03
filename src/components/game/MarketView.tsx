'use client';

import { ITEMS } from '@/data/items';
import { useGameStore } from '@/store/gameStore';
import { Coins } from 'lucide-react';
import type { GameState } from '@/engine/types';

export function MarketView({ state }: { state: GameState }) {
  const buy = useGameStore((s) => s.buy);
  const c = state.character!;
  const stock = ITEMS.filter((i) => i.price > 0 && i.sellable !== false).slice(0, 20);

  return (
    <div className="flex flex-col gap-2 p-3 font-sans text-sm">
      <div className="mb-1 flex items-center justify-between border-b border-ink-600 pb-2 text-xs">
        <span className="text-paper-500">万宝楼</span>
        <span className="flex items-center gap-1 text-gold-300">
          <Coins className="h-3.5 w-3.5" />
          {c.spiritStones}
        </span>
      </div>
      {stock.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2 border border-ink-600/70 bg-ink-800/40 p-2.5"
        >
          <div className="min-w-0">
            <p className="text-paper-200">{item.name}</p>
            <p className="mt-0.5 truncate text-xs text-paper-500">{item.desc}</p>
          </div>
          <button
            onClick={() => buy(item.id)}
            disabled={c.spiritStones < item.price}
            className="shrink-0 border border-gold-600/50 px-3 py-1 text-xs text-gold-300 disabled:opacity-40"
          >
            {item.price} 灵石
          </button>
        </div>
      ))}
    </div>
  );
}
