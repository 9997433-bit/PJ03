'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry, Speaker, Tone } from '@/engine/types';

const SPEAKER_STYLE: Record<Speaker, string> = {
  天机: 'text-amethyst',
  图录: 'text-track',
  系统: 'text-star-dim',
  斗法: 'text-jie',
  劫: 'text-jie',
};

const TONE_STYLE: Record<Tone, string> = {
  normal: 'text-star-dim',
  violet: 'text-orchid',
  gold: 'text-track',
  danger: 'text-jie',
  calm: 'text-amethyst',
};

export function NarrativeScroll({ log }: { log: readonly LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [log.length]);

  return (
    <div
      className="panel scroll-thin h-[52vh] overflow-y-auto p-5 lg:h-[calc(100dvh-19rem)]"
      aria-live="polite"
      aria-label="图录卷轴"
    >
      <ol className="space-y-2.5">
        {log.map((e, i) => (
          <li key={`${e.turn}-${i}`} className="font-cjk-serif text-[15px] leading-8">
            <span className={`mr-2 text-[11px] tracking-widest ${SPEAKER_STYLE[e.speaker]}`}>
              〔{e.speaker}〕
            </span>
            <span className={TONE_STYLE[e.tone]}>{e.text}</span>
          </li>
        ))}
      </ol>
      <div ref={endRef} />
    </div>
  );
}
