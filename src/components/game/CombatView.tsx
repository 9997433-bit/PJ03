'use client';

import { motion } from 'framer-motion';
import type { GameState } from '@/engine/types';
import { getEnemy, powerOf } from '@/engine/stubEngine';
import { Swords } from 'lucide-react';

export function CombatView({ state }: { state: GameState }) {
  const combat = state.combat;
  const c = state.character!;
  if (!combat) return null;
  const enemy = getEnemy(combat.enemyId);
  const enemyMax = enemy?.hp ?? combat.enemyHp;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-crimson-600/40 bg-ink-900/90 px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[65ch] items-center gap-4">
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs">
            <span>{c.name}</span>
            <span className="text-crimson-400">
              {c.hp}/{c.maxHp}
            </span>
          </div>
          <div className="bar-track h-2">
            <div className="bar-fill-jade" style={{ width: `${(c.hp / c.maxHp) * 100}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-paper-500">威能 {powerOf(c)}</p>
        </div>
        <Swords className="h-5 w-5 text-crimson-500" />
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-crimson-500">{enemy?.name ?? '敌'}</span>
            <span className="text-crimson-400">
              {combat.enemyHp}/{enemyMax}
            </span>
          </div>
          <div className="bar-track h-2">
            <div
              className="bar-fill-crimson"
              style={{ width: `${(combat.enemyHp / enemyMax) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-paper-500">
            威能 {enemy?.power ?? '?'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
