'use client';

import { revealDaoYuan } from '@/engine/seal';
import type { GameState } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { Button, SectionTitle } from './primitives';

const KIND_LABEL: Record<string, string> = {
  victory: '登顶',
  transcend: '出录',
  death: '陨落',
  retire: '归止',
  fall: '歧路',
};

export function EndingScreen({ state }: { state: GameState }) {
  const abandon = useGameStore((s) => s.abandon);
  const ending = state.ending;
  if (!ending) return null;
  const s = ending.stats;
  const c = state.character;

  const rows: [string, string | number][] = [
    ['历时', `${s.turns} 载 · 享年 ${(c?.age ?? 0)}`],
    ['巅峰境界', s.peakRealmLabel],
    ['总掷骰', s.totalRolls],
    ['斗法胜', s.battlesWon],
    ['灭运次数', s.extinguished],
    ['渡劫 / 化解', `${s.calamitiesSurvived} / ${s.calamitiesDissolved}`],
    ['劫运峰值', Math.round(s.peakCalamity * 10) / 10],
    ['气运峰值', s.peakFortune],
    ['功德', s.merit],
    ['推演次数', s.divinations],
    ['入账玄晶', s.stonesEarned],
    ['封掷·道缘', c ? revealDaoYuan(c) : '—'],
  ];

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-14">
      <p className="mb-3 text-center text-xs tracking-[0.5em] text-star-faint">
        {KIND_LABEL[ending.kind] ?? '终'}
      </p>
      <h1 className="text-center font-cjk-serif text-4xl tracking-[0.3em] text-track">
        {ending.title}
      </h1>
      <div className="startrack my-6" />
      <p className="text-center font-cjk-serif text-sm tracking-widest text-amethyst">
        {ending.summary}
      </p>

      <div className="panel mt-8 p-6">
        <p className="whitespace-pre-line font-cjk-serif text-[15px] leading-9 text-star-dim">
          {ending.closing}
        </p>
      </div>

      <div className="panel mt-6 p-6">
        <SectionTitle note="盖棺之数">生涯</SectionTitle>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-rim-soft/40 py-1">
              <dt className="text-xs text-star-faint">{k}</dt>
              <dd className="font-cjk-serif text-sm tabular-nums text-star">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[11px] text-star-faint">
          星轨种子 {state.seed} · 链首 {state.auditHash.slice(0, 16)}…
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button tone="primary" onClick={abandon}>
          另开一卷
        </Button>
      </div>
    </main>
  );
}
