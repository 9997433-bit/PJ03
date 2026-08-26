"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useGameStore } from "@/store/gameStore";
import { SPIRIT_ROOT_PRELUDE } from "@/data/spiritRoots";
import { Button } from "@/components/ui/button";
import { HanziWatermark } from "../Ornaments";

/**
 * Step 2 — 测灵.  The build-up half of the spirit-root lottery: prelude
 * lines fade in, the 测灵碑 looms, and pressing 触碑测灵 charges the stone
 * before the D100 is committed.  The settle-and-reveal cinematic plays in
 * HiddenRollStep, because rolling advances creationStep immediately.
 */
export function SpiritRootStep() {
  const roll = useGameStore((s) => s.creationRollRoot);
  const reduced = useReducedMotion();
  const [charging, setCharging] = useState(false);

  // Commit the roll only after the stone has visibly gathered light.
  useEffect(() => {
    if (!charging) return;
    const t = setTimeout(() => roll(), reduced ? 0 : 1500);
    return () => clearTimeout(t);
  }, [charging, reduced, roll]);

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      {/* prelude — the three lines every mortal hears before the stone */}
      <div className="flex max-w-md flex-col gap-3 text-center">
        {SPIRIT_ROOT_PRELUDE.map((line, i) => (
          <motion.p
            key={i}
            initial={reduced ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: reduced ? 0 : 0.35 + i * 0.75, duration: 0.7, ease: "easeOut" }}
            className="font-serif text-sm leading-7 text-paper-200/90 sm:text-[15px]"
          >
            {line}
          </motion.p>
        ))}
      </div>

      {/* the 测灵碑 — three hundred years of verdicts */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={
          charging && !reduced
            ? {
                opacity: 1,
                scale: [1, 1.015, 1],
                boxShadow: [
                  "0 0 0px rgba(27,209,165,0)",
                  "0 0 55px rgba(27,209,165,0.35)",
                  "0 0 24px rgba(27,209,165,0.2)",
                ],
              }
            : { opacity: 1, scale: 1 }
        }
        transition={
          charging
            ? { duration: 0.75, repeat: Infinity, repeatType: "mirror" }
            : { delay: reduced ? 0 : 2.4, duration: 0.9, ease: "easeOut" }
        }
        className="relative flex h-56 w-36 items-end justify-center overflow-hidden rounded-t-[4.5rem] bg-gradient-to-b from-ink-700/80 via-ink-800 to-ink-950 ring-1 ring-ink-600 sm:h-64 sm:w-40"
      >
        <HanziWatermark char="灵" className="inset-0 flex items-center justify-center text-[7rem]" />
        {/* hairline crack from a former prodigy */}
        <span
          aria-hidden
          className="absolute top-6 left-1/3 h-24 w-px rotate-12 bg-paper-50/10"
        />
        {charging && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: reduced ? 0.5 : [0.15, 0.6, 0.3] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "mirror" }}
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 65%, rgba(27,209,165,0.3), transparent 65%)",
            }}
          />
        )}
        <p className="relative z-10 pb-4 font-display text-xs tracking-[0.4em] text-mist-500 select-none">
          测灵碑
        </p>
      </motion.div>

      {charging ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-serif text-sm tracking-widest text-jade-300"
        >
          掌心贴上碑面……灵光,渐起。
        </motion.p>
      ) : (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 2.9, duration: 0.6 }}
          className="flex flex-col items-center gap-2"
        >
          <Button size="lg" className="px-10 tracking-[0.3em]" onClick={() => setCharging(true)}>
            触碑测灵
          </Button>
          <p className="font-sans text-xs text-mist-500">天道掷签,一掷定终身,不容重抽。</p>
        </motion.div>
      )}
    </div>
  );
}

export default SpiritRootStep;
