"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const hydrate = useGameStore((s) => s.hydrate);
  const hasSave = useGameStore((s) => s.hasSave);
  const newGame = useGameStore((s) => s.newGame);
  const continueGame = useGameStore((s) => s.continueGame);
  const restart = useGameStore((s) => s.restart);
  const [confirmRebirth, setConfirmRebirth] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const start = () => {
    newGame();
    router.push("/game");
  };

  const cont = () => {
    if (continueGame()) router.push("/game");
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-950 px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(27,209,165,0.12),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center gap-10 text-center"
      >
        <p className="font-serif text-sm tracking-[0.5em] text-jade-400/80">天道为证</p>
        <h1 className="font-display text-5xl leading-tight text-transparent sm:text-7xl bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text">
          凡人修仙传
        </h1>
        <p className="font-display text-2xl text-gold-400/70 sm:text-3xl">人生模拟器</p>
        <p className="max-w-md font-serif text-base leading-8 text-paper-200/70">
          仙凡有别，弱肉强食。汝之一生，由天定签、由己择路。
          <br />
          修炼、突破、探索、坊市——一切因果，皆有代价。
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={start}
            className="min-w-[160px] border border-gold-500/50 bg-gold-500/10 font-serif tracking-[0.3em] text-gold-200 hover:bg-gold-500/20"
          >
            开始游戏
          </Button>
          {hasSave() && (
            <Button
              size="lg"
              variant="outline"
              onClick={cont}
              className="min-w-[160px] border-jade-600/40 font-serif tracking-[0.3em] text-jade-200"
            >
              继续修行
            </Button>
          )}
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setConfirmRebirth(true)}
            className="min-w-[160px] font-serif tracking-[0.3em] text-mist-400"
          >
            轮回重开
          </Button>
        </div>

        <p className="text-xs text-mist-600">
          Next.js · 纯前端 · 本地存档 ·{" "}
          <Link href="https://github.com" className="underline hover:text-mist-400">
            凡人流文字模拟
          </Link>
        </p>
      </motion.div>

      <Dialog open={confirmRebirth} onOpenChange={setConfirmRebirth}>
        <DialogContent className="border-ink-700 bg-ink-900 text-paper-100">
          <DialogHeader>
            <DialogTitle className="font-display text-gold-300">再入轮回？</DialogTitle>
            <DialogDescription className="text-mist-400">
              此生修为、灵石、因果，尽归虚无。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRebirth(false)}>
              且慢
            </Button>
            <Button
              onClick={() => {
                restart();
                setConfirmRebirth(false);
                router.push("/game");
              }}
              className="text-crimson-400"
            >
              散尽因果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
