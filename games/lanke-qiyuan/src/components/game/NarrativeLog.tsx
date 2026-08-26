'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry, LogTone, Speaker } from '@/engine';
import { cx } from '../ui';

const TONE_CLASS: Record<LogTone, string> = {
  normal: 'text-paper-200',
  jade: 'text-jade-300',
  bamboo: 'text-bamboo-300',
  dusk: 'text-dusk-400',
  muted: 'text-paper-500',
  moon: 'text-moon-100 glow-moon',
};

const SPEAKER_MARK: Record<Speaker, string> = {
  天道: '　',
  棋录: '·',
  弈: '◇',
  汝: '—',
};

export function NarrativeLog({ entries }: { entries: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries.length]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-9">
      <div className="mx-auto max-w-3xl space-y-3">
        {entries.map((entry) => {
          const tone = TONE_CLASS[entry.tone ?? 'normal'];
          const isNote = entry.speaker === '棋录';
          const isBoard = entry.speaker === '弈';
          return (
            <div key={entry.id} className="animate-fade-rise flex gap-3">
              <span
                className={cx(
                  'w-3 shrink-0 pt-[6px] text-[10px] leading-none',
                  isBoard ? 'text-bamboo-500' : 'text-ink-500',
                )}
              >
                {SPEAKER_MARK[entry.speaker]}
              </span>
              <p
                className={cx(
                  'whitespace-pre-wrap',
                  tone,
                  isNote
                    ? 'font-sans text-[12px] leading-[1.85] tracking-wide'
                    : 'text-[14.5px] leading-[2.05]',
                  isBoard && 'border-bamboo-700/50 border-l pl-3',
                )}
              >
                {entry.text}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
