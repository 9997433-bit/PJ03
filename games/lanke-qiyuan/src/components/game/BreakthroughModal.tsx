'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

/**
 * 破境 gets its own moment. The visual is a stone dropping onto the board:
 * on success it settles, on a backlash the board itself cracks.
 */
export function BreakthroughModal() {
  const fx = useGameStore((s) => s.breakthroughFx);
  const clear = useGameStore((s) => s.clearBreakthroughFx);

  useEffect(() => {
    if (!fx) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fx, clear]);

  if (!fx) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-xuan-50/85 backdrop-blur-sm" onClick={clear} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bt-title"
        className={cn(
          'board-grid relative w-full max-w-sm border bg-xuan-100 px-6 py-8 text-center rounded-sm shadow-lg',
          fx.success ? 'border-zhu-500' : fx.backlash ? 'border-xia-700' : 'border-xuan-400',
        )}
      >
        <p className="text-xs tracking-[0.3em] text-yan-500">破 境</p>

        <div className="my-5 flex justify-center">
          <span
            className={cn('h-14 w-14', fx.success ? 'stone-white' : 'stone-black')}
            aria-hidden="true"
          />
        </div>

        <h2
          id="bt-title"
          className={cn(
            'font-display text-2xl',
            fx.success ? 'text-zhu-600' : fx.backlash ? 'text-xia-700' : 'text-yan-700',
          )}
        >
          {fx.success ? '一子落定' : fx.backlash ? '气血逆行' : '差之一线'}
        </h2>

        <p className="mt-3 font-display tabular-nums text-sm text-yan-700">
          D100 <b className="text-lg">{fx.d100}</b>
          <span className="mx-1.5 text-yan-300">vs</span>
          成算 <b className="text-lg">{fx.chance}</b>
        </p>

        <p className="mt-2 text-[12px] leading-relaxed text-yan-500">
          {fx.success
            ? '汝并没有觉得自己变强。只是从今往后,有些事看得懂了。'
            : fx.backlash
              ? '这一跤摔得重。棋道退了一步,心尘涨了一层——但汝还在。'
              : '未成不算输。天道记下了这一次,下回的门槛会低一点。'}
        </p>

        <Button tone="zhu" onClick={clear} className="mt-6 w-full">
          收子
        </Button>
      </div>
    </div>
  );
}
