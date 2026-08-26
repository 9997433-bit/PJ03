'use client';

import { useEffect, useRef, useState } from 'react';
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
  const doneRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      setShown(text.length);
      return;
    }
    setShown(0);
    doneRef.current = false;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, reduced]);

  useEffect(() => {
    if (shown >= text.length && !doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
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

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
