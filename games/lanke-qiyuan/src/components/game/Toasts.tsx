'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

const TONE: Record<string, string> = {
  info: 'border-xuan-400 bg-xuan-100 text-yan-700',
  good: 'border-zhu-500 bg-zhu-500/10 text-zhu-700',
  bad: 'border-xia-500 bg-xia-500/10 text-xia-700',
};

/** Transient bookkeeping. The full record always stays in the 棋录 scroll. */
export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 3600));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-3 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn('border px-3 py-1.5 text-sm rounded-sm shadow-sm', TONE[t.tone] ?? TONE.info)}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
