"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useGameStore } from "@/store/gameStore";
import { lookupSpiritRoot } from "@/data/spiritRoots";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiceRoll, type DiceOutcome } from "../DiceRoll";
import { CornerFrame, OrnamentDivider, SealStamp } from "../Ornaments";
import { cn } from "@/lib/utils";

const TIER_TEXT: Record<string, string> = {
  gold: "text-gold-300 text-glow-gold",
  jade: "text-jade-300 text-glow-jade",
  normal: "text-paper-100",
  muted: "text-mist-400",
};

const TIER_OUTCOME: Record<string, DiceOutcome> = {
  gold: "success",
  jade: "neutral",
  normal: "neutral",
  muted: "fail",
};

const TIER_BADGE: Record<string, "gold" | "jade" | "secondary" | "outline"> = {
  gold: "gold",
  jade: "jade",
  normal: "secondary",
  muted: "outline",
};

const MUTANT_ELEMENTS = new Set(["雷", "冰", "风"]);

/**
 * Step 3 — two acts.
 *
 * Act 1 灵根揭示: the D100 committed in SpiritRootStep settles on screen,
 * the 测灵戏文 plays out line by line (click to skip), then the grade banner
 * and 天道 verdict land with a seal stamp.
 *
 * Act 2 暗掷天机: the hidden-fate scroll, sealed forever. 揭签入世 commits
 * the hidden roll and enters the world.
 */
export function HiddenRollStep() {
  const finish = useGameStore((s) => s.creationFinish);
  const root = useGameStore((s) => s.game?.character?.spiritRoot);
  const reduced = useReducedMotion();

  const row = useMemo(
    () => (root ? lookupSpiritRoot(root.rollValue) : null),
    [root],
  );

  const [act, setAct] = useState<"reveal" | "seal">(root ? "reveal" : "seal");
  const [settled, setSettled] = useState(!!reduced);
  const [linesShown, setLinesShown] = useState(reduced ? Number.MAX_SAFE_INTEGER : 0);

  const totalLines = row?.revealLines.length ?? 0;
  const allLinesShown = linesShown >= totalLines;

  // stagger the 测灵戏文 after the die settles
  useEffect(() => {
    if (act !== "reveal" || !settled || allLinesShown) return;
    const t = setTimeout(() => setLinesShown((n) => n + 1), linesShown === 0 ? 500 : 1600);
    return () => clearTimeout(t);
  }, [act, settled, linesShown, allLinesShown]);

  const skipReveal = () => {
    if (!settled || !allLinesShown) {
      setSettled(true);
      setLinesShown(Number.MAX_SAFE_INTEGER);
    }
  };

  if (act === "reveal" && root && row) {
    const tierText = TIER_TEXT[row.color] ?? TIER_TEXT.normal;
    return (
      <div
        className="flex cursor-pointer flex-col items-center gap-6 py-6"
        onClick={skipReveal}
        title="点击跳过"
      >
        <DiceRoll
          value={root.rollValue}
          reason="灵根抽取 · 一掷定终身"
          outcome={TIER_OUTCOME[row.color] ?? "neutral"}
          animate={!settled}
          onSettled={() => setSettled(true)}
        />

        {/* 测灵戏文 — one line at a time */}
        <div className="flex min-h-24 max-w-lg flex-col gap-3 text-center">
          {row.revealLines.slice(0, linesShown).map((line, i) => (
            <motion.p
              key={i}
              initial={reduced ? false : { opacity: 0, y: 10, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="font-serif text-sm leading-7 text-paper-200/90 sm:text-[15px]"
            >
              {line}
            </motion.p>
          ))}
        </div>

        <AnimatePresence>
          {settled && allLinesShown && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full max-w-lg flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CornerFrame className="w-full rounded-md bg-ink-900/70 px-6 py-6 text-center ring-1 ring-ink-600 backdrop-blur-md">
                <div className="flex items-center justify-center gap-4">
                  <SealStamp char={row.grade[0] ?? "灵"} animate={!reduced} />
                  <h2 className={cn("font-display text-3xl tracking-widest sm:text-4xl", tierText)}>
                    {row.label}
                  </h2>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Badge variant={TIER_BADGE[row.color] ?? "secondary"}>
                    修行速率 ×{row.speedMultiplier}
                  </Badge>
                  {root.elements.map((el) => (
                    <Badge key={el} variant={MUTANT_ELEMENTS.has(el) ? "mystic" : "outline"}>
                      {el}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 font-serif text-sm leading-7 text-paper-200/85">{row.blurb}</p>
                <OrnamentDivider className="my-4" />
                <p className="font-serif text-sm leading-7 text-mist-300 italic">{row.verdict}</p>
              </CornerFrame>

              <Button size="lg" className="px-10 tracking-[0.3em]" onClick={() => setAct("seal")}>
                受命 · 再观天机
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.94, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <CornerFrame className="relative overflow-hidden rounded-md bg-ink-900/80 px-14 py-12 text-center ring-1 ring-gold-600/25 backdrop-blur-md sm:px-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(242,190,69,0.07), transparent 60%)",
            }}
          />
          <p className="font-sans text-xs tracking-[0.5em] text-mist-500">暗掷 · 命数</p>
          <div className="mt-6 flex justify-center">
            <SealStamp char="封" animate={!reduced} className="size-16 text-3xl" />
          </div>
          <p className="mt-6 font-serif text-sm leading-7 text-paper-200/85">
            天道于幕后再掷一签,签文深埋因果。
          </p>
          <p className="mt-1 font-serif text-sm leading-7 text-mist-400">
            汝永不得见。唯岁月,替汝揭晓。
          </p>
        </CornerFrame>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.8, duration: 0.6 }}
        className="flex flex-col items-center gap-2"
      >
        <Button size="lg" className="px-12 tracking-[0.4em]" onClick={finish}>
          揭签入世
        </Button>
        <p className="font-sans text-xs text-mist-500">自此,汝之一生,尽付骰中。</p>
      </motion.div>
    </div>
  );
}

export default HiddenRollStep;
