'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { BreakthroughFx } from '@/store/gameStore';

/**
 * The premium moment: dim → heartbeat → D100 number-scramble → reveal vs
 * target → gold flash (success) or red vignette (failure).
 */
export function BreakthroughModal({ fx, onClose }: { fx: BreakthroughFx; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<'charge' | 'scramble' | 'reveal'>(reduced ? 'reveal' : 'charge');
  const [scrambleValue, setScrambleValue] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t1 = setTimeout(() => setStage('scramble'), 1100);
    const t2 = setTimeout(() => setStage('reveal'), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  useEffect(() => {
    if (stage !== 'scramble') return;
    const timer = setInterval(() => setScrambleValue(Math.floor(Math.random() * 100) + 1), 55);
    return () => clearInterval(timer);
  }, [stage]);

  const success = fx.success;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-ink-950/95 p-6 backdrop-blur-md ${
          stage === 'reveal' && !success ? 'animate-screen-crack' : ''
        }`}
        onClick={stage === 'reveal' ? onClose : undefined}
      >
        {/* jade radial glow behind everything */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              stage === 'reveal' && success
                ? 'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--color-gold-400) 14%, transparent), transparent 60%)'
                : 'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--color-jade-400) 8%, transparent), transparent 55%)',
          }}
        />

        <p className="font-sans mb-6 text-xs tracking-[0.5em] text-paper-500">冲击 · {fx.realmName}</p>

        {stage === 'charge' && (
          <motion.div
            className="animate-heartbeat flex h-36 w-36 items-center justify-center rounded-full border-2 border-jade-600/60"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span className="font-display text-3xl text-jade-400">凝神</span>
          </motion.div>
        )}

        {stage === 'scramble' && (
          <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-gold-600/60">
            <span className="font-display text-6xl text-gold-300 tabular-nums">{scrambleValue}</span>
          </div>
        )}

        {stage === 'reveal' && (
          <motion.div
            initial={reduced ? {} : { scale: 0.8, filter: 'blur(8px)', opacity: 0 }}
            animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <div
              className={`flex h-36 w-36 items-center justify-center rounded-full border-2 ${
                success ? 'border-gold-400 shadow-[0_0_60px_-10px_var(--color-gold-400)]' : 'border-crimson-500'
              }`}
            >
              <span className={`font-display text-6xl tabular-nums ${success ? 'text-gold-300' : 'text-crimson-500'}`}>
                {fx.roll}
              </span>
            </div>
            <p className="font-sans mt-4 text-xs text-paper-500 tabular-nums">
              D100 = {fx.roll} · 须 ≤ {fx.chance}
            </p>
            <h2
              className={`font-display mt-6 text-5xl tracking-wide sm:text-6xl ${
                success ? 'text-gold-gradient' : 'text-crimson-500'
              }`}
            >
              {fx.died ? '兵解殒身' : success ? `${fx.realmName} · 成` : '突破失败'}
            </h2>
            <p className="font-serif mt-4 max-w-sm text-center text-sm leading-7 text-paper-400">
              {fx.died
                ? '强越天堑者，十死无生。'
                : success
                  ? '天地灵气为之一滞。自此，汝非昨日之汝。'
                  : '气机逆行，经脉俱震。汝之道，止步于此乎？'}
            </p>
            <button
              onClick={onClose}
              className="mt-8 border border-ink-500 px-8 py-2 font-sans text-sm tracking-[0.4em] text-paper-200 transition-colors hover:border-gold-600/60 hover:text-gold-300"
            >
              {fx.died ? '尘归尘' : '继续'}
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
