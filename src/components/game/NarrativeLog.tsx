"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";

import type { LogEntry } from "@/engine/types";
import { toneTextClass, turnLabel } from "@/components/game/format";
import { cn } from "@/lib/utils";

export interface NarrativeLogProps {
  entries: LogEntry[];
  /** CJK characters revealed per second on the newest entry. */
  typingSpeed?: number;
  /** Called once the newest entry has fully revealed. */
  onTyped?: () => void;
  className?: string;
}

const NEAR_BOTTOM_PX = 96;

/**
 * The scrolling 天道 narration — the hero of the whole screen.
 *
 * - Only the NEWEST entry types out (codepoint-safe, one hanzi at a time).
 * - Click anywhere in the log to skip to the full text.
 * - Auto-scrolls while the reader is at the bottom; otherwise shows a
 *   floating 「新讯」 pill instead of yanking the viewport.
 */
export function NarrativeLog({
  entries,
  typingSpeed = 38,
  onTyped,
  className,
}: NarrativeLogProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pinnedRef = React.useRef(true);
  const animKeyRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(false);

  const lastIndex = entries.length - 1;
  const lastEntry = lastIndex >= 0 ? entries[lastIndex] : null;
  const lastChars = React.useMemo(
    () => (lastEntry ? Array.from(lastEntry.text) : []),
    [lastEntry]
  );

  const [typedCount, setTypedCount] = React.useState(0);
  const [showNewPill, setShowNewPill] = React.useState(false);

  const typing = lastEntry !== null && typedCount < lastChars.length;

  // Start / reset the typewriter when a new entry arrives.
  React.useEffect(() => {
    if (!lastEntry) return;
    const key = `${lastIndex}:${lastEntry.text}`;
    if (animKeyRef.current === key) return;
    animKeyRef.current = key;

    // First render (e.g. loading a save) shows everything instantly.
    if (!mountedRef.current || reducedMotion) {
      mountedRef.current = true;
      setTypedCount(lastChars.length);
      return;
    }
    setTypedCount(0);
  }, [lastEntry, lastIndex, lastChars.length, reducedMotion]);

  // Tick the typewriter.
  React.useEffect(() => {
    if (!typing) return;
    const interval = window.setInterval(
      () => setTypedCount((n) => Math.min(n + 1, lastChars.length)),
      Math.max(1000 / typingSpeed, 8)
    );
    return () => window.clearInterval(interval);
  }, [typing, lastChars.length, typingSpeed]);

  // Fire onTyped exactly when the reveal completes.
  const wasTypingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasTypingRef.current && !typing) onTyped?.();
    wasTypingRef.current = typing;
  }, [typing, onTyped]);

  // Auto-scroll while pinned to the bottom.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowNewPill(false);
    } else if (typedCount === 0) {
      setShowNewPill(true);
    }
  }, [entries.length, typedCount]);

  const handleScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    pinnedRef.current = nearBottom;
    if (nearBottom) setShowNewPill(false);
  }, []);

  const skipTypewriter = React.useCallback(() => {
    if (typing) setTypedCount(lastChars.length);
  }, [typing, lastChars.length]);

  const scrollToBottom = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    pinnedRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowNewPill(false);
  }, []);

  return (
    <div
      className={cn(
        "glass-panel corner-brackets relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg",
        className
      )}
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onClick={skipTypewriter}
        role="log"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-5 py-5 md:px-8"
      >
        <div className="mx-auto flex max-w-[65ch] flex-col gap-4">
          {entries.map((entry, i) => {
            const prev = i > 0 ? entries[i - 1] : null;
            const newTurn = !prev || prev.turn !== entry.turn;
            const isLast = i === lastIndex;
            const chars = isLast ? lastChars : null;
            const text =
              isLast && chars ? chars.slice(0, typedCount).join("") : entry.text;

            return (
              <React.Fragment key={i}>
                {newTurn ? <TurnDivider turn={entry.turn} /> : null}
                <EntryBlock
                  entry={entry}
                  text={text}
                  showCaret={isLast && typing}
                  animateIn={isLast && mountedRef.current && !reducedMotion}
                />
              </React.Fragment>
            );
          })}
          {entries.length === 0 ? (
            <p className="pt-16 text-center font-serif text-sm text-mist-400">
              天道无言，静待入世之人。
            </p>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {showNewPill ? (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-gold-600/50 bg-ink-900/90 px-3.5 py-1.5 text-xs text-gold-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors hover:bg-gold-400/10"
          >
            <ArrowDown className="size-3" />
            新讯
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function TurnDivider({ turn }: { turn: number }) {
  return (
    <div className="flex items-center gap-3 pt-2 select-none first:pt-0">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-ink-600" />
      <span className="font-serif text-[11px] tracking-[0.25em] text-mist-400">
        {turnLabel(turn)}
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-ink-600" />
    </div>
  );
}

function EntryBlock({
  entry,
  text,
  showCaret,
  animateIn,
}: {
  entry: LogEntry;
  text: string;
  showCaret: boolean;
  animateIn: boolean;
}) {
  const isNarration = entry.speaker === "天道";
  const isCombat = entry.speaker === "战斗";

  const body = (
    <>
      {text}
      {showCaret ? (
        <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-gold-400 align-middle text-transparent">
          ▍
        </span>
      ) : null}
    </>
  );

  const content = isNarration ? (
    <p
      className={cn(
        "font-serif text-[17px] leading-9 tracking-wide whitespace-pre-wrap",
        toneTextClass(entry.tone)
      )}
    >
      {body}
    </p>
  ) : (
    <p
      className={cn(
        "border-l-2 pl-3 font-sans text-sm leading-7 whitespace-pre-wrap",
        isCombat
          ? "border-crimson-600/60 text-crimson-400/90"
          : "border-gold-600/60 text-paper-200",
        entry.tone ? toneTextClass(entry.tone) : null
      )}
    >
      {body}
    </p>
  );

  if (!animateIn) return content;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      {content}
    </motion.div>
  );
}
