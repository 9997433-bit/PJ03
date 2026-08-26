'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { LogEntry } from '@/engine/types';
import { Typewriter } from './Typewriter';
import { turnLabel } from './format';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<string, string> = {
  normal: 'text-paper-50',
  gold: 'text-gold-300',
  danger: 'text-crimson-500',
  jade: 'text-jade-400',
  muted: 'text-paper-500',
};

function speakerClass(entry: LogEntry): string {
  switch (entry.speaker) {
    case '系统':
      return 'border-l-2 border-gold-600/60 pl-3 font-sans text-[15px] text-paper-200';
    case '战斗':
      return 'border-l-2 border-crimson-600/60 pl-3 font-sans text-[15px]';
    case '汝':
      return 'pl-3 italic text-paper-500';
    default:
      return '';
  }
}

export function NarrativeLog({ log }: { log: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [showJump, setShowJump] = useState(false);
  // entries present at mount render instantly; only newer ones animate
  const animateFromId = useRef<number>(
    log.length > 0 ? (log[log.length - 1]?.id ?? log.length) + 1 : 0,
  );
  const lastId = log.length > 0 ? (log[log.length - 1]?.id ?? log.length - 1) : -1;

  const scrollToBottom = (smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (pinned) {
      scrollToBottom(false);
      setShowJump(false);
    } else {
      setShowJump(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, log.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setPinned(nearBottom);
    if (nearBottom) setShowJump(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 py-5 sm:px-8"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-[65ch] flex-col gap-5">
          {log.map((entry, i) => {
            const entryId = entry.id ?? i;
            const animate = entryId >= animateFromId.current && entryId === lastId;
            const newTurn = entry.turn > 0 && entry.turn !== log[i - 1]?.turn;
            return (
              <Fragment key={entryId}>
              {newTurn && (
                <div className="flex items-center gap-3 pt-2 select-none" aria-hidden>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-ink-600" />
                  <span className="font-sans text-[11px] tracking-[0.3em] text-mist-500">
                    {turnLabel(entry.turn)}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-ink-600" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={cn('font-serif text-[16px] leading-[1.9] sm:text-[17px]', speakerClass(entry))}
              >
                {entry.speaker === '天道' && (
                  <span className="mr-2 font-sans text-xs tracking-widest text-gold-600/80 select-none">天道 ·</span>
                )}
                {entry.speaker === '战斗' && (
                  <span className="mr-2 font-sans text-xs tracking-widest text-crimson-500/80 select-none">战 ·</span>
                )}
                <Typewriter
                  text={entry.text}
                  animate={animate}
                  className={TONE_CLASS[entry.tone ?? 'normal']}
                  onDone={() => pinned && scrollToBottom()}
                />
              </motion.div>
              </Fragment>
            );
          })}
          {log.length === 0 && (
            <p className="font-serif mt-12 text-center text-sm text-paper-500">天道静默，万物未生。</p>
          )}
        </div>
      </div>

      {showJump && (
        <button
          onClick={() => {
            setPinned(true);
            scrollToBottom();
          }}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-gold-600/50 bg-ink-800/90 px-4 py-1.5 font-sans text-xs tracking-widest text-gold-300 backdrop-blur transition-colors hover:bg-gold-400/10"
        >
          ↓ 新消息
        </button>
      )}
    </div>
  );
}
