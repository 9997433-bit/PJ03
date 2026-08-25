'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Swords } from 'lucide-react';

import type { GameState } from '@/engine/types';
import { powerOf } from '@/engine/attributes';
import { getEnemy } from '@/data/enemies';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/components/ui/badge';
import { CornerFrame, HanziWatermark } from './Ornaments';
import { cn } from '@/lib/utils';

const TACTICS: { cmd: '强攻' | '游斗' | '设伏' | '术法' | '服药' | '遁走'; hint: string; danger?: boolean }[] = [
  { cmd: '强攻', hint: '伤敌更重 · 受创亦深' },
  { cmd: '游斗', hint: '攻守收敛 · 可觅破绽' },
  { cmd: '设伏', hint: '成则下合占尽先机' },
  { cmd: '术法', hint: '灵力全开 · 威能更盛' },
  { cmd: '服药', hint: '吞丹回血' },
  { cmd: '遁走', hint: '留得青山', danger: true },
];

function HpBar({
  label,
  hp,
  maxHp,
  fillClass,
  align = 'left',
}: {
  label: string;
  hp: number;
  maxHp: number;
  fillClass: string;
  align?: 'left' | 'right';
}) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  return (
    <div className="w-full">
      <div
        className={cn(
          'mb-1 flex items-baseline justify-between font-sans text-xs',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        <span className="text-paper-200">{label}</span>
        <span className={cn('tabular-nums', pct <= 30 ? 'text-crimson-400' : 'text-paper-500')}>
          {hp}/{maxHp}
        </span>
      </div>
      <div className="bar-track h-2.5">
        <div
          className={cn(fillClass, 'h-full transition-[width] duration-500 ease-out')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Full-screen combat panel (rendered inside the page's combat overlay):
 * facing combatant cards with calligraphy portraits, animated HP bars,
 * a scrolling round log, and the four tactic buttons.
 */
export function CombatView({ state }: { state: GameState }) {
  const execute = useGameStore((s) => s.execute);
  const reduced = useReducedMotion();
  const logRef = useRef<HTMLDivElement>(null);

  const combat = state.combat;
  const c = state.character!;
  const enemy = combat ? (combat.enemy ?? getEnemy(combat.enemyId)) : undefined;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [combat?.log.length, reduced]);

  if (!combat) return null;
  const enemyMax = combat.enemyMaxHp ?? enemy?.hp ?? combat.enemyHp;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex h-full min-h-0 flex-col items-center gap-4 overflow-y-auto p-4 sm:p-6"
    >
      <p className="font-sans text-xs tracking-[0.5em] text-crimson-500/90 select-none">
        杀伐 · 第{combat.round}合
      </p>

      {/* facing combatants */}
      <div className="grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-5">
        {/* player */}
        <CornerFrame
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-md bg-ink-900/80 p-4 ring-1 ring-jade-600/30 backdrop-blur-md"
          cornerClassName="border-jade-400/50"
        >
          <HanziWatermark char={c.name[0] ?? '汝'} className="-top-4 -left-2 text-[6rem]" />
          <div className="flex size-14 items-center justify-center rounded-full bg-ink-950/80 ring-1 ring-jade-600/40 sm:size-16">
            <span className="font-display text-2xl text-jade-300 sm:text-3xl">{c.name[0]}</span>
          </div>
          <HpBar label={c.name} hp={c.hp} maxHp={c.maxHp} fillClass="bar-fill-jade" />
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Badge variant="outline">威能 {powerOf(c)}</Badge>
            {combat.opening && <Badge variant="gold">破绽在握</Badge>}
            {combat.trapArmed && <Badge variant="jade">伏势已成</Badge>}
          </div>
        </CornerFrame>

        {/* vs */}
        <div className="flex flex-col items-center justify-center gap-1 select-none">
          <motion.div
            animate={reduced ? {} : { rotate: [0, -6, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Swords className="h-6 w-6 text-crimson-500 sm:h-7 sm:w-7" />
          </motion.div>
          <span className="font-display text-xs text-mist-500">对</span>
        </div>

        {/* enemy */}
        <CornerFrame
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-md bg-ink-900/80 p-4 ring-1 ring-crimson-600/40 backdrop-blur-md"
          cornerClassName="border-crimson-500/50"
        >
          <HanziWatermark char={enemy?.name[0] ?? '敌'} className="-top-4 -right-2 text-[6rem]" />
          <div className="flex size-14 items-center justify-center rounded-full bg-ink-950/80 ring-1 ring-crimson-600/50 sm:size-16">
            <span className="font-display text-2xl text-crimson-400 sm:text-3xl">
              {enemy?.name[0] ?? '敌'}
            </span>
          </div>
          <HpBar
            label={enemy?.name ?? '无名之敌'}
            hp={combat.enemyHp}
            maxHp={enemyMax}
            fillClass="bar-fill-crimson"
            align="right"
          />
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {enemy?.rank && <Badge variant="destructive">{enemy.rank}</Badge>}
            <Badge variant="outline">威能 {enemy?.power ?? '?'}</Badge>
            {enemy && !enemy.fleeable && <Badge variant="destructive">封锁四野</Badge>}
          </div>
        </CornerFrame>
      </div>

      {/* round log */}
      <div className="flex w-full max-w-2xl min-h-0 flex-1 flex-col rounded-md bg-ink-950/60 ring-1 ring-ink-700">
        <p className="border-b border-ink-800 px-4 py-2 font-sans text-[11px] tracking-[0.35em] text-mist-500 select-none">
          战况实录
        </p>
        <div ref={logRef} className="min-h-24 flex-1 overflow-y-auto px-4 py-3">
          {combat.log.length === 0 ? (
            <p className="font-serif text-sm text-mist-500">{enemy?.intro ?? '杀气凝而未发。'}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {combat.log.map((line, i) => (
                <motion.p
                  key={i}
                  initial={reduced || i < combat.log.length - 1 ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'font-serif text-sm leading-6',
                    i === combat.log.length - 1 ? 'text-paper-100' : 'text-paper-500',
                  )}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* tactics */}
      <div className="grid w-full max-w-2xl grid-cols-3 gap-2 sm:grid-cols-6">
        {TACTICS.map(({ cmd, hint, danger }) => {
          const fleeBlocked = cmd === '遁走' && enemy ? !enemy.fleeable : false;
          return (
            <button
              key={cmd}
              onClick={() => execute(cmd)}
              disabled={combat.over || fleeBlocked}
              className={cn(
                'group flex flex-col items-center gap-0.5 rounded-md border px-3 py-2.5 backdrop-blur transition-all disabled:cursor-not-allowed disabled:opacity-35',
                danger
                  ? 'border-crimson-600/40 bg-ink-900/70 hover:border-crimson-500/70 hover:bg-crimson-900/20'
                  : 'border-gold-600/35 bg-ink-900/70 hover:border-gold-400/70 hover:bg-gold-400/10',
              )}
            >
              <span
                className={cn(
                  'font-display text-base tracking-[0.3em]',
                  danger ? 'text-crimson-400' : 'text-gold-300',
                )}
              >
                {cmd}
              </span>
              <span className="font-sans text-[10px] text-mist-500 group-hover:text-mist-300">
                {fleeBlocked ? '遁走无门' : hint}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
