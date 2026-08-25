'use client';

/**
 * Title screen — 玄墨鎏金. Layered drifting mist, rising qi motes,
 * vertical calligraphy watermarks, gold-shimmer title with the red
 * 「仙」 seal, and the three fates: 开始游戏 / 继续修行 / 轮回重开.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** deterministic pseudo-random motes — no Math.random, so SSR HTML matches */
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 61.8 + 7) % 100}%`,
  size: 2 + (i % 3),
  delay: `${(i * 1.9) % 14}s`,
  duration: `${11 + (i % 5) * 3}s`,
  opacity: 0.25 + ((i * 13) % 40) / 100,
  drift: `${(((i * 37) % 64) - 32)}px`,
  gold: i % 4 === 0,
}));

const enter = (delay: number, reduced: boolean | null) =>
  reduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const },
      };

export default function TitlePage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);
  const corruptSave = useGameStore((s) => s.corruptSave);
  // subscribe to the game slice itself so the buttons react to the save state
  const hasSave = useGameStore((s) => s.game !== null && s.game.phase !== 'title');
  const saveName = useGameStore((s) => s.game?.character?.name ?? null);
  const newGame = useGameStore((s) => s.newGame);
  const restart = useGameStore((s) => s.restart);

  const [confirm, setConfirm] = useState<'start' | 'rebirth' | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const beginNewLife = useCallback(() => {
    setConfirm(null);
    newGame();
    router.push('/game');
  }, [newGame, router]);

  const handleStart = useCallback(() => {
    // starting anew over an existing life is destructive — ask first
    if (hasSave) setConfirm('start');
    else beginNewLife();
  }, [hasSave, beginNewLife]);

  const handleRebirth = useCallback(() => {
    setConfirm(null);
    restart();
    router.push('/game');
  }, [restart, router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* ===== atmosphere: drifting mist + rising qi motes ===== */}
      <div aria-hidden className="mist-layer" />
      <div aria-hidden className="mist-layer mist-layer-2" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="qi-particle"
            style={
              {
                left: m.left,
                width: m.size,
                height: m.size,
                background: m.gold ? 'var(--color-gold-400)' : 'var(--color-jade-400)',
                boxShadow: m.gold
                  ? '0 0 6px 1px rgba(242,190,69,0.5)'
                  : '0 0 6px 1px rgba(27,209,165,0.45)',
                animationDelay: m.delay,
                animationDuration: m.duration,
                '--p-opacity': m.opacity,
                '--p-drift': m.drift,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* ===== vertical calligraphy watermarks ===== */}
      <p
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 font-display text-2xl leading-[2.1] tracking-[0.4em] text-paper-50/[0.05] select-none md:block"
        style={{ writingMode: 'vertical-rl' }}
      >
        天地不仁以万物为刍狗
      </p>
      <p
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 font-display text-2xl leading-[2.1] tracking-[0.4em] text-paper-50/[0.05] select-none md:block"
        style={{ writingMode: 'vertical-rl' }}
      >
        大道五十天衍四九人遁其一
      </p>

      {/* ===== title block ===== */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.p
          {...enter(0.1, reduced)}
          className="mb-6 font-sans text-xs tracking-[0.6em] text-jade-400/80 select-none"
        >
          天道为证 · 仙途自择
        </motion.p>

        <motion.div {...enter(0.3, reduced)} className="relative">
          <h1 className="text-gold-gradient text-glow-gold font-display text-6xl leading-tight sm:text-8xl">
            凡人修仙传
          </h1>
          {/* red seal 印章 */}
          <span
            aria-hidden
            className="seal-stamp absolute -right-4 -top-3 h-10 w-10 text-xl sm:-right-12 sm:-top-2 sm:h-12 sm:w-12 sm:text-2xl"
          >
            仙
          </span>
        </motion.div>

        <motion.p
          {...enter(0.55, reduced)}
          className="mt-4 font-display text-2xl tracking-[0.5em] text-paper-200/85 sm:text-3xl"
        >
          人生模拟器
        </motion.p>

        <motion.div {...enter(0.75, reduced)} className="ornament-divider mt-8 w-56 sm:w-72" />

        <motion.p
          {...enter(0.85, reduced)}
          className="mt-6 max-w-md font-serif text-sm leading-8 text-paper-400"
        >
          灵根由天掷，命途由己择。修炼、突破、探索、坊市——
          <br />
          一世凡躯六十载，可否问鼎化神，全看这一把把骰子。
        </motion.p>

        {/* ===== the three fates ===== */}
        <motion.div
          {...enter(1.05, reduced)}
          className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        >
          <Button
            size="lg"
            onClick={handleStart}
            className="min-w-[176px] border border-gold-500/60 bg-gold-500/10 font-serif text-base tracking-[0.35em] text-gold-200 shadow-[0_0_24px_-6px_rgba(242,190,69,0.35)] transition-all hover:bg-gold-500/25 hover:shadow-[0_0_32px_-4px_rgba(242,190,69,0.5)]"
          >
            开始游戏
          </Button>
          {hydrated && hasSave && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/game')}
              className="min-w-[176px] border-jade-600/50 font-serif text-base tracking-[0.35em] text-jade-300 hover:bg-jade-400/10"
            >
              继续修行
            </Button>
          )}
          {hydrated && hasSave && (
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setConfirm('rebirth')}
              className="min-w-[176px] font-serif text-base tracking-[0.35em] text-mist-400 hover:text-crimson-400"
            >
              轮回重开
            </Button>
          )}
        </motion.div>

        {hydrated && corruptSave && (
          <motion.p
            {...enter(1.2, reduced)}
            className="mt-5 font-serif text-xs text-crimson-500/90"
          >
            天道垂察：上世存档因果紊乱，已被天道拒收。唯有重开一世。
          </motion.p>
        )}

        <motion.p
          {...enter(1.3, reduced)}
          className="mt-12 font-sans text-[11px] tracking-[0.3em] text-paper-500/60 select-none"
        >
          纯前端 · 本地存档 · D100天道掷骰 · 拒改档
        </motion.p>
      </div>

      {/* version — subtle, bottom corner */}
      <span
        aria-hidden
        className="absolute bottom-3 right-4 z-10 font-sans text-[10px] tracking-widest text-paper-500/35 select-none"
      >
        v1.0.0
      </span>

      {/* ===== confirm: 开始游戏 over an existing life ===== */}
      <Dialog open={confirm === 'start'} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="border-gold-600/30 bg-ink-900">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-gold-300">另起一世？</DialogTitle>
            <DialogDescription className="font-serif leading-7 text-paper-400">
              {saveName ? `「${saveName}」的` : '当前'}
              修行尚在存档之中。另起新生将覆盖此存档，前尘因果一笔勾销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              且慢
            </Button>
            <Button
              variant="outline"
              className="border-gold-600/60 text-gold-300 hover:bg-gold-400/10"
              onClick={beginNewLife}
            >
              覆而新生
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== confirm: 轮回重开 ===== */}
      <Dialog open={confirm === 'rebirth'} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="border-crimson-600/40 bg-ink-900">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-crimson-400">再入轮回？</DialogTitle>
            <DialogDescription className="font-serif leading-7 text-paper-400">
              此生修为、灵石、恩怨情仇，尽归虚无。天道重掷骰，此举不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              且慢
            </Button>
            <Button
              variant="outline"
              className="border-crimson-600/60 text-crimson-400 hover:bg-crimson-600/10"
              onClick={handleRebirth}
            >
              散尽因果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
