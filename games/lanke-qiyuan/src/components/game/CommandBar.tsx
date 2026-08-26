'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';
import { BOARD_STYLES, STYLE_HELP, availableOpponents, SEAL_FROM_HAND } from '@/engine/board';
import { getEvent } from '@/data/events';
import { cn } from '@/lib/utils';
import type { GameState } from '@/engine/types';

const VERBS: { key: string; label: string; cmd: string; hint: string }[] = [
  { key: '1', label: '修炼', cmd: '修炼', hint: '打谱一季,积修为' },
  { key: '2', label: '观棋', cmd: '观棋', hint: '悟性检定,涨棋道' },
  { key: '3', label: '坐忘', cmd: '坐忘', hint: '复心神,涤心尘' },
  { key: '4', label: '游历', cmd: '游历', hint: '就地闲行,掷遇事' },
];

/**
 * The command bar has three faces — pending event, live match, and the normal
 * four verbs — and always accepts free text. Number keys 1–9 map to whatever
 * is on screen, and step aside while the input is focused.
 */
export function CommandBar({ state }: { state: GameState }) {
  const { runTurn, chooseEvent, playStyle, openBoard, setTab } = useGameStore();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = state.pendingEvent;
  const match = state.match;
  const opponents = availableOpponents(state);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const n = Number(e.key);
      if (pending) {
        if (n <= pending.choices.length) {
          e.preventDefault();
          chooseEvent(n - 1);
        }
        return;
      }
      if (match) {
        const style = BOARD_STYLES[n - 1];
        if (style) {
          e.preventDefault();
          playStyle(style);
        }
        return;
      }
      const verb = VERBS[n - 1];
      if (verb) {
        e.preventDefault();
        runTurn(verb.cmd);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, match, chooseEvent, playStyle, runTurn]);

  const submit = () => {
    const raw = text.trim();
    if (raw.length === 0) return;
    runTurn(raw);
    setText('');
  };

  return (
    <div className="panel-raised border-t px-3 py-2.5 sm:px-5">
      {pending ? (
        <PendingChoices state={state} onPick={chooseEvent} />
      ) : match ? (
        <div className="space-y-2">
          <p className="text-xs text-yan-500">
            第 {match.hand}/{match.hands} 手 · 目数 {match.margin >= 0 ? '+' : ''}
            {match.margin}
            {match.initiative && <span className="ml-2 text-zhu-600">先手在汝</span>}
            {match.ko && <span className="ml-2 text-xia-700">劫争未了</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {BOARD_STYLES.map((style, i) => {
              const disabled = style === '封盘' && match.hand < SEAL_FROM_HAND;
              return (
                <Button
                  key={style}
                  tone={style === '封盘' ? 'quiet' : 'zhu'}
                  disabled={disabled}
                  onClick={() => playStyle(style)}
                  title={STYLE_HELP[style]}
                >
                  <kbd className="text-[10px] opacity-60">{i + 1}</kbd> {style}
                </Button>
              );
            })}
            <Button tone="xia" onClick={() => runTurn('投子')}>
              投子
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {VERBS.map((v, i) => (
              <Button key={v.key} tone="zhu" onClick={() => runTurn(v.cmd)} title={v.hint}>
                <kbd className="text-[10px] opacity-60">{i + 1}</kbd> {v.label}
              </Button>
            ))}
            <Button onClick={() => setTab('places')} title="舆图:择地远行">
              远行
            </Button>
            <Button onClick={() => setTab('market')} title="墟市:买卖">
              墟市
            </Button>
            {opponents.length > 0 && (
              <Button
                tone="quiet"
                onClick={() => openBoard(opponents[0]!.id)}
                title={`与${opponents[0]!.name}对弈`}
              >
                弈道 · {opponents[0]!.name}
              </Button>
            )}
          </div>
          {opponents.length > 1 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="py-1 text-yan-500">此处可弈：</span>
              {opponents.slice(1).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => openBoard(o.id)}
                  className="border border-xuan-400 px-2 py-0.5 rounded-sm hover:bg-xuan-200"
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="或直接写：游历 烂柯山 / 买 云雾毛尖 2 / 赠 阿箬 松子仁 / 棋录"
          aria-label="指令输入"
          className={cn(
            'min-w-0 flex-1 border border-xuan-400 bg-xuan-50 px-3 py-1.5 text-sm rounded-sm',
            'placeholder:text-yan-300 focus:border-zhu-500 focus:outline-none',
          )}
        />
        <Button type="submit" tone="quiet">
          落子
        </Button>
      </form>
    </div>
  );
}

function PendingChoices({
  state,
  onPick,
}: {
  state: GameState;
  onPick: (index: number) => void;
}) {
  const pending = state.pendingEvent;
  if (!pending) return null;
  const event = getEvent(pending.eventId);
  return (
    <div className="space-y-2">
      <p className="font-display text-sm text-zhu-600">
        〔{pending.name}〕{event?.bucket && <span className="ml-1 text-yan-500">{event.bucket}</span>}
      </p>
      <div className="grid gap-1.5">
        {pending.choices.map((ch, i) => (
          <button
            key={`${ch.text}-${i}`}
            type="button"
            onClick={() => onPick(i)}
            className="group flex items-start gap-2 border border-xuan-400 bg-xuan-100 px-3 py-2 text-left text-sm rounded-sm hover:border-zhu-500 hover:bg-xuan-200"
          >
            <kbd className="mt-0.5 shrink-0 border border-xuan-400 px-1 text-[10px] text-yan-500 rounded-[2px]">
              {i + 1}
            </kbd>
            <span className="flex-1">
              {ch.text}
              {ch.hint && <span className="ml-2 text-[11px] text-yan-500">{ch.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
