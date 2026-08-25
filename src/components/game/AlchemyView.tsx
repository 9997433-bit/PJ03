'use client';

import { RECIPES } from '@/data/recipes';
import { getItem } from '@/data/items';
import { useGameStore } from '@/store/gameStore';
import { FlaskConical } from 'lucide-react';
import type { GameState } from '@/engine/types';

export function AlchemyView({ state }: { state: GameState }) {
  const craft = useGameStore((s) => s.craft);
  const c = state.character!;

  return (
    <div className="flex flex-col gap-2 p-3 font-sans text-sm">
      {RECIPES.map((r) => {
        const canAfford = c.spiritStones >= r.fee;
        const hasMats = r.materials.every(
          (m) => (c.inventory.find((s) => s.itemId === m.itemId)?.count ?? 0) >= m.count,
        );
        return (
          <div key={r.id} className="border border-ink-600/70 bg-ink-800/40 p-2.5">
            <div className="flex items-baseline justify-between">
              <span className="flex items-center gap-1.5 text-paper-200">
                <FlaskConical className="h-3.5 w-3.5 text-jade-400" />
                {r.name}
              </span>
              <span className="text-xs text-jade-400">成率{r.baseSuccess}%</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-paper-400">
              {r.materials.map((m) => (
                <span key={m.itemId}>
                  {getItem(m.itemId).name}×{m.count}
                </span>
              ))}
              <span>炉火费{r.fee}</span>
            </div>
            <button
              onClick={() => craft(r.id)}
              disabled={!canAfford || !hasMats}
              className="mt-2 border border-jade-600/50 px-3 py-1 text-xs text-jade-400 disabled:opacity-40"
            >
              开炉
            </button>
          </div>
        );
      })}
    </div>
  );
}
