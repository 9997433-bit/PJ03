'use client';

import type { GameState } from '@/engine';
import { ALL_STYLES, STYLE_HINTS, availableOpponents, breakthroughGates } from '@/engine';
import { getOpponent } from '@/data/opponents';
import { useGameStore } from '@/store/gameStore';
import { Btn, Panel, cx } from '../ui';

/**
 * The bottom dock. Exactly one of three faces is shown at a time: the pending
 * event's choices, the live match, or the six core actions.
 */
export function ActionDock({ state }: { state: GameState }) {
  if (state.pendingEvent) return <EventPrompt state={state} />;
  if (state.phase === 'match' && state.match) return <MatchDock state={state} />;
  return <CoreActions state={state} />;
}

function CoreActions({ state }: { state: GameState }) {
  const store = useGameStore();
  const c = state.character!;
  const gates = breakthroughGates(state);
  const here = availableOpponents(state);
  const lowSpirit = c.spirit < 12;

  return (
    <Panel className="px-5 py-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Action
          label="修炼"
          sub="打谱一季"
          onClick={store.cultivate}
          warn={lowSpirit}
          title={lowSpirit ? '心神不足,此季恐怕空过' : '独坐打谱,积修为'}
        />
        <Action label="观棋" sub="长棋道" onClick={store.spectate} title="看别人下棋——涨棋道最稳的路子" />
        <Action label="坐忘" sub="复心神" onClick={store.sitForget} title="回心神、去心尘、散心中重负" />
        <Action label="游历" sub="在此盘桓" onClick={() => store.travel()} title="不换地方,四处走走,照样遇事" />
        <Action
          label="弈道"
          sub={here.length > 0 ? `${here.length} 人可弈` : '此处无人'}
          onClick={() => store.openMatch()}
          disabled={here.length === 0}
          title={here.length > 0 ? here.map((o) => o.name).join('、') : '换个地方罢'}
        />
        <Action
          label="破境"
          sub={gates?.ready ? `门限 ${gates.chance}%` : gates?.nextRealm ? '三关未过' : '可进一境'}
          onClick={store.breakthrough}
          primary={gates?.ready === true || (gates?.nextRealm === null && gates?.expReady === true)}
          title="修为满、棋道足、心尘轻,方可一试"
        />
      </div>
    </Panel>
  );
}

function Action({
  label,
  sub,
  onClick,
  disabled,
  primary,
  warn,
  title,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  warn?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx('btn px-2 py-2.5', primary && 'btn-primary')}
    >
      <span className="block text-[15px] tracking-[0.22em]">{label}</span>
      <span className={cx('mt-0.5 block text-[10.5px]', warn ? 'text-dusk-400' : 'text-paper-500')}>
        {sub}
      </span>
    </button>
  );
}

function EventPrompt({ state }: { state: GameState }) {
  const choose = useGameStore((s) => s.choose);
  const pending = state.pendingEvent!;
  return (
    <Panel className="px-5 py-4" corners>
      <p className="text-bamboo-300 mb-3 text-[11px] tracking-[0.3em]">{pending.name} · 抉择</p>
      <div className="grid gap-2">
        {pending.choices.map((choice, i) => (
          <button
            key={`${choice.text}-${i}`}
            type="button"
            onClick={() => choose(i)}
            className="btn px-4 py-3 text-left"
          >
            <span className="text-paper-100 text-[14px] leading-relaxed">
              <span className="text-paper-500 mr-2 text-[11px]">{i + 1}.</span>
              {choice.text}
            </span>
            {choice.hint && (
              <span className="text-moon-300 mt-1 block text-[11px] tracking-wider">
                {choice.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function MatchDock({ state }: { state: GameState }) {
  const store = useGameStore();
  const m = state.match!;
  const opponent = getOpponent(m.opponentId);
  const lead = m.margin;

  return (
    <Panel className="px-5 py-4" corners>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-bamboo-300 text-[11px] tracking-[0.3em]">
          弈道 · {opponent?.name ?? m.opponentId}
        </p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-paper-500">
            第 <span className="text-paper-200 tabular-nums">{Math.min(m.hand, m.hands)}</span> /{' '}
            {m.hands} 手
          </span>
          <span
            className={cx(
              'tabular-nums',
              lead > 0 ? 'text-bamboo-300' : lead < 0 ? 'text-dusk-400' : 'text-paper-400',
            )}
          >
            {lead > 0 ? '+' : ''}
            {lead} 目
          </span>
          {m.initiative && <span className="text-moon-300">先手在汝</span>}
          {m.ko && <span className="text-jade-300">劫争已起</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ALL_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => store.playHand(style)}
            title={STYLE_HINTS[style]}
            className="btn px-2 py-2.5"
          >
            <span className="block text-[15px] tracking-[0.22em]">{style}</span>
          </button>
        ))}
        <Btn onClick={store.resign} className="py-2.5">
          <span className="text-dusk-400 text-[15px] tracking-[0.22em]">投子</span>
        </Btn>
      </div>

      <p className="text-paper-500 mt-3 text-[11px] leading-[1.8]">
        {opponent
          ? `${opponent.title} · 棋力 ${opponent.strength} · 彩头 ${opponent.stake} 钱`
          : ''}
      </p>
    </Panel>
  );
}
