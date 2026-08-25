'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '@/engine/types';
import { atMajorGate } from '@/engine/stubEngine';
import { useGameStore } from '@/store/gameStore';

interface QuickAction {
  label: string;
  command: string;
  accent?: 'gold' | 'jade' | 'crimson';
  hotkey: string;
}

export function CommandBar({ state }: { state: GameState }) {
  const execute = useGameStore((s) => s.execute);
  const [input, setInput] = useState('');
  const historyRef = useRef<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const c = state.character!;
  const inCombat = state.phase === 'combat';
  const pending = state.pendingChoice;
  const gateReady = !inCombat && atMajorGate(c);

  const actions: QuickAction[] = inCombat
    ? [
        { label: '出手', command: '出手', accent: 'crimson', hotkey: '1' },
        { label: '术法', command: '术法', accent: 'gold', hotkey: '2' },
        { label: '服药', command: '服药', accent: 'jade', hotkey: '3' },
        { label: '遁走', command: '遁走', hotkey: '4' },
      ]
    : [
        { label: '修炼', command: '修炼', accent: 'jade', hotkey: '1' },
        { label: '突破', command: '突破', accent: gateReady ? 'gold' : undefined, hotkey: '2' },
        { label: '探索', command: '探索', hotkey: '3' },
      ];

  const submit = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    execute(text);
    if (!raw) {
      historyRef.current = [text, ...historyRef.current].slice(0, 50);
      setInput('');
      setHistoryIdx(-1);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, historyRef.current.length - 1);
      if (next >= 0 && historyRef.current[next]) {
        setHistoryIdx(next);
        setInput(historyRef.current[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      setHistoryIdx(next);
      setInput(next >= 0 && historyRef.current[next] ? historyRef.current[next]! : '');
    }
  };

  const accentClass = (a?: QuickAction['accent'], emphasized = false) => {
    switch (a) {
      case 'gold':
        return `border-gold-600/60 text-gold-300 hover:border-gold-400 hover:bg-gold-400/10 ${emphasized ? 'animate-jade-pulse border-gold-400' : ''}`;
      case 'jade':
        return 'border-jade-600/60 text-jade-400 hover:border-jade-400 hover:bg-jade-400/10';
      case 'crimson':
        return 'border-crimson-500/60 text-crimson-500 hover:bg-crimson-600/15';
      default:
        return 'border-ink-600 text-paper-200 hover:border-ink-500 hover:bg-ink-700/60';
    }
  };

  return (
    <div className="border-t border-ink-600 bg-ink-900/85 backdrop-blur">
      {/* ===== pending event choices ===== */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="border-b border-gold-600/30 bg-ink-800/70 px-3 py-3 sm:px-5"
          >
            <p className="mb-2 font-sans text-xs tracking-[0.3em] text-gold-400">【{pending.prompt}】抉择当前</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {pending.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => submit(String(i + 1))}
                  className="group flex min-h-[44px] items-center gap-2.5 border border-gold-600/40 bg-ink-900/60 px-4 py-2 text-left font-serif text-sm text-paper-200 transition-all hover:border-gold-400 hover:bg-gold-400/10 hover:shadow-[0_0_16px_-6px_var(--color-gold-400)]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-gold-600/50 font-sans text-[10px] text-gold-300 group-hover:border-gold-400">
                    {i + 1}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== quick actions + input ===== */}
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => submit(a.command)}
              disabled={!!pending}
              title={`快捷键 ${a.hotkey}`}
              className={`min-h-[38px] border px-4 py-1.5 font-sans text-sm tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-40 ${accentClass(a.accent, a.label === '突破' && gateReady)}`}
            >
              {a.label}
              <span className="ml-1.5 hidden text-[9px] text-paper-500 sm:inline">{a.hotkey}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border border-ink-600 bg-ink-950/70 px-3 focus-within:border-gold-600/50">
          <span className="font-sans text-jade-400 select-none">›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHistoryIdx(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder={pending ? `输入 1-${pending.options.length} 抉择` : '输入指令，如：修炼 · 使用 聚气丹 · 帮助'}
            className="min-h-[40px] w-full bg-transparent font-sans text-sm text-paper-50 caret-gold-400 outline-none placeholder:text-paper-500/60"
            data-command-input
          />
          <button
            onClick={() => submit()}
            className="shrink-0 py-1 pl-2 font-sans text-xs tracking-widest text-gold-600 transition-colors hover:text-gold-300"
          >
            执行
          </button>
        </div>
      </div>
    </div>
  );
}
