"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { Die } from "@/engine/types";
import { CornerFrame } from "@/components/game/Ornaments";
import { cn } from "@/lib/utils";

export type DiceOutcome = "success" | "fail" | "neutral";

export interface DiceRollProps {
  die?: Die;
  /** Final value. The scramble settles on this. */
  value: number;
  /** e.g. 灵根抽取 / 突破·筑基 */
  reason?: string;
  /** Colors the settle flash: gold / crimson / jade. */
  outcome?: DiceOutcome;
  /** Skip the scramble and show the settled value immediately. */
  animate?: boolean;
  /** Total scramble duration before settling. */
  durationMs?: number;
  size?: "sm" | "lg";
  onSettled?: () => void;
  className?: string;
}

const DIE_MAX: Record<Die, number> = { D100: 100, D20: 20, D6: 6 };

/**
 * The D100 reveal: numbers scramble with decelerating ticks, settle on the
 * true value, then flash — gold for success, crimson for failure.
 */
export function DiceRoll({
  die = "D100",
  value,
  reason,
  outcome = "neutral",
  animate = true,
  durationMs = 1600,
  size = "lg",
  onSettled,
  className,
}: DiceRollProps) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = React.useState<number>(animate ? 0 : value);
  const [settled, setSettled] = React.useState(!animate);
  const onSettledRef = React.useRef(onSettled);
  onSettledRef.current = onSettled;

  React.useEffect(() => {
    if (!animate || reducedMotion) {
      setDisplay(value);
      setSettled(true);
      if (animate) onSettledRef.current?.();
      return;
    }

    setSettled(false);
    const max = DIE_MAX[die];
    let elapsed = 0;
    let delay = 42;
    let cancelled = false;
    let timer: number;

    const tick = () => {
      if (cancelled) return;
      elapsed += delay;
      if (elapsed >= durationMs) {
        setDisplay(value);
        setSettled(true);
        onSettledRef.current?.();
        return;
      }
      setDisplay(1 + Math.floor(Math.random() * max));
      // decelerate — the last few ticks land slow and heavy
      delay = Math.min(delay * 1.13, 220);
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [animate, die, durationMs, reducedMotion, value]);

  const outcomeClasses = settled
    ? outcome === "success"
      ? "text-gold-300 text-glow-gold"
      : outcome === "fail"
        ? "text-crimson-400 text-glow-crimson"
        : "text-jade-300 text-glow-jade"
    : "text-paper-200";

  const frameOutcome = settled
    ? outcome === "success"
      ? "ring-gold-400/60 shadow-[0_0_36px_rgba(242,190,69,0.3)]"
      : outcome === "fail"
        ? "ring-crimson-500/60 shadow-[0_0_36px_rgba(157,41,51,0.4)]"
        : "ring-jade-400/50 shadow-[0_0_30px_rgba(27,209,165,0.22)]"
    : "ring-ink-600";

  return (
    <CornerFrame
      className={cn(
        "inline-flex flex-col items-center justify-center gap-1 rounded-md bg-ink-900/80 ring-1 backdrop-blur-md transition-all duration-300",
        size === "lg" ? "min-w-36 px-6 py-5" : "min-w-24 px-4 py-3",
        settled && outcome === "fail" && !reducedMotion && "animate-crack-shake",
        frameOutcome,
        className
      )}
      cornerClassName={
        settled && outcome === "success" ? "border-gold-300" : undefined
      }
    >
      <span className="font-mono text-[10px] tracking-[0.35em] text-mist-400 select-none">
        {die}
      </span>
      <motion.span
        key={settled ? "settled" : "rolling"}
        animate={
          settled && !reducedMotion ? { scale: [1.35, 1] } : { scale: 1 }
        }
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className={cn(
          "font-display tabular-nums leading-none transition-colors duration-200",
          size === "lg" ? "text-6xl" : "text-4xl",
          outcomeClasses
        )}
      >
        {display}
      </motion.span>
      {reason ? (
        <span className="pt-1 font-serif text-xs tracking-[0.25em] text-paper-200/80">
          {reason}
        </span>
      ) : null}
    </CornerFrame>
  );
}
