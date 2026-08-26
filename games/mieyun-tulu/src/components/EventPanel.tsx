'use client';

import { eventById } from '@/data/events';
import type { GameState } from '@/engine/types';
import type { Command } from '@/engine/turn';
import { Button, Odds, SectionTitle } from './primitives';

export function EventPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (c: Command) => void;
}) {
  const pending = state.pendingEvent;
  if (!pending) return null;
  const ev = eventById(pending.eventId);
  if (!ev) return null;

  return (
    <section className="panel border-violet-core/50 p-4" aria-label="抉择">
      <SectionTitle note="赔率已列,落子无悔">{ev.name}</SectionTitle>
      <p className="mb-4 font-cjk-serif text-[15px] leading-8 text-star-dim">{ev.narrative}</p>
      <ul className="space-y-2">
        {pending.options.map((o, i) => (
          <li key={o.id} className="rounded border border-rim-soft/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                hotkey={String(i + 1)}
                tone="primary"
                disabled={!o.affordable}
                onClick={() => dispatch({ kind: '抉择', choiceId: o.id })}
              >
                {o.text}
              </Button>
              <span className="text-xs text-star-faint">
                成算 <Odds value={o.chance} />
                {o.checkLabel ? <span className="ml-1 text-star-faint">({o.checkLabel})</span> : null}
              </span>
              {o.costLabel ? <span className="text-xs text-track">耗 {o.costLabel}</span> : null}
              {!o.affordable ? <span className="text-xs text-jie">力有不逮</span> : null}
            </div>
            <p className="mt-2 text-xs leading-6">
              <span className="text-jade">成:{o.upside}</span>
              {o.downside ? <span className="ml-3 text-jie">败:{o.downside}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
