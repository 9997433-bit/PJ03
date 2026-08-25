"use client";

import * as React from "react";
import { Gem, Hourglass } from "lucide-react";

import type { RealmState } from "@/engine/types";
import {
  formatRealmShort,
  formatStones,
} from "@/components/game/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TopBarProps {
  name: string;
  realm: RealmState;
  age: number;
  lifespan: number;
  spiritStones: number;
  /** Extra controls (e.g. 面板 button on desktop). */
  right?: React.ReactNode;
  className?: string;
}

/**
 * Compact status strip: 姓名 · 境界 · 年岁/寿元 countdown · 灵石.
 * The lifespan readout turns crimson and pulses when time runs short.
 */
export function TopBar({
  name,
  realm,
  age,
  lifespan,
  spiritStones,
  right,
  className,
}: TopBarProps) {
  const remaining = Math.max(lifespan - age, 0);
  const urgent = lifespan > 0 && remaining / lifespan <= 0.1;

  return (
    <div
      className={cn(
        "border-b border-ink-700/80 bg-ink-900/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1520px] items-center gap-3 px-3 py-2 lg:px-4">
        <span
          aria-hidden
          className="hidden font-display text-lg leading-none text-gold-600/80 select-none sm:inline"
        >
          仙
        </span>

        <span className="max-w-28 truncate font-serif text-sm font-semibold tracking-wider text-paper-50 sm:max-w-none">
          {name}
        </span>

        <Badge variant="default" className="font-serif tracking-[0.15em]">
          {formatRealmShort(realm)}
        </Badge>

        <span
          className={cn(
            "flex items-center gap-1 font-sans text-xs tabular-nums",
            urgent ? "animate-pulse text-crimson-400" : "text-paper-200"
          )}
          title={`寿元 ${age}/${lifespan}，余${remaining}载`}
        >
          <Hourglass className="size-3 opacity-70" />
          {age}
          <span className="text-mist-600">/</span>
          {lifespan}
          <span className={cn("hidden sm:inline", urgent ? "" : "text-mist-400")}>
            · 余{remaining}载
          </span>
        </span>

        <span
          className="flex items-center gap-1 font-sans text-xs tabular-nums text-gold-300"
          title="灵石"
        >
          <Gem className="size-3 opacity-80" />
          {formatStones(spiritStones)}
        </span>

        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </div>
  );
}
