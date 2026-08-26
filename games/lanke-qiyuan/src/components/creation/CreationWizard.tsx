'use client';

import { useState } from 'react';
import { ORIGINS } from '@/data/origins';
import { QIYUAN_TABLE } from '@/data/qiyuan';
import {
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL,
  defaultAllocation,
  validateAllocation,
  type AllocationInput,
} from '@/engine/attributes';
import { Button, NodeRule, Panel, Stone } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { VISIBLE_ATTRIBUTES, ATTRIBUTE_LABELS, type GameState } from '@/engine/types';

const STEP_NAMES = ['立名', '出身', '心性', '棋缘'];

/**
 * Four steps. The wizard only *renders* the step the engine says you are on —
 * `creationStep` is authoritative, so refreshing mid-creation resumes exactly
 * where you left off and no amount of UI poking can skip a step.
 */
export function CreationWizard({ state }: { state: GameState }) {
  const step = state.creationStep;

  return (
    <div className="board-grid-faint min-h-dvh overflow-y-auto px-4 py-10">
      <div className="mx-auto max-w-xl">
        <ol className="mb-8 flex items-center justify-center gap-2 text-xs" aria-label="创角进度">
          {STEP_NAMES.map((name, i) => (
            <li key={name} className="flex items-center gap-2">
              <span
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-sm',
                  i === step
                    ? 'bg-zhu-500 text-xuan-50'
                    : i < step
                      ? 'text-zhu-600'
                      : 'text-yan-300',
                )}
              >
                {i < step && <Stone color="black" size={6} />}
                {name}
              </span>
              {i < STEP_NAMES.length - 1 && <span className="text-xuan-400">—</span>}
            </li>
          ))}
        </ol>

        {step === 0 && <NameStep />}
        {step === 1 && <OriginStep />}
        {step === 2 && <AttributeStep />}
        {step === 3 && <AffinityStep />}
      </div>
    </div>
  );
}

// ============================================================================

function NameStep() {
  const commit = useGameStore((s) => s.commitName);
  const [name, setName] = useState('');
  const [courtesy, setCourtesy] = useState('');

  return (
    <Panel title="立名">
      <p className="mb-4 text-sm leading-relaxed text-yan-700">
        天地为枰,生人为子。汝这一子,尚未落下。
        <br />
        <span className="text-yan-500">先报个名号罢。道号可留白——山精鬼怪自会替汝取一个。</span>
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          commit(name, courtesy);
        }}
      >
        <label className="block">
          <span className="text-xs text-yan-500">名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            autoFocus
            placeholder="姓甚名谁"
            className="mt-1 w-full border border-xuan-400 bg-xuan-50 px-3 py-2 rounded-sm focus:border-zhu-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-yan-500">道号（可留白）</span>
          <input
            value={courtesy}
            onChange={(e) => setCourtesy(e.target.value)}
            maxLength={12}
            placeholder="观棋子 / 烂柯生 / ……"
            className="mt-1 w-full border border-xuan-400 bg-xuan-50 px-3 py-2 rounded-sm focus:border-zhu-500 focus:outline-none"
          />
        </label>
        <Button type="submit" tone="zhu" disabled={name.trim().length === 0} className="w-full">
          落名
        </Button>
      </form>
    </Panel>
  );
}

// ============================================================================

function OriginStep() {
  const commit = useGameStore((s) => s.commitOrigin);
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <Panel title="出身">
      <p className="mb-4 text-sm text-yan-700">汝从哪里来?这决定了汝行囊里最初的那几样东西。</p>
      <ul className="space-y-2">
        {ORIGINS.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => setPicked(o.id)}
              aria-pressed={picked === o.id}
              className={cn(
                'w-full border px-3 py-2.5 text-left rounded-sm transition-colors',
                picked === o.id
                  ? 'border-zhu-500 bg-zhu-500/8'
                  : 'border-xuan-400 bg-xuan-100 hover:border-zhu-400',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <b className="font-display">{o.name}</b>
                <span className="text-[11px] text-zhu-600">〔{o.perkName}〕</span>
              </div>
              <p className="text-[12px] leading-relaxed text-yan-700">{o.desc}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-yan-500">
                {Object.entries(o.attributeMods)
                  .map(([k, v]) => `${ATTRIBUTE_LABELS[k as keyof typeof ATTRIBUTE_LABELS]} ${v >= 0 ? '+' : ''}${v}`)
                  .join(' · ')}
                {' · '}银钱 {o.startCoin} · 棋道 {o.startChessDao}
                <br />
                {o.perkDesc}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <Button
        tone="zhu"
        disabled={picked === null}
        onClick={() => picked && commit(picked)}
        className="mt-4 w-full"
      >
        便是此处了
      </Button>
    </Panel>
  );
}

// ============================================================================

function AttributeStep() {
  const commit = useGameStore((s) => s.commitAttributes);
  const [alloc, setAlloc] = useState<AllocationInput>(defaultAllocation());
  const spent = VISIBLE_ATTRIBUTES.reduce((sum, k) => sum + alloc[k], 0);
  const error = validateAllocation(alloc);

  const bump = (key: (typeof VISIBLE_ATTRIBUTES)[number], delta: number) => {
    setAlloc((prev) => {
      const next = prev[key] + delta;
      if (next < ATTR_MIN || next > ATTR_MAX) return prev;
      return { ...prev, [key]: next };
    });
  };

  return (
    <Panel title="心性">
      <p className="mb-1 text-sm text-yan-700">
        四项共 {ATTR_TOTAL} 点,每项 {ATTR_MIN}–{ATTR_MAX}。
      </p>
      <p className={cn('mb-4 text-xs', spent === ATTR_TOTAL ? 'text-zhu-600' : 'text-xia-700')}>
        已分 {spent} / {ATTR_TOTAL}
      </p>

      <ul className="space-y-3">
        {VISIBLE_ATTRIBUTES.map((k) => (
          <li key={k} className="flex items-center gap-3">
            <span className="w-14 font-display">{ATTRIBUTE_LABELS[k]}</span>
            <button
              type="button"
              aria-label={`${ATTRIBUTE_LABELS[k]} 减一`}
              onClick={() => bump(k, -1)}
              disabled={alloc[k] <= ATTR_MIN}
              className="h-7 w-7 border border-xuan-400 rounded-sm disabled:opacity-30 hover:bg-xuan-200"
            >
              −
            </button>
            <span
              className="w-8 text-center font-display text-lg tabular-nums"
              aria-live="polite"
              aria-label={`${ATTRIBUTE_LABELS[k]} ${alloc[k]}`}
            >
              {alloc[k]}
            </span>
            <button
              type="button"
              aria-label={`${ATTRIBUTE_LABELS[k]} 加一`}
              onClick={() => bump(k, 1)}
              disabled={alloc[k] >= ATTR_MAX}
              className="h-7 w-7 border border-xuan-400 rounded-sm disabled:opacity-30 hover:bg-xuan-200"
            >
              +
            </button>
            <span className="flex-1 text-[11px] leading-relaxed text-yan-500">{ATTR_BLURB[k]}</span>
          </li>
        ))}
      </ul>

      <NodeRule />

      <Button tone="zhu" disabled={error !== null} onClick={() => commit(alloc)} className="w-full">
        {error ?? '心性既定'}
      </Button>
    </Panel>
  );
}

const ATTR_BLURB: Record<(typeof VISIBLE_ATTRIBUTES)[number], string> = {
  xinJing: '抗心尘,破境成算,坐忘之深。',
  wuXing: '修为速率,观棋所得,弈道手筋。',
  caiXue: '读谱、写字、与人论道。',
  qiYun: '游历遇事的吉凶偏移,精怪的眼缘。',
};

// ============================================================================

function AffinityStep() {
  const draw = useGameStore((s) => s.drawAffinity);

  return (
    <Panel title="棋缘">
      <p className="mb-4 text-sm leading-relaxed text-yan-700">
        最后一件事,由弈者来掷。
        <br />
        <span className="text-yan-500">
          此掷一次而定,落子无悔。掷出的品第会写进棋录,任何人都可以复核。
        </span>
      </p>

      <ul className="mb-5 space-y-1 text-[12px] leading-relaxed">
        {QIYUAN_TABLE.map((row) => (
          <li key={row.grade} className="flex justify-between gap-3">
            <span className="text-yan-500 tabular-nums">{row.min}–{row.max}</span>
            <span className="flex-1 font-display">{row.grade}</span>
            <span className="text-yan-500 tabular-nums">×{row.speedMultiplier}</span>
          </li>
        ))}
      </ul>

      <p className="mb-4 text-[11px] leading-relaxed text-yan-500">
        另有一掷,汝看不见结果——弈者封了它。那一项此后不会出现在任何面板上,却一直在替汝
        （或不替汝）说话。
      </p>

      <Button tone="zhu" onClick={() => draw()} className="w-full">
        请弈者落子
      </Button>
    </Panel>
  );
}
