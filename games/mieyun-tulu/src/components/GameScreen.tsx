'use client';

/**
 * GameScreen.tsx — the playing shell
 *
 * Layout is two columns on wide screens: the 命册 on the left, the scroll and
 * whatever demands attention on the right. When a fight or an event is live it
 * takes the place of the command bar entirely — the engine would reject the
 * other commands anyway, so the UI simply does not offer them.
 *
 * Number keys 1–9 map to whatever the current context offers. The handler
 * stands down while a text input has focus.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { breakthroughOdds } from '@/engine/breakthrough';
import { isReadyForBreakthrough } from '@/engine/cultivation';
import { canRetire } from '@/engine/endings';
import type { Command } from '@/engine/turn';
import { useGameStore } from '@/store/gameStore';
import { CombatPanel } from './CombatPanel';
import { EventPanel } from './EventPanel';
import { NarrativeScroll } from './NarrativeScroll';
import { Panel, PANEL_TITLES, type PanelId } from './panels';
import { Button, SectionTitle } from './primitives';
import { StatusPanel } from './StatusPanel';

interface Action {
  key: string;
  label: string;
  hint: string;
  run: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'gold' | 'ghost';
  disabled?: boolean;
}

export function GameScreen() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const notice = useGameStore((s) => s.notice);
  const dismiss = useGameStore((s) => s.dismissNotice);
  const saveNow = useGameStore((s) => s.saveNow);
  const [panel, setPanel] = useState<PanelId | null>(null);

  const send = useCallback((c: Command) => dispatch(c), [dispatch]);
  const c = state.character;

  const bo = useMemo(() => (c ? breakthroughOdds(state) : null), [c, state]);
  const retireBlock = canRetire(state);

  const actions: Action[] = useMemo(
    () =>
      c
        ? [
            { key: '1', label: '修炼', hint: '静坐一载,稳而慢', run: () => send({ kind: '修炼' }) },
            {
              key: '2',
              label: '突破',
              hint: bo?.ready ? `成算 ${bo.chance}% → ${bo.targetRealm}` : '此关未满',
              tone: 'gold',
              disabled: !isReadyForBreakthrough(c.realm),
              run: () => send({ kind: '突破' }),
            },
            { key: '3', label: '探索', hint: '出门碰运气', run: () => send({ kind: '探索' }) },
            { key: '4', label: '斗法', hint: '主动寻敌', tone: 'danger', run: () => send({ kind: '斗法' }) },
            { key: '5', label: '万法坊', hint: '买卖', run: () => setPanel('market') },
            { key: '6', label: '推演命数', hint: '看下一掷', tone: 'primary', run: () => setPanel('divine') },
            { key: '7', label: '化解劫运', hint: '压住那根柱子', tone: 'danger', run: () => setPanel('mitigate') },
            { key: '8', label: '闭关', hint: '三倍修为,劫运 +4', run: () => send({ kind: '闭关' }) },
            { key: '9', label: '功法', hint: '择道途', run: () => setPanel('techniques') },
          ]
        : [],
    [c, bo, send],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        setPanel(null);
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;

      if (state.phase === 'event' && state.pendingEvent) {
        const option = state.pendingEvent.options[n - 1];
        if (option && option.affordable) {
          e.preventDefault();
          send({ kind: '抉择', choiceId: option.id });
        }
        return;
      }
      if (state.phase === 'combat' && state.combat) {
        e.preventDefault();
        if (state.combat.awaitingSpoils) {
          const map = ['灭运', '饶恕', '搜刮'] as const;
          const choice = map[n - 1];
          if (choice) send({ kind: '战利', choice });
        } else {
          const map = ['出手', '术法', '用符', '遁走'] as const;
          const action = map[n - 1];
          if (action) send({ kind: '战斗', action });
        }
        return;
      }
      if (state.phase === 'playing' && !panel) {
        const action = actions[n - 1];
        if (action && !action.disabled) {
          e.preventDefault();
          action.run();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, panel, send, actions]);

  if (!c) return null;

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-cjk-serif text-lg tracking-[0.4em] text-star">灭运图录</h1>
        <div className="flex items-center gap-2">
          <Button tone="ghost" onClick={() => setPanel('bag')} ariaLabel="打开行囊">
            行囊
          </Button>
          <Button tone="ghost" onClick={() => setPanel('sects')} ariaLabel="打开门派">
            门派
          </Button>
          <Button tone="ghost" onClick={() => setPanel('audit')} ariaLabel="打开天机录">
            天机录
          </Button>
          <Button tone="ghost" onClick={saveNow} ariaLabel="立即存档">
            录卷
          </Button>
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-4 rounded border border-jie-dim/60 bg-jie/10 px-4 py-2 text-sm text-jie"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="关闭提示"
            className="text-xs text-star-faint hover:text-star"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <StatusPanel state={state} />

        <div className="space-y-4">
          <NarrativeScroll log={state.log} />

          {state.phase === 'combat' ? <CombatPanel state={state} dispatch={send} /> : null}
          {state.phase === 'event' ? <EventPanel state={state} dispatch={send} /> : null}

          {state.phase === 'playing' && !panel ? (
            <section className="panel p-4" aria-label="指令">
              <SectionTitle note="数字键 1–9">指令</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-3">
                {actions.map((a) => (
                  <div key={a.key} className="rounded border border-rim-soft/60 p-2">
                    <Button
                      full
                      hotkey={a.key}
                      tone={a.tone}
                      disabled={a.disabled}
                      onClick={a.run}
                    >
                      {a.label}
                    </Button>
                    <p className="mt-1 text-[11px] leading-5 text-star-faint">{a.hint}</p>
                  </div>
                ))}
              </div>
              <div className="startrack my-4" />
              <div className="flex flex-wrap gap-2">
                <Button
                  tone="ghost"
                  disabled={retireBlock !== null}
                  title={retireBlock ?? '合上账本,择一处收场'}
                  onClick={() => send({ kind: '归隐' })}
                >
                  归隐
                </Button>
                <span className="self-center text-[11px] text-star-faint">
                  {retireBlock ?? '归隐所得结局,由你这一生的账本决定。'}
                </span>
              </div>
            </section>
          ) : null}

          {panel ? (
            <section className="panel p-4" aria-label={PANEL_TITLES[panel]}>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-cjk-serif text-sm tracking-[0.3em] text-star">
                  {PANEL_TITLES[panel]}
                </span>
                <Button tone="ghost" onClick={() => setPanel(null)} ariaLabel="关闭面板">
                  合上(Esc)
                </Button>
              </div>
              <Panel id={panel} state={state} dispatch={send} />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
