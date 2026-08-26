'use client';

import { getPlace } from '@/data/places';
import { formatRealm, formatSeason } from '@/engine/prose';
import { chessDaoLabel } from '@/engine/insight';
import { Stone } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { GameState } from '@/engine/types';

export function TopBar({ state, onOpenDrawer }: { state: GameState; onOpenDrawer?: () => void }) {
  const c = state.character;
  if (!c) return null;
  const place = getPlace(state.placeId);

  return (
    <header className="panel-raised flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 sm:px-5">
      <div className="flex items-center gap-2">
        <Stone color="black" size={9} />
        <span className="font-display text-base tracking-wide text-yan-900">{c.name}</span>
        {c.courtesy !== '无名' && (
          <span className="seal px-1 py-0.5 text-[10px] rounded-[2px]">{c.courtesy}</span>
        )}
      </div>

      <span className="text-xuan-400" aria-hidden="true">|</span>

      <span className="font-display text-sm text-zhu-600">{formatRealm(c.realm)}</span>

      <span
        className="text-sm text-yan-700"
        title={`棋道 ${c.chessDao}/100 — ${chessDaoLabel(c.chessDao)}`}
      >
        棋道 <b className="font-display tabular-nums">{c.chessDao}</b>
        <span className="ml-1 text-yan-500">{chessDaoLabel(c.chessDao)}</span>
      </span>

      <span className={cn('text-sm', c.dust >= 70 ? 'text-xia-700' : 'text-yan-700')}>
        心尘 <b className="font-display tabular-nums">{c.dust}</b>
      </span>

      <span className={cn('text-sm', c.spirit <= 0 ? 'text-xia-700' : 'text-yan-700')}>
        心神 <b className="font-display tabular-nums">{c.spirit}</b>
        <span className="text-yan-500">/{c.maxSpirit}</span>
      </span>

      <div className="ml-auto flex items-center gap-3 text-sm text-yan-700">
        <span title="银钱">银 <b className="font-display tabular-nums">{c.coin}</b></span>
        <span title="悟">悟 <b className="font-display tabular-nums">{c.insight}</b></span>
        <span className="hidden sm:inline">{formatSeason(state.turn)}</span>
        <span className="hidden md:inline text-zhu-600">{place?.name ?? ''}</span>
        <span title="年岁">{c.age}岁</span>
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="打开命盘与行囊"
            className="border border-xuan-400 px-2 py-1 text-xs rounded-sm lg:hidden hover:bg-xuan-200"
          >
            命盘
          </button>
        )}
      </div>
    </header>
  );
}
