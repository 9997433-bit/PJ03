"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/gameStore";

/** Deterministic pseudo-random particle field (no Math.random — hydration-safe). */
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const a = Math.sin(i * 127.1) * 43758.5453;
  const b = Math.sin(i * 311.7) * 26951.3571;
  const fx = a - Math.floor(a);
  const fy = b - Math.floor(b);
  return {
    left: `${(fx * 100).toFixed(2)}%`,
    top: `${(20 + fy * 75).toFixed(2)}%`,
    size: 1.5 + (i % 3),
    delay: `${((i * 1.7) % 12).toFixed(1)}s`,
    duration: `${(14 + ((i * 3.3) % 10)).toFixed(1)}s`,
    gold: i % 3 === 0,
  };
});

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function TitlePage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const hydrated = useGameStore((s) => s.hydrated);
  const hasSave = useGameStore((s) => s.hasSave());
  const newGame = useGameStore((s) => s.newGame);
  const restart = useGameStore((s) => s.restart);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Rehydrate persisted save on mount (store uses skipHydration for SSG safety).
  useEffect(() => {
    useGameStore.persist.rehydrate();
  }, []);

  const beginNewLife = useCallback(() => {
    newGame();
    router.push("/game");
  }, [newGame, router]);

  const handleStart = useCallback(() => {
    if (hasSave) {
      setConfirmOpen(true); // starting anew destroys the existing life — confirm
    } else {
      beginNewLife();
    }
  }, [hasSave, beginNewLife]);

  const handleContinue = useCallback(() => {
    router.push("/game");
  }, [router]);

  const handleRestartConfirmed = useCallback(() => {
    setConfirmOpen(false);
    restart();
    router.push("/game");
  }, [restart, router]);

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[var(--bg,#0B0F0E)] text-[var(--ink-text,#D8D3C4)]">
      {/* ===== animated ink mist ===== */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="mist mist-1" />
        <div className="mist mist-2" />
        <div className="mist mist-3" />
        {/* drifting qi motes */}
        {!reducedMotion &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              className="mote"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
                background: p.gold
                  ? "var(--gold,#C9A227)"
                  : "var(--jade,#3E9B7A)",
              }}
            />
          ))}
        {/* ink-wash vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(4,7,6,0.88)_100%)]" />
        {/* faint watermark hanzi */}
        <span className="absolute -right-8 top-1/2 hidden -translate-y-1/2 select-none font-[family-name:var(--font-mashan)] text-[22rem] leading-none text-[var(--jade,#3E9B7A)]/[0.045] lg:block">
          道
        </span>
        <span className="absolute -left-10 bottom-0 hidden select-none font-[family-name:var(--font-mashan)] text-[16rem] leading-none text-[var(--gold,#C9A227)]/[0.04] lg:block">
          仙
        </span>
      </div>

      {/* ===== title block ===== */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center px-6 text-center">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.1}
          className="mb-6 select-none font-[family-name:var(--font-noto-serif)] text-sm tracking-[0.6em] text-[var(--muted,#7C8A80)]"
        >
          凡人之躯 · 逆天而行
        </motion.p>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.35}
          className="select-none font-[family-name:var(--font-mashan)] text-6xl leading-tight sm:text-7xl md:text-8xl"
        >
          <span className="gold-ink">凡人修仙传</span>
        </motion.h1>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.65}
          className="mt-4 flex items-center gap-4"
        >
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--gold,#C9A227)]/60 sm:w-20" />
          <h2 className="select-none font-[family-name:var(--font-mashan)] text-2xl tracking-[0.35em] text-[var(--ink-text,#D8D3C4)]/90 sm:text-3xl">
            人生模拟器
          </h2>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--gold,#C9A227)]/60 sm:w-20" />
        </motion.div>

        {/* red seal stamp */}
        <motion.div
          initial={{ opacity: 0, scale: 1.6, rotate: -18 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ delay: 1.15, duration: 0.45, ease: "backOut" }}
          className="mt-8 flex h-14 w-14 select-none items-center justify-center border-2 border-[var(--vermilion,#B3402E)] bg-[var(--vermilion,#B3402E)]/15 font-[family-name:var(--font-mashan)] text-2xl leading-none text-[var(--vermilion,#B3402E)] shadow-[0_0_18px_rgba(179,64,46,0.35)]"
        >
          天道
        </motion.div>

        {/* ===== actions ===== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1.0}
          className="mt-12 flex w-full max-w-xs flex-col items-stretch gap-3"
        >
          <Button
            onClick={handleStart}
            disabled={!hydrated}
            className="h-12 border border-[var(--gold,#C9A227)]/60 bg-[var(--gold,#C9A227)]/10 font-[family-name:var(--font-noto-serif)] text-base tracking-[0.5em] text-[var(--gold-bright,#E8C96A)] transition-all hover:border-[var(--gold-bright,#E8C96A)] hover:bg-[var(--gold,#C9A227)]/20 hover:shadow-[0_0_24px_rgba(201,162,39,0.25)]"
          >
            开始游戏
          </Button>

          {hydrated && hasSave && (
            <Button
              onClick={handleContinue}
              variant="outline"
              className="h-12 border-[var(--jade,#3E9B7A)]/50 bg-transparent font-[family-name:var(--font-noto-serif)] text-base tracking-[0.5em] text-[var(--jade-bright,#5FD4A7)] transition-all hover:border-[var(--jade-bright,#5FD4A7)] hover:bg-[var(--jade,#3E9B7A)]/10"
            >
              继续
            </Button>
          )}

          {hydrated && hasSave && (
            <Button
              onClick={() => setConfirmOpen(true)}
              variant="ghost"
              className="h-10 font-[family-name:var(--font-noto-serif)] text-sm tracking-[0.5em] text-[var(--muted,#7C8A80)] transition-colors hover:bg-[var(--vermilion,#B3402E)]/10 hover:text-[var(--vermilion,#B3402E)]"
            >
              重开
            </Button>
          )}
        </motion.div>
      </div>

      {/* footer */}
      <motion.footer
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={1.4}
        className="absolute bottom-8 z-10 select-none px-4 text-center font-[family-name:var(--font-noto-serif)] text-xs tracking-[0.4em] text-[var(--muted,#7C8A80)]/80"
      >
        天道无情，以万物为刍狗。
      </motion.footer>

      {/* ===== 重开 confirm ===== */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--border,#2A3A32)] bg-[var(--surface,#121815)] text-[var(--ink-text,#D8D3C4)]"
        >
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-mashan)] text-2xl text-[var(--vermilion,#B3402E)]">
              因果尽散，再入轮回？
            </DialogTitle>
            <DialogDescription className="font-[family-name:var(--font-noto-serif)] leading-7 text-[var(--muted,#7C8A80)]">
              此世一切修为、灵石、因果，皆将归于虚无。天道不留情面，亦不容反悔。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 bg-transparent">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="text-[var(--muted,#7C8A80)] hover:text-[var(--ink-text,#D8D3C4)]"
            >
              且慢
            </Button>
            <Button
              onClick={handleRestartConfirmed}
              className="border border-[var(--vermilion,#B3402E)]/60 bg-[var(--vermilion,#B3402E)]/15 text-[var(--vermilion,#B3402E)] hover:bg-[var(--vermilion,#B3402E)]/30"
            >
              再入轮回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* scoped animations */}
      <style>{`
        .gold-ink {
          background: linear-gradient(175deg, var(--gold-bright, #E8C96A) 8%, var(--gold, #C9A227) 45%, #8a6d1c 90%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 60px rgba(201, 162, 39, 0.28);
        }
        .mist {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.5;
          will-change: transform;
        }
        .mist-1 {
          width: 60vw; height: 45vh; left: -10vw; top: 8vh;
          background: radial-gradient(ellipse, rgba(62, 155, 122, 0.16), transparent 70%);
        }
        .mist-2 {
          width: 55vw; height: 40vh; right: -12vw; bottom: 4vh;
          background: radial-gradient(ellipse, rgba(201, 162, 39, 0.10), transparent 70%);
        }
        .mist-3 {
          width: 45vw; height: 38vh; left: 28vw; top: 42vh;
          background: radial-gradient(ellipse, rgba(216, 211, 196, 0.06), transparent 70%);
        }
        .mote {
          position: absolute;
          border-radius: 9999px;
          opacity: 0;
        }
        @media (prefers-reduced-motion: no-preference) {
          .mist-1 { animation: drift-a 26s ease-in-out infinite alternate; }
          .mist-2 { animation: drift-b 32s ease-in-out infinite alternate; }
          .mist-3 { animation: drift-c 38s ease-in-out infinite alternate; }
          .mote { animation-name: rise; animation-timing-function: linear; animation-iteration-count: infinite; }
        }
        @keyframes drift-a {
          from { transform: translate3d(0, 0, 0) scale(1); }
          to { transform: translate3d(8vw, -5vh, 0) scale(1.15); }
        }
        @keyframes drift-b {
          from { transform: translate3d(0, 0, 0) scale(1.1); }
          to { transform: translate3d(-9vw, -6vh, 0) scale(0.95); }
        }
        @keyframes drift-c {
          from { transform: translate3d(0, 0, 0) scale(0.9); }
          to { transform: translate3d(6vw, 7vh, 0) scale(1.2); }
        }
        @keyframes rise {
          0% { transform: translateY(0); opacity: 0; }
          12% { opacity: 0.7; }
          85% { opacity: 0.25; }
          100% { transform: translateY(-38vh); opacity: 0; }
        }
      `}</style>
    </main>
  );
}
