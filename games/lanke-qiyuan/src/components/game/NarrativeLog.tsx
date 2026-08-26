'use client';

import { useEffect, useRef } from 'react';
import { Typewriter } from './Typewriter';
import { cn } from '@/lib/utils';
import type { LogEntry, LogTone, Speaker } from '@/engine/types';

const TONE_CLASS: Record<LogTone, string> = {
  normal: 'text-yan-900',
  jade: 'text-zhu-600',
  bamboo: 'text-yan-700',
  dusk: 'text-xia-700',
  muted: 'text-yan-500',
  moon: 'text-yue-500',
};

const SPEAKER_MARK: Record<Speaker, string> = {
  天道: '天',
  棋录: '录',
  弈: '弈',
  汝: '汝',
};

const SPEAKER_CLASS: Record<Speaker, string> = {
  天道: 'border-zhu-500 text-zhu-600',
  棋录: 'border-xuan-400 text-yan-500',
  弈: 'border-yue-500 text-yue-500',
  汝: 'border-xia-500 text-xia-700',
};

/**
 * The 棋录 scroll. `aria-live="polite"` means a screen reader hears each new
 * line as it lands without losing the reader's place; only the newest entry
 * animates in.
 */
export function NarrativeLog({ entries }: { entries: readonly LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = entries[entries.length - 1]?.id ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  return (
    <div
      className="h-full overflow-y-auto px-4 py-4 sm:px-6"
      aria-live="polite"
      aria-label="叙事卷轴"
      role="log"
    >
      <div className="mx-auto max-w-2xl space-y-2.5">
        {entries.map((e) => (
          <p key={e.id} className="flex gap-2.5 text-[15px] leading-[1.85]">
            <span
              aria-hidden="true"
              className={cn(
                'mt-[5px] h-[18px] w-[18px] shrink-0 border text-[10px] leading-[16px] text-center rounded-sm select-none',
                SPEAKER_CLASS[e.speaker],
              )}
            >
              {SPEAKER_MARK[e.speaker]}
            </span>
            <span className={cn('flex-1', TONE_CLASS[e.tone ?? 'normal'])}>
              <span className="sr-only">{e.speaker}：</span>
              {e.id === lastId ? <Typewriter text={e.text} /> : e.text}
            </span>
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
