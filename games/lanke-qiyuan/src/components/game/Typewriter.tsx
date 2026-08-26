'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reveals text one character at a time, and stops pretending the moment the
 * reader asks it to: click, tap, Enter or Space finishes the line instantly.
 * Under `prefers-reduced-motion` it never animates at all.
 */
export function Typewriter({
  text,
  speed = 22,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? text.length : 0);
  const [source, setSource] = useState({ text, reduced });

  // Restart the reveal when the line (or the motion preference) changes.
  if (source.text !== text || source.reduced !== reduced) {
    setSource({ text, reduced });
    setShown(reduced ? text.length : 0);
  }

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      // max() so a reader who skipped ahead is never dragged back.
      setShown((cur) => Math.max(cur, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, reduced]);

  // `shown` stops changing once it reaches the end, so this fires once per line.
  useEffect(() => {
    if (shown >= text.length) onDone?.();
  }, [shown, text.length, onDone]);

  const complete = shown >= text.length;
  const skip = () => setShown(text.length);

  return (
    <span
      className={cn(!complete && 'caret', className)}
      onClick={skip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') skip();
      }}
      role={complete ? undefined : 'button'}
      tabIndex={complete ? -1 : 0}
      aria-label={complete ? undefined : '跳过逐字显示'}
    >
      {text.slice(0, shown)}
    </span>
  );
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true,
    () => false,
  );
}
