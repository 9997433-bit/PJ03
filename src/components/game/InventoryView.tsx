'use client';

import type { GameState } from '@/engine/types';
import { getItem } from '@/data/items';
import { useGameStore } from '@/store/gameStore';

const KIND_LABEL: Record<string, string> = {
  pill: '丹药', weapon: '兵刃', armor: '护具', talisman: '符箓',
  material: '材料', manual: '典籍', misc: '杂物',
};

const GRADE_COLOR: Record<number, string> = {
  1: 'text-paper-400', 2: 'text-jade-400', 3: 'text-sky-400', 4: 'text-mystic-500', 5: 'text-gold-300',
};

/** 储物袋 */
export function InventoryView({ state }: { state: GameState }) {
  const execute = useGameStore((s) => s.execute);
  const sell = useGameStore((s) => s.sell);
  const c = state.character!;
  const inCombat = state.phase === 'combat';

  if (c.inventory.length === 0) {
    return <p className="p-6 text-center font-serif text-sm text-paper-500">储物袋空空如也。</p>;
  }

  return (
    <div className="flex flex-col gap-2 p-3 font-sans text-sm">
      {c.inventory.map((stack) => {
        const item = getItem(stack.itemId);
        const equipped = c.equipped.weapon === item.id || c.equipped.armor === item.id;
        const usable = item.kind === 'pill' || item.kind === 'manual' || item.kind === 'misc';
        const equipable = item.kind === 'weapon' || item.kind === 'armor';
        return (
          <div key={stack.itemId} className="border border-ink-600/70 bg-ink-800/40 p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`${GRADE_COLOR[item.grade]} font-medium`}>
                {item.name}
                <span className="ml-1.5 text-xs text-paper-500">×{stack.count}</span>
              </span>
              <span className="shrink-0 text-[10px] tracking-widest text-paper-500">{KIND_LABEL[item.kind]}</span>
            </div>
            <p className="mt-1 font-serif text-xs leading-5 text-paper-400">{item.desc}</p>
            <div className="mt-2 flex gap-2">
              {usable && (
                <button
                  onClick={() => execute(`使用 ${item.name}`)}
                  className="border border-jade-600/50 px-2.5 py-0.5 text-xs text-jade-400 transition-colors hover:bg-jade-400/10"
                >
                  使用
                </button>
              )}
              {equipable && !equipped && (
                <button
                  onClick={() => execute(`装备 ${item.name}`)}
                  className="border border-gold-600/50 px-2.5 py-0.5 text-xs text-gold-300 transition-colors hover:bg-gold-400/10"
                >
                  装备
                </button>
              )}
              {equipped && <span className="px-1 py-0.5 text-xs text-gold-400">已装备</span>}
              {!inCombat && !equipped && (
                <button
                  onClick={() => sell(item.id)}
                  disabled={item.price <= 0}
                  className="border border-ink-600 px-2.5 py-0.5 text-xs text-paper-500 transition-colors hover:border-crimson-500/50 hover:text-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  出售
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
