'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import type { GameState } from '@/engine/types';
import { getItem } from '@/data/items';
import { useGameStore } from '@/store/gameStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { GRADE_INFO, formatStones, itemKindLabel } from './format';
import { SectionHeading } from './Ornaments';
import { cn } from '@/lib/utils';

/** 储物袋 — grid of grade-tinted tiles with tooltips; tap to inspect & act. */
export function InventoryView({ state }: { state: GameState }) {
  const execute = useGameStore((s) => s.execute);
  const sell = useGameStore((s) => s.sell);
  const reduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const c = state.character!;
  const inCombat = state.phase === 'combat';

  if (c.inventory.length === 0) {
    return (
      <p className="p-6 text-center font-serif text-sm text-mist-500">储物袋空空如也。</p>
    );
  }

  const selectedStack = c.inventory.find((s) => s.itemId === selectedId) ?? null;
  const selected = selectedStack ? getItem(selectedStack.itemId) : null;

  const isEquipped = (id: string) =>
    c.equipped.weapon === id || c.equipped.armor === id || c.equipped.accessory === id;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-3 p-3">
        <SectionHeading>储物袋</SectionHeading>

        <motion.div
          className="grid grid-cols-5 gap-2"
          initial={reduced ? false : 'hidden'}
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        >
          {c.inventory.map((stack) => {
            const item = getItem(stack.itemId);
            if (!item) return null;
            const grade = GRADE_INFO[item.grade];
            const active = selectedId === stack.itemId;
            const equipped = isEquipped(item.id);
            return (
              <Tooltip key={stack.itemId}>
                <TooltipTrigger asChild>
                  <motion.button
                    type="button"
                    variants={{
                      hidden: { opacity: 0, scale: 0.85 },
                      show: { opacity: 1, scale: 1 },
                    }}
                    whileHover={reduced ? undefined : { y: -2 }}
                    onClick={() => setSelectedId(active ? null : stack.itemId)}
                    className={cn(
                      'relative flex aspect-square items-center justify-center rounded-md ring-1 backdrop-blur-sm transition-shadow',
                      grade.bgClass,
                      active ? 'ring-gold-400/80 shadow-[0_0_16px_-4px_rgba(242,190,69,0.4)]' : grade.ringClass,
                    )}
                  >
                    <span className={cn('font-display text-lg select-none', grade.textClass)}>
                      {item.name[0]}
                    </span>
                    {stack.count > 1 && (
                      <span className="absolute right-0.5 bottom-0.5 font-sans text-[9px] text-paper-400 tabular-nums">
                        ×{stack.count}
                      </span>
                    )}
                    {equipped && (
                      <span className="absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-gold-400" aria-label="已装备" />
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-56">
                  <p className={cn('font-serif text-sm', grade.textClass)}>
                    {item.name}
                    <span className="ml-1.5 font-sans text-[10px] text-mist-400">
                      {grade.label} · {itemKindLabel(item.kind)}
                    </span>
                  </p>
                  <p className="mt-1 font-sans text-xs leading-5 text-paper-300">{item.desc}</p>
                  {item.price > 0 && (
                    <p className="mt-1 font-sans text-[10px] text-gold-600 tabular-nums">
                      市值 {formatStones(item.price)} 灵石
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {selected && selectedStack && (
            <motion.div
              key={selected.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'rounded-md p-3 ring-1 backdrop-blur-sm',
                GRADE_INFO[selected.grade].bgClass,
                GRADE_INFO[selected.grade].ringClass,
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('font-serif text-sm', GRADE_INFO[selected.grade].textClass)}>
                  {selected.name}
                  <span className="ml-1.5 font-sans text-xs text-mist-400">×{selectedStack.count}</span>
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {GRADE_INFO[selected.grade].label} · {itemKindLabel(selected.kind)}
                </Badge>
              </div>
              <p className="mt-1.5 font-serif text-xs leading-6 text-paper-400">{selected.desc}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(selected.kind === 'pill' || selected.kind === 'manual' || selected.kind === 'misc') && (
                  <button
                    onClick={() => execute(`使用 ${selected.name}`)}
                    className="rounded border border-jade-600/50 px-3 py-1 font-sans text-xs text-jade-300 transition-colors hover:border-jade-400 hover:bg-jade-400/10"
                  >
                    使用
                  </button>
                )}
                {(selected.kind === 'weapon' || selected.kind === 'armor' || selected.kind === 'accessory') &&
                  (isEquipped(selected.id) ? (
                    <span className="px-1 py-1 font-sans text-xs text-gold-400">已装备</span>
                  ) : (
                    <button
                      onClick={() => execute(`装备 ${selected.name}`)}
                      className="rounded border border-gold-600/50 px-3 py-1 font-sans text-xs text-gold-300 transition-colors hover:border-gold-400 hover:bg-gold-400/10"
                    >
                      装备
                    </button>
                  ))}
                {!inCombat && !isEquipped(selected.id) && selected.price > 0 && selected.sellable !== false && (
                  <button
                    onClick={() => {
                      if (selectedStack.count <= 1) setSelectedId(null);
                      sell(selected.id);
                    }}
                    className="rounded border border-ink-600 px-3 py-1 font-sans text-xs text-paper-500 transition-colors hover:border-crimson-500/60 hover:text-crimson-400"
                  >
                    出售
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
