'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '@/engine/types';
import { atMajorGate } from '@/engine/stubEngine';
import { getItem } from '@/data/items';
import { useGameStore } from '@/store/gameStore';

interface QuickAction {
  label: string;
  command: string;
  accent?: 'gold' | 'jade' | 'crimson';
  hotkey: string;
}

interface Suggestion {
  text: string;
  hint: string;
  /** true = fill the input instead of executing (prefix commands awaiting an argument) */
  fill?: boolean;
}

/** the whitelist stubEngine.runCommand actually accepts */
const BASE_SUGGESTIONS: Suggestion[] = [
  { text: '修炼', hint: '闭关吐纳,增长修为(一季)' },
  { text: '突破', hint: '冲击下一境界(须修为圆满)' },
  { text: '探索', hint: '外出历练,寻宝遇险(一季)' },
  { text: '坊市', hint: '前往万宝楼,购销物资' },
  { text: '炼丹', hint: '开炉炼丹,查看丹方' },
  { text: '背包', hint: '查看储物袋' },
  { text: '任务', hint: '查看未了因果' },
  { text: '面板', hint: '查看命盘属性' },
  { text: '审计', hint: '查验天道掷骰记录' },
  { text: '使用 ', hint: '使用 <物品名>', fill: true },
  { text: '装备 ', hint: '装备 <物品名>', fill: true },
  { text: '赠礼 ', hint: '赠礼 <人名>(灵石20)', fill: true },
  { text: '保存', hint: '天机已录,因果已存' },
  { text: '帮助', hint: '列出所有指令' },
];

const COMBAT_SUGGESTIONS: Suggestion[] = [
  { text: '出手', hint: '拼力一击' },
  { text: '术法', hint: '施展术法,爆发伤害' },
  { text: '服药', hint: '临阵服药回血' },
  { text: '遁走', hint: '夺路而逃(气运助之)' },
];

export function CommandBar({ state }: { state: GameState }) {
  const execute = useGameStore((s) => s.execute);
  const eventChoice = useGameStore((s) => s.eventChoice);
  const [input, setInput] = useState('');
  const [selIdx, setSelIdx] = useState(-1);
  const [sugOpen, setSugOpen] = useState(true);
  const [focused, setFocused] = useState(false);
  const historyRef = useRef<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const c = state.character!;
  const inCombat = state.phase === 'combat';
  const pending = state.pendingEvent ?? null;
  const gateReady = !inCombat && atMajorGate(c);

  const suggestions = useMemo<Suggestion[]>(() => {
    const t = input.trim();
    if (!t || pending) return [];

    // argument completion for prefix commands: 使用/装备 <物品>, 赠礼 <人名>
    const prefixMatch = /^(使用|装备|赠礼)\s*(.*)$/.exec(t);
    if (prefixMatch && (prefixMatch[2] !== '' || input.endsWith(' '))) {
      const [, verb, partial = ''] = prefixMatch;
      if (verb === '赠礼') {
        return Object.values(state.npcs)
          .filter((n) => !partial || n.name.includes(partial))
          .slice(0, 6)
          .map((n) => ({ text: `赠礼 ${n.name}`, hint: `好感 ${n.favor}` }));
      }
      return c.inventory
        .map((st) => getItem(st.itemId))
        .filter((item) => {
          if (partial && !item.name.includes(partial)) return false;
          return verb === '装备'
            ? item.kind === 'weapon' || item.kind === 'armor' || item.kind === 'misc'
            : !!item.effect;
        })
        .slice(0, 6)
        .map((item) => ({ text: `${verb} ${item.name}`, hint: item.desc.slice(0, 24) }));
    }

    const pool = inCombat ? COMBAT_SUGGESTIONS : BASE_SUGGESTIONS;
    const hits = pool.filter((s) => s.text.startsWith(t) && s.text.trim() !== t);
    return hits.slice(0, 6);
  }, [input, pending, inCombat, c.inventory, state.npcs]);

  const sugVisible = sugOpen && focused && suggestions.length > 0;

  const acceptSuggestion = (s: Suggestion) => {
    if (s.fill) {
      setInput(s.text);
      inputRef.current?.focus();
      setSelIdx(-1);
    } else {
      execute(s.text.trim());
      historyRef.current = [s.text.trim(), ...historyRef.current].slice(0, 50);
      setInput('');
      setSelIdx(-1);
      setHistoryIdx(-1);
    }
  };

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
    // while an event awaits a choice, digits resolve it (1-9)
    if (pending && /^[1-9]$/.test(text)) {
      const idx = Number(text) - 1;
      if (idx < pending.choices.length) {
        // sfx.play('choice'); — hook point for UI sounds (see src/lib/sfx.ts)
        eventChoice(idx);
      }
    } else {
      execute(text);
    }
    if (!raw) {
      historyRef.current = [text, ...historyRef.current].slice(0, 50);
      setInput('');
      setHistoryIdx(-1);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (sugVisible) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        setSelIdx((i) => {
          const next = i + dir;
          if (next < -1) return suggestions.length - 1;
          if (next >= suggestions.length) return -1;
          return next;
        });
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion(suggestions[Math.max(0, selIdx)]!);
        return;
      }
      if (e.key === 'Escape') {
        setSugOpen(false);
        setSelIdx(-1);
        return;
      }
      if (e.key === 'Enter' && selIdx >= 0) {
        acceptSuggestion(suggestions[selIdx]!);
        return;
      }
    }
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
            <p className="mb-2 font-sans text-xs tracking-[0.3em] text-gold-400">抉择当前 · 避无可避</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {pending.choices.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => submit(String(i + 1))}
                  className="group flex min-h-[44px] items-center gap-2.5 border border-gold-600/40 bg-ink-900/60 px-4 py-2 text-left font-serif text-sm text-paper-200 transition-all hover:border-gold-400 hover:bg-gold-400/10 hover:shadow-[0_0_16px_-6px_var(--color-gold-400)]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-gold-600/50 font-sans text-[10px] text-gold-300 group-hover:border-gold-400">
                    {i + 1}
                  </span>
                  <span>
                    {opt.text}
                    {opt.hint && <span className="ml-2 font-sans text-[10px] text-paper-500">{opt.hint}</span>}
                  </span>
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

        <div className="relative flex items-center gap-2 border border-ink-600 bg-ink-950/70 px-3 focus-within:border-gold-600/50">
          {/* ===== autocomplete dropdown (above input) ===== */}
          <AnimatePresence>
            {sugVisible && (
              <motion.ul
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full left-0 right-0 z-30 mb-1 max-h-56 overflow-y-auto border border-ink-600 bg-ink-900/95 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
              >
                {suggestions.map((s, i) => (
                  <li key={s.text}>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        acceptSuggestion(s);
                      }}
                      onMouseEnter={() => setSelIdx(i)}
                      className={`flex w-full min-h-[40px] items-baseline justify-between gap-3 px-3 py-2 text-left font-sans text-sm transition-colors ${
                        i === selIdx ? 'bg-gold-400/10 text-gold-300' : 'text-paper-200 hover:bg-ink-700/60'
                      }`}
                    >
                      <span className="shrink-0">{s.text.trim()}</span>
                      <span className="truncate text-xs text-paper-500">{s.hint}</span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-ink-600/60 px-3 py-1 text-[10px] tracking-widest text-paper-500">
                  Tab 补全 · ↑↓ 择选 · Esc 收起
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
          <span className="font-sans text-jade-400 select-none">›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHistoryIdx(-1);
              setSelIdx(-1);
              setSugOpen(true);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setSelIdx(-1);
            }}
            placeholder={pending ? `输入 1-${pending.choices.length} 抉择` : '输入指令，如：修炼 · 使用 聚气丹 · 帮助'}
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
