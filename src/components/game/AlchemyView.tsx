'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { RECIPES } from '@/data/recipes';
import { getItem } from '@/data/items';
import type { GameState } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/components/ui/badge';
import { GRADE_INFO, formatStones, realmAtLeast } from './format';
import { HanziWatermark, SectionHeading } from './Ornaments';
import { cn } from '@/lib/utils';

/** 丹房 — furnace visual, recipe list with live success rates, 开炉. */
export function AlchemyView({ state }: { state: GameState }) {
  const craft = useGameStore((s) => s.craft);
  const reduced = useReducedMotion();
  const c = state.character!;

  // mirror of the engine's target formula, shown honestly to the player
  const effectiveRate = (base: number) =>
    Math.min(95, base + c.attributes.wuXing * 2 + (c.flags.herbLore ? 10 : 0));

  const unlocked = RECIPES.filter((r) => realmAtLeast(c.realm.realm, r.minRealm));
  const locked = RECIPES.length - unlocked.length;

  return (
    <div className="flex flex-col gap-3 p-3">
      <SectionHeading>丹房</SectionHeading>

      {/* the furnace */}
      <div className="relative flex flex-col items-center overflow-hidden rounded-md bg-ink-900/70 py-5 ring-1 ring-ink-700 backdrop-blur-md">
        <HanziWatermark char="丹" className="-top-2 right-2 text-[5.5rem]" />
        <div className="relative">
          {/* ember glow */}
          <motion.div
            aria-hidden
            className="absolute -inset-4 rounded-full"
            animate={reduced ? { opacity: 0.35 } : { opacity: [0.2, 0.5, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatType: 'mirror' }}
            style={{
              background: 'radial-gradient(circle at 50% 80%, rgba(242,190,69,0.35), transparent 65%)',
            }}
          />
          {/* lid */}
          <div className="relative mx-auto h-3 w-10 rounded-t-full bg-gradient-to-b from-ink-500 to-ink-700 ring-1 ring-ink-500/70" />
          <div className="relative mx-auto -mt-px h-1.5 w-16 rounded-full bg-ink-600 ring-1 ring-ink-500/60" />
          {/* body */}
          <div className="relative mx-auto -mt-0.5 flex h-16 w-20 items-center justify-center rounded-b-[2.6rem] rounded-t-xl bg-gradient-to-b from-ink-600 via-ink-700 to-ink-900 ring-1 ring-ink-500/70">
            <motion.span
              className="font-display text-2xl text-gold-400/90 select-none"
              animate={reduced ? {} : { opacity: [0.65, 1, 0.75] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatType: 'mirror' }}
            >
              炁
            </motion.span>
          </div>
          {/* legs */}
          <div className="relative mx-auto flex w-16 justify-between">
            <span className="h-2.5 w-1.5 rounded-b bg-ink-600" />
            <span className="h-2.5 w-1.5 rounded-b bg-ink-600" />
            <span className="h-2.5 w-1.5 rounded-b bg-ink-600" />
          </div>
          {/* flame */}
          <motion.div
            aria-hidden
            className="mx-auto -mt-1 h-2 w-8 rounded-full bg-gradient-to-r from-transparent via-gold-500/70 to-transparent blur-[2px]"
            animate={reduced ? {} : { scaleX: [1, 1.25, 0.9, 1.1], opacity: [0.7, 1, 0.8] }}
            transition={{ duration: 0.9, repeat: Infinity, repeatType: 'mirror' }}
          />
        </div>
        <p className="relative mt-3 font-sans text-[11px] text-mist-500">
          悟性入药,成率 +{c.attributes.wuXing * 2}%
          {c.flags.herbLore ? ' · 识药 +10%' : ''} · 失败者,材料尽毁
        </p>
      </div>

      {/* recipes */}
      <div className="flex flex-col gap-2">
        {unlocked.map((r) => {
          const result = getItem(r.resultItemId);
          const grade = GRADE_INFO[result?.grade ?? 1];
          const canAfford = c.spiritStones >= r.fee;
          const missing = r.materials.filter(
            (m) => (c.inventory.find((s) => s.itemId === m.itemId)?.count ?? 0) < m.count,
          );
          const ready = canAfford && missing.length === 0;
          const rate = effectiveRate(r.baseSuccess);
          return (
            <div
              key={r.id}
              className={cn(
                'rounded-md p-3 ring-1 backdrop-blur-sm transition-colors',
                ready ? grade.ringClass : 'ring-ink-700',
                ready ? grade.bgClass : 'bg-ink-800/30',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('font-serif text-sm', ready ? grade.textClass : 'text-paper-400')}>
                  {r.name}
                  <span className="ml-1.5 font-sans text-[10px] text-mist-500">{grade.label}</span>
                </span>
                <Badge variant={rate >= 80 ? 'jade' : rate >= 55 ? 'secondary' : 'destructive'} className="text-[10px]">
                  成率 {rate}%
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-xs">
                {r.materials.map((m) => {
                  const have = c.inventory.find((s) => s.itemId === m.itemId)?.count ?? 0;
                  const enough = have >= m.count;
                  return (
                    <span key={m.itemId} className={enough ? 'text-paper-400' : 'text-crimson-400'}>
                      {getItem(m.itemId)?.name ?? m.itemId} {have}/{m.count}
                    </span>
                  );
                })}
                <span className={canAfford ? 'text-paper-500' : 'text-crimson-400'}>
                  炉费 {formatStones(r.fee)}
                </span>
              </div>
              <button
                onClick={() => craft(r.id)}
                disabled={!ready}
                className={cn(
                  'mt-2 rounded border px-3.5 py-1 font-sans text-xs tracking-[0.2em] transition-all',
                  ready
                    ? 'border-gold-600/60 text-gold-300 hover:border-gold-400 hover:bg-gold-400/10'
                    : 'border-ink-600 text-mist-500 opacity-50',
                )}
              >
                开炉
              </button>
            </div>
          );
        })}
      </div>
      {locked > 0 && (
        <p className="text-center font-sans text-[11px] text-mist-500">
          尚有 {locked} 张丹方,须境界更进方可开炉。
        </p>
      )}
    </div>
  );
}
