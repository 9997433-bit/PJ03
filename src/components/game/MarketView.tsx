'use client';

import { useMemo } from 'react';
import { Coins } from 'lucide-react';

import { ITEMS, type ItemData } from '@/data/items';
import type { GameState } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GRADE_INFO, formatStones, itemKindLabel, realmAtLeast } from './format';
import { SectionHeading } from './Ornaments';
import { cn } from '@/lib/utils';

const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

function ItemRow({
  item,
  count,
  action,
  onAction,
  disabled,
  disabledHint,
}: {
  item: ItemData;
  count?: number;
  action: string;
  onAction: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const grade = GRADE_INFO[item.grade];
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-md p-2.5 ring-1 backdrop-blur-sm',
        grade.bgClass,
        grade.ringClass,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('truncate font-serif text-sm', grade.textClass)}>
            {item.name}
            {count !== undefined && count > 1 && (
              <span className="ml-1 font-sans text-xs text-mist-400">×{count}</span>
            )}
          </p>
          <span className="shrink-0 font-sans text-[10px] text-mist-500">
            {grade.label} · {itemKindLabel(item.kind)}
          </span>
        </div>
        <p className="mt-0.5 truncate font-sans text-xs text-paper-500" title={item.desc}>
          {item.desc}
        </p>
      </div>
      <button
        onClick={onAction}
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        className="shrink-0 rounded border border-gold-600/50 px-3 py-1.5 font-sans text-xs text-gold-300 transition-colors hover:border-gold-400 hover:bg-gold-400/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {action}
      </button>
    </div>
  );
}

/** 万宝楼 — buy/sell in 灵石, grade-tinted rows, realm-gated stock. */
export function MarketView({ state }: { state: GameState }) {
  const buy = useGameStore((s) => s.buy);
  const sell = useGameStore((s) => s.sell);
  const c = state.character!;

  const stock = useMemo(
    () =>
      ITEMS.filter(
        (i) =>
          i.price > 0 &&
          i.kind !== 'misc' &&
          !i.hidden &&
          (!i.minRealm || realmAtLeast(c.realm.realm, i.minRealm)),
      ).sort((a, b) => a.grade - b.grade || a.price - b.price),
    [c.realm.realm],
  );

  const sellRate = c.flags.shrewd ? 0.6 : 0.5;
  const sellables = c.inventory
    .map((st) => ({ st, def: ITEM_BY_ID.get(st.itemId) }))
    .filter(
      (x): x is { st: (typeof c.inventory)[number]; def: ItemData } =>
        !!x.def && x.def.price > 0 && x.def.sellable !== false && !x.def.hidden,
    );

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <SectionHeading className="flex-1">万宝楼</SectionHeading>
        <span className="ml-3 flex items-center gap-1 font-sans text-sm text-gold-300 tabular-nums">
          <Coins className="h-3.5 w-3.5" />
          {formatStones(c.spiritStones)}
        </span>
      </div>

      <Tabs defaultValue="buy">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy" className="text-xs">
            购入
          </TabsTrigger>
          <TabsTrigger value="sell" className="text-xs">
            售出{c.flags.shrewd ? ' · 市侩六成' : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-2 flex flex-col gap-2">
          {stock.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              action={`${item.price} 灵石`}
              onAction={() => buy(item.id)}
              disabled={c.spiritStones < item.price}
              disabledHint="灵石不足"
            />
          ))}
          {stock.length === 0 && (
            <p className="py-6 text-center font-serif text-sm text-mist-500">今日无货。</p>
          )}
        </TabsContent>

        <TabsContent value="sell" className="mt-2 flex flex-col gap-2">
          {sellables.map(({ st, def }) => (
            <ItemRow
              key={st.itemId}
              item={def}
              count={st.count}
              action={`售 ${Math.max(1, Math.floor(def.price * sellRate))} 灵石`}
              onAction={() => sell(st.itemId)}
            />
          ))}
          {sellables.length === 0 && (
            <p className="py-6 text-center font-serif text-sm text-mist-500">
              囊中空空,无物可售。
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
