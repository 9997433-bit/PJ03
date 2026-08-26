'use client';

import { useState } from 'react';
import type { GameState } from '@/engine';
import { availableOpponents, learnableManuals, marketStock, reachablePlaces, sellPrice } from '@/engine';
import { getItem } from '@/data/items';
import { getManual } from '@/data/manuals';
import { getOrigin } from '@/data/origins';
import { useGameStore } from '@/store/gameStore';
import { Btn, Panel, SectionTitle, cx } from '../ui';

const TABS = ['游历', '坊市', '行囊', '棋谱', '精怪', '棋录'] as const;
type Tab = (typeof TABS)[number];

export function SidePanel({ state }: { state: GameState }) {
  const [tab, setTab] = useState<Tab>('游历');
  const busy = state.phase === 'match' || state.pendingEvent !== null;

  return (
    <Panel className="flex min-h-0 flex-col p-0">
      <div className="border-ink-600 grid grid-cols-6 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cx(
              'py-2.5 text-[11.5px] tracking-[0.16em] transition-colors',
              tab === t
                ? 'text-bamboo-200 border-bamboo-500 border-b'
                : 'text-paper-500 hover:text-paper-300 border-b border-transparent',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === '游历' && <TravelTab state={state} busy={busy} />}
        {tab === '坊市' && <MarketTab state={state} busy={busy} />}
        {tab === '行囊' && <SatchelTab state={state} />}
        {tab === '棋谱' && <ManualTab state={state} />}
        {tab === '精怪' && <SpiritTab state={state} />}
        {tab === '棋录' && <AuditTab state={state} />}
      </div>
    </Panel>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-paper-500 py-6 text-center text-[12px] leading-[1.9]">{children}</p>;
}

function TravelTab({ state, busy }: { state: GameState; busy: boolean }) {
  const store = useGameStore();
  const places = reachablePlaces(state);
  const opponents = availableOpponents(state);

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle aside={`盘缠 ${state.character?.coin ?? 0}`}>可 往 之 处</SectionTitle>
        {places.length === 0 ? (
          <Empty>境界所限,眼下无处可去。</Empty>
        ) : (
          <div className="space-y-1.5">
            {places.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy || !p.affordable}
                onClick={() => store.travel(p.id)}
                className="btn flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-[13px] tracking-[0.14em]">{p.name}</span>
                <span className={cx('text-[11px] tabular-nums', p.affordable ? 'text-paper-500' : 'text-dusk-400')}>
                  {p.fare > 0 ? `${p.fare} 钱` : '免'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>此 处 可 弈</SectionTitle>
        {opponents.length === 0 ? (
          <Empty>此地无人愿与汝对坐。</Empty>
        ) : (
          <div className="space-y-1.5">
            {opponents.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={busy}
                onClick={() => store.openMatch(o.id)}
                className="btn w-full px-3 py-2 text-left"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] tracking-[0.14em]">{o.name}</span>
                  <span className="text-paper-500 text-[11px] tabular-nums">
                    棋力 {o.strength}
                  </span>
                </div>
                <span className="text-paper-500 mt-0.5 block text-[11px]">
                  {o.title} · {o.hands} 手 · 彩头 {o.stake}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketTab({ state, busy }: { state: GameState; busy: boolean }) {
  const store = useGameStore();
  const c = state.character!;
  const stock = marketStock(state);
  const merchant = getOrigin(c.originId)?.perk === 'openHand' || c.flags.通商 === true;

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle aside={`银钱 ${c.coin}`}>坊 市</SectionTitle>
        <Btn className="mb-3 w-full py-2" disabled={busy} onClick={store.market}>
          <span className="text-[12px] tracking-[0.24em]">逛一季市集(耗一季)</span>
        </Btn>
        <div className="space-y-1.5">
          {stock.map((item) => (
            <div key={item.id} className="border-ink-600 border px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-paper-200 text-[13px]">{item.name}</span>
                <button
                  type="button"
                  disabled={busy || c.coin < item.price}
                  onClick={() => store.buy(item.id)}
                  className="btn shrink-0 px-2 py-0.5 text-[11px] tabular-nums"
                >
                  {item.price} 钱
                </button>
              </div>
              <p className="text-paper-500 mt-1 text-[11px] leading-[1.7]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {c.inventory.length > 0 && (
        <div>
          <SectionTitle>出 让</SectionTitle>
          <div className="space-y-1.5">
            {c.inventory.map((stack) => {
              const def = getItem(stack.itemId);
              if (!def) return null;
              return (
                <button
                  key={stack.itemId}
                  type="button"
                  disabled={busy}
                  onClick={() => store.sell(stack.itemId)}
                  className="btn flex w-full items-center justify-between px-3 py-2"
                >
                  <span className="text-[12.5px]">
                    {def.name}
                    <span className="text-paper-500"> ×{stack.count}</span>
                  </span>
                  <span className="text-paper-500 text-[11px] tabular-nums">
                    售 {sellPrice(def, merchant)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SatchelTab({ state }: { state: GameState }) {
  const store = useGameStore();
  const c = state.character!;
  const spirits = Object.values(state.spirits).filter((s) => s.met && s.home === state.placeId);

  if (c.inventory.length === 0) return <Empty>行囊空空。</Empty>;

  return (
    <div className="space-y-4">
      <SectionTitle aside={`银钱 ${c.coin}`}>行 囊</SectionTitle>
      {c.inventory.map((stack) => {
        const def = getItem(stack.itemId);
        if (!def) return null;
        const used = c.flags[`用过_${def.id}`] === true;
        return (
          <div key={stack.itemId} className="border-ink-600 border px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-paper-200 text-[13px]">
                {def.name}
                <span className="text-paper-500"> ×{stack.count}</span>
              </span>
              <button
                type="button"
                disabled={!def.effect || used}
                onClick={() => store.use(def.id)}
                className="btn shrink-0 px-2 py-0.5 text-[11px]"
                title={used ? '此物之效不可重复' : undefined}
              >
                {used ? '已用' : '用'}
              </button>
            </div>
            <p className="text-paper-500 mt-1 text-[11px] leading-[1.7]">{def.desc}</p>
            {spirits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {spirits.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => store.gift(s.id, def.id)}
                    className="btn px-2 py-0.5 text-[10.5px]"
                  >
                    赠 {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ManualTab({ state }: { state: GameState }) {
  const store = useGameStore();
  const c = state.character!;
  const learnable = learnableManuals(state);

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle aside={`悟 ${c.insight}`}>已 悟 之 谱</SectionTitle>
        {c.manuals.length === 0 ? (
          <Empty>尚无一谱在心。</Empty>
        ) : (
          <div className="space-y-1.5">
            {c.manuals.map((id) => {
              const m = getManual(id);
              if (!m) return null;
              const active = c.studyingId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => store.study(id)}
                  className={cx('btn w-full px-3 py-2 text-left', active && 'btn-primary')}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px]">{m.name}</span>
                    <span className="text-paper-500 text-[10.5px]">{active ? '参悟中' : m.tier}</span>
                  </div>
                  <span className="text-paper-500 mt-0.5 block text-[11px]">
                    参悟 ×{m.speedBonus} · 枰上 +{m.boardBonus}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>可 悟 之 谱</SectionTitle>
        <div className="space-y-1.5">
          {learnable.map((m) => (
            <div key={m.id} className="border-ink-600 border px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-paper-200 text-[12.5px]">{m.name}</span>
                <button
                  type="button"
                  disabled={m.reason !== null}
                  onClick={() => store.learn(m.id)}
                  className="btn shrink-0 px-2 py-0.5 text-[11px]"
                >
                  悟 {m.cost}
                </button>
              </div>
              <p className="text-paper-500 mt-1 text-[11px] leading-[1.7]">
                {m.reason ?? getManual(m.id)?.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpiritTab({ state }: { state: GameState }) {
  const met = Object.values(state.spirits).filter((s) => s.met);
  if (met.length === 0) return <Empty>精怪录尚是白纸。汝还没遇见过谁。</Empty>;

  return (
    <div className="space-y-3">
      <SectionTitle aside={`${met.length} 位`}>精 怪 录</SectionTitle>
      {met.map((s) => {
        const next = s.thresholds.find((t) => !(s.crossed ?? []).includes(t.at));
        const pct = Math.max(0, Math.min(100, ((s.favor + 50) / 150) * 100));
        return (
          <div key={s.id} className="border-ink-600 border px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-paper-200 text-[13px]">
                {s.name}
                <span className="text-paper-500 text-[11px]"> · {s.kind}</span>
              </span>
              <span
                className={cx(
                  'text-[11px] tabular-nums',
                  s.favor >= 50 ? 'text-bamboo-300' : s.favor < 0 ? 'text-dusk-400' : 'text-paper-500',
                )}
              >
                好感 {s.favor}
              </span>
            </div>
            <div className="meter meter-bamboo mt-2 h-[2px] w-full">
              <i style={{ width: `${pct}%` }} />
            </div>
            <p className="text-paper-500 mt-1.5 text-[11px] leading-[1.7]">{s.desc}</p>
            {next && (
              <p className="text-moon-500 mt-1 text-[10.5px]">下一关:好感 {next.at}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditTab({ state }: { state: GameState }) {
  const rolls = [...state.rolls].slice(-40).reverse();
  return (
    <div className="space-y-3">
      <SectionTitle aside={`共 ${state.stats.totalRolls} 掷`}>天 道 棋 录</SectionTitle>
      <p className="text-paper-500 text-[10.5px] leading-[1.8]">
        种子 {state.seed}
        <br />
        校验链 {state.auditHash.slice(0, 24)}…
      </p>
      <div className="space-y-1">
        {rolls.map((r) => (
          <div key={r.id} className="flex items-baseline gap-2 text-[11px]">
            <span className="text-ink-500 w-14 shrink-0 tabular-nums">
              QL-{String(r.id).padStart(4, '0')}
            </span>
            <span className={cx('w-14 shrink-0 tabular-nums', r.sealed ? 'text-moon-500' : 'text-bamboo-300')}>
              {r.die}={r.sealed ? '封' : r.value}
            </span>
            <span className="text-paper-500 leading-[1.6]">{r.reason}</span>
          </div>
        ))}
      </div>
      <p className="text-paper-500 pt-2 text-[10.5px] leading-[1.8]">
        「封」为缘法暗掷:只证其有,不示其值。
      </p>
    </div>
  );
}
