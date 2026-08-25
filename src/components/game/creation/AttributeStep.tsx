"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { ATTR_CAP, FREE_POINTS } from "@/engine/stubEngine";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { ATTRIBUTE_META, VISIBLE_ATTRIBUTES, cnNum } from "../format";
import { CornerFrame } from "../Ornaments";
import { cn } from "@/lib/utils";

type Key = (typeof VISIBLE_ATTRIBUTES)[number];

/** Step 1 — 命格. Interactive point allocation with live bars. */
export function AttributeStep() {
  const game = useGameStore((s) => s.game);
  const allocate = useGameStore((s) => s.creationAllocate);
  const reduced = useReducedMotion();
  const base = game?.character?.attributes;

  const initial = useMemo(
    () =>
      base
        ? { genGu: base.genGu, wuXing: base.wuXing, xinXing: base.xinXing, qiYun: base.qiYun }
        : { genGu: 5, wuXing: 5, xinXing: 5, qiYun: 5 },
    [base],
  );

  const [vals, setVals] = useState(initial);

  if (!base) return null;

  const spent = VISIBLE_ATTRIBUTES.reduce((n, k) => n + (vals[k] - base[k]), 0);
  const left = FREE_POINTS - spent;

  const bump = (key: Key, d: number) => {
    setVals((v) => {
      const next = { ...v, [key]: v[key] + d };
      if (next[key] < base[key] || next[key] > ATTR_CAP) return v;
      const s = VISIBLE_ATTRIBUTES.reduce((n, k) => n + (next[k] - base[k]), 0);
      if (s > FREE_POINTS) return v;
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <p className="font-sans text-xs tracking-[0.4em] text-mist-500">凡躯有限 · 取舍由汝</p>
        <p className="mt-2 font-display text-lg text-paper-100">
          可分点数{" "}
          <span
            className={cn(
              "text-2xl tabular-nums",
              left > 0 ? "text-gold-300 text-glow-gold" : "text-jade-300",
            )}
          >
            {cnNum(left)}
          </span>
          <span className="ml-1 font-sans text-xs text-mist-500">/ {FREE_POINTS}</span>
        </p>
        <p className="mt-1 font-sans text-xs text-mist-500">出身际遇已计入基础值,机缘一项天道自掌。</p>
      </div>

      <div className="flex flex-col gap-3">
        {VISIBLE_ATTRIBUTES.map((k) => {
          const meta = ATTRIBUTE_META[k];
          const added = vals[k] - base[k];
          return (
            <CornerFrame
              key={k}
              className="rounded-md bg-ink-900/70 px-4 py-3.5 ring-1 ring-ink-700 backdrop-blur-md"
              cornerClassName={added > 0 ? "border-gold-400/60" : "border-ink-500/60"}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-base tracking-widest text-paper-100">
                    {meta.label}
                    {added > 0 && (
                      <span className="ml-2 font-sans text-xs text-gold-300 tabular-nums">+{added}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate font-sans text-[11px] text-mist-500">{meta.hint}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`${meta.label} 减一`}
                    onClick={() => bump(k, -1)}
                    disabled={vals[k] <= base[k]}
                  >
                    −
                  </Button>
                  <span className="w-7 text-center font-display text-xl text-gold-300 tabular-nums">
                    {vals[k]}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`${meta.label} 加一`}
                    onClick={() => bump(k, 1)}
                    disabled={vals[k] >= ATTR_CAP || left <= 0}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="bar-track mt-2.5 h-1.5">
                <motion.div
                  className="bar-fill-jade h-full"
                  animate={{ width: `${(vals[k] / ATTR_CAP) * 100}%` }}
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }}
                />
              </div>
            </CornerFrame>
          );
        })}
      </div>

      <Button
        size="lg"
        disabled={left !== 0}
        className="w-full tracking-[0.3em]"
        onClick={() => allocate(vals)}
      >
        {left > 0 ? `尚余${cnNum(left)}点未定` : "定格命格"}
      </Button>
    </div>
  );
}

export default AttributeStep;
