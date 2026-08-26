"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { ORIGINS, type OriginData } from "@/data/origins";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CornerFrame, OrnamentDivider, SealStamp } from "../Ornaments";
import { ATTRIBUTE_META, type VisibleAttributeKey } from "../format";
import { cn } from "@/lib/utils";

function modBadges(o: OriginData) {
  return (Object.entries(o.attributeMods) as [string, number][])
    .filter(([k, v]) => v !== 0 && k in ATTRIBUTE_META)
    .map(([k, v]) => ({
      key: k,
      label: `${ATTRIBUTE_META[k as VisibleAttributeKey].label}${v > 0 ? `+${v}` : v}`,
      positive: v > 0,
    }));
}

/** Step 0 — 出身. Six fates on the table; hover to glint, pick to read. */
export function OriginStep() {
  const choose = useGameStore((s) => s.creationChoose);
  const reduced = useReducedMotion();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"男" | "女">("男");
  const [picked, setPicked] = useState<string | null>(null);

  const pickedOrigin = ORIGINS.find((o) => o.id === picked) ?? null;

  return (
    <div className="space-y-6">
      {/* identity */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="道号(至多六字)"
          maxLength={6}
          className="h-11 flex-1 text-center font-serif tracking-[0.3em]"
        />
        <div className="flex gap-2">
          {(["男", "女"] as const).map((g) => (
            <Button
              key={g}
              variant={gender === g ? "default" : "outline"}
              className="h-11 w-14"
              onClick={() => setGender(g)}
            >
              {g}
            </Button>
          ))}
        </div>
      </div>

      {/* six origin cards */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        initial={reduced ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.09 } } }}
      >
        {ORIGINS.map((o) => {
          const active = picked === o.id;
          return (
            <motion.button
              key={o.id}
              type="button"
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.97 },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 260, damping: 24 },
                },
              }}
              whileHover={reduced ? undefined : { y: -3 }}
              onClick={() => setPicked(o.id)}
              className={cn(
                "group relative rounded-md p-4 text-left ring-1 backdrop-blur-md transition-all duration-300",
                active
                  ? "bg-ink-900/85 ring-gold-500/70 shadow-[0_0_30px_-6px_rgba(242,190,69,0.35)]"
                  : "bg-ink-900/60 ring-ink-700 hover:ring-gold-600/50 hover:shadow-[0_0_24px_-8px_rgba(242,190,69,0.25)]",
              )}
            >
              {active && (
                <CornerFrame
                  className="pointer-events-none absolute inset-0"
                  cornerClassName="border-gold-400"
                />
              )}
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  className={cn(
                    "font-display text-xl tracking-wider transition-colors",
                    active ? "text-gold-300 text-glow-gold" : "text-gold-300/85 group-hover:text-gold-300",
                  )}
                >
                  {o.name}
                </h3>
                <span className="shrink-0 font-sans text-[10px] text-mist-500 tabular-nums">
                  {o.startSpiritStones} 灵石
                </span>
              </div>
              <p className="mt-2 line-clamp-2 font-serif text-[13px] leading-6 text-paper-300/85 italic">
                {o.tagline}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {modBadges(o).map((b) => (
                  <Badge key={b.key} variant={b.positive ? "jade" : "destructive"} className="text-[10px]">
                    {b.label}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[10px]">
                  {o.perkName ?? "特性"}
                </Badge>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* backstory preview */}
      <AnimatePresence mode="wait">
        {pickedOrigin && (
          <motion.div
            key={pickedOrigin.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <CornerFrame className="relative rounded-md bg-ink-900/70 p-5 ring-1 ring-ink-600 backdrop-blur-md sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-[11px] tracking-[0.4em] text-mist-500">前尘</p>
                  <h4 className="mt-1 font-display text-2xl text-gold-300">{pickedOrigin.name}</h4>
                </div>
                <SealStamp char={pickedOrigin.name[0] ?? "命"} animate={!reduced} />
              </div>
              <p className="mt-3 font-serif text-sm leading-8 text-paper-200/90">
                {pickedOrigin.story}
              </p>
              <OrnamentDivider className="my-4" />
              <p className="font-sans text-xs leading-6 text-mist-300">
                <span className="text-gold-600">{pickedOrigin.perkName ?? "特性"}</span> ·{" "}
                {pickedOrigin.perkDesc ?? ""}
              </p>
            </CornerFrame>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="lg"
        disabled={!picked || !name.trim()}
        onClick={() => picked && choose(name.trim(), gender, picked)}
        className="w-full tracking-[0.3em]"
      >
        {!name.trim() ? "先取道号" : !picked ? "再择出身" : "定出身 · 入此生"}
      </Button>
    </div>
  );
}

export default OriginStep;
