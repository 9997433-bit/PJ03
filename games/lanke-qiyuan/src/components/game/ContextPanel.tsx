'use client';

import { buyPrice, marketStock, sellPrice } from '@/engine/economy';
import { satchelView } from '@/engine/inventory';
import { visibleSpirits, spiritsHere } from '@/engine/spirits';
import { reachablePlaces } from '@/engine/travel';
import { availableOpponents, handDC, STYLE_HELP, BOARD_STYLES } from '@/engine/board';
import { buildAuditTable } from '@/engine/audit';
import { getOpponent } from '@/data/opponents';
import { getPlace } from '@/data/places';
import { Button, NodeRule, Panel, Stone } from '@/components/ui/primitives';
import { useGameStore, type ContextTab } from '@/store/gameStore';
import { CharacterPanel } from './CharacterPanel';
import { cn } from '@/lib/utils';
import type { GameState } from '@/engine/types';

const TABS: { id: ContextTab; label: string }[] = [
  { id: 'panel', label: '命盘' },
  { id: 'satchel', label: '行囊' },
  { id: 'places', label: '舆图' },
  { id: 'market', label: '墟市' },
  { id: 'register', label: '精怪录' },
  { id: 'audit', label: '棋录' },
];

export function ContextPanel({ state }: { state: GameState }) {
  const tab = useGameStore((s) => s.tab);
  const setTab = useGameStore((s) => s.setTab);
  const inMatch = state.phase === 'match';
  const active: ContextTab = inMatch ? 'board' : tab;

  return (
    <div className="flex h-full flex-col">
      <nav className="flex shrink-0 flex-wrap gap-1 border-b border-xuan-300 px-2 py-1.5" aria-label="侧栏">
        {inMatch ? (
          <span className="px-2 py-1 font-display text-sm text-zhu-600">弈道</span>
        ) : (
          TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active === t.id ? 'page' : undefined}
              className={cn(
                'px-2 py-1 text-xs rounded-sm transition-colors',
                active === t.id
                  ? 'bg-zhu-500 text-xuan-50'
                  : 'text-yan-700 hover:bg-xuan-200',
              )}
            >
              {t.label}
            </button>
          ))
        )}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {active === 'board' && <BoardView state={state} />}
        {active === 'panel' && <CharacterPanel state={state} />}
        {active === 'satchel' && <SatchelView state={state} />}
        {active === 'places' && <PlacesView state={state} />}
        {active === 'market' && <MarketView state={state} />}
        {active === 'register' && <RegisterView state={state} />}
        {active === 'audit' && <AuditView state={state} />}
      </div>
    </div>
  );
}

// ============================================================================

function BoardView({ state }: { state: GameState }) {
  const m = state.match;
  if (!m) return <p className="p-2 text-sm text-yan-500">此刻无局。</p>;
  const opp = getOpponent(m.opponentId);
  if (!opp) return null;

  return (
    <div className="space-y-3">
      <Panel title={`${opp.name} · ${opp.title}`}>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-yan-500">手数</span>
            <span className="font-display tabular-nums">{m.hand} / {m.hands}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yan-500">目数</span>
            <span
              className={cn(
                'font-display tabular-nums',
                m.margin > 0 ? 'text-zhu-600' : m.margin < 0 ? 'text-xia-700' : '',
              )}
            >
              {m.margin >= 0 ? '+' : ''}{m.margin}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-yan-500">对手手筋</span>
            <span className="font-display tabular-nums">{handDC(opp)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yan-500">彩头</span>
            <span className="font-display tabular-nums">{opp.stake}</span>
          </div>
        </div>
        <NodeRule />
        <div className="flex gap-3 text-xs">
          <span className={cn(m.initiative ? 'text-zhu-600' : 'text-yan-300')}>
            {m.initiative ? '● 先手在汝' : '○ 无先手'}
          </span>
          <span className={cn(m.ko ? 'text-xia-700' : 'text-yan-300')}>
            {m.ko ? '● 劫争已起' : '○ 无劫'}
          </span>
        </div>
      </Panel>

      <Panel title="棋风">
        <ul className="space-y-1 text-[12px] leading-relaxed text-yan-700">
          {BOARD_STYLES.map((s) => (
            <li key={s}>
              <b className="font-display text-yan-900">{s}</b>
              <span className="ml-1.5 text-yan-500">{STYLE_HELP[s]}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {m.log.length > 0 && (
        <Panel title="手谱">
          <ol className="space-y-1 text-[11px] leading-relaxed text-yan-500">
            {m.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

// ============================================================================

function SatchelView({ state }: { state: GameState }) {
  const runTurn = useGameStore((s) => s.runTurn);
  const c = state.character;
  if (!c) return null;
  const rows = satchelView(c);
  const here = spiritsHere(state);

  return (
    <Panel title={`行囊 · ${rows.length} 样`}>
      {rows.length === 0 ? (
        <p className="text-sm text-yan-500">空空如也。行囊轻,脚步也轻。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ item, count }) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <span>
                  <b className="font-display">{item.name}</b>
                  {count > 1 && <span className="ml-1 text-yan-500">×{count}</span>}
                  <span className="ml-1.5 text-[10px] text-yan-300">{'·'.repeat(item.grade)}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {item.effect && (
                    <button
                      type="button"
                      onClick={() => runTurn(`用 ${item.id}`)}
                      className="border border-xuan-400 px-1.5 text-xs rounded-sm hover:bg-xuan-200"
                    >
                      用
                    </button>
                  )}
                  {item.price > 0 && (
                    <button
                      type="button"
                      onClick={() => runTurn(`卖 ${item.id} 1`)}
                      className="border border-xuan-400 px-1.5 text-xs rounded-sm hover:bg-xuan-200"
                      title={`售价 ${sellPrice(item)}`}
                    >
                      卖
                    </button>
                  )}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-yan-500">{item.desc}</p>
              {here.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {here.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => runTurn(`赠 ${s.id} ${item.id}`)}
                      className="border border-xuan-300 px-1.5 text-[10px] text-yan-500 rounded-sm hover:border-zhu-400 hover:text-zhu-600"
                    >
                      赠 {s.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ============================================================================

function PlacesView({ state }: { state: GameState }) {
  const goTo = useGameStore((s) => s.goTo);
  const rows = reachablePlaces(state);
  const c = state.character;

  return (
    <Panel title="舆图">
      <ul className="space-y-2">
        {rows.map(({ place, fare, here }) => (
          <li key={place.id} className="text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className={cn('font-display', here && 'text-zhu-600')}>
                {place.name}
                {here && <span className="ml-1.5 text-[10px]">（在此）</span>}
              </span>
              {!here && (
                <Button
                  tone="quiet"
                  onClick={() => goTo(place.id)}
                  disabled={(c?.coin ?? 0) < fare}
                  className="shrink-0 px-2 py-0.5 text-xs"
                >
                  {fare > 0 ? `远行 ${fare}` : '远行'}
                </Button>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-yan-500">{place.desc}</p>
          </li>
        ))}
      </ul>
      <NodeRule />
      <p className="text-[11px] text-yan-500">
        更远的几处要更高的境界才看得见。已至 {c?.visited.length ?? 0} 处。
      </p>
    </Panel>
  );
}

// ============================================================================

function MarketView({ state }: { state: GameState }) {
  const runTurn = useGameStore((s) => s.runTurn);
  const c = state.character;
  if (!c) return null;
  const stock = marketStock(state);
  const place = getPlace(state.placeId);

  return (
    <Panel title={`墟市 · ${place?.name ?? ''}`}>
      <p className="mb-2 text-[11px] text-yan-500">
        身上 {c.coin} 银钱。卖价约买价的四成半——墟市是方便,不是生财之道。
      </p>
      <ul className="space-y-1.5">
        {stock.map((item) => {
          const price = buyPrice(state, item);
          return (
            <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0">
                <b className="font-display">{item.name}</b>
                <span className="ml-1 text-[10px] text-yan-300">{'·'.repeat(item.grade)}</span>
                <span className="block text-[11px] leading-relaxed text-yan-500">{item.desc}</span>
              </span>
              <button
                type="button"
                onClick={() => runTurn(`买 ${item.id} 1`)}
                disabled={c.coin < price}
                className="shrink-0 border border-xuan-400 px-1.5 py-0.5 text-xs rounded-sm disabled:opacity-35 hover:bg-xuan-200"
              >
                买 {price}
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ============================================================================

function RegisterView({ state }: { state: GameState }) {
  const rows = visibleSpirits(state);
  const hereIds = new Set(spiritsHere(state).map((s) => s.id));

  return (
    <Panel title="精怪录">
      {rows.length === 0 ? (
        <p className="text-sm text-yan-500">尚无相识。它们在,只是还不肯现身。</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((s) => (
            <li key={s.id} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <Stone color={s.favor >= 50 ? 'white' : 'black'} size={7} />
                  <b className="ml-1.5 font-display">{s.name}</b>
                  <span className="ml-1 text-[11px] text-yan-500">{s.kind}·{s.title}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 font-display tabular-nums text-xs',
                    s.favor >= 50 ? 'text-zhu-600' : s.favor < 0 ? 'text-xia-700' : 'text-yan-500',
                  )}
                >
                  {s.favor}
                  {hereIds.has(s.id) && <span className="ml-1 text-zhu-600">在此</span>}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-yan-500">{s.desc}</p>
              <ul className="mt-0.5 space-y-0.5">
                {s.thresholds.map((t) => (
                  <li
                    key={t.at}
                    className={cn(
                      'text-[10px] leading-relaxed',
                      (s.crossed ?? []).includes(t.at) ? 'text-zhu-600' : 'text-yan-300',
                    )}
                  >
                    {t.at} · {(s.crossed ?? []).includes(t.at) ? t.unlock : '——'}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ============================================================================

function AuditView({ state }: { state: GameState }) {
  const records = buildAuditTable(state.rolls).slice(-60).reverse();
  const opponents = availableOpponents(state);

  return (
    <div className="space-y-3">
      <Panel title="棋录 · 弈者掷骰">
        <p className="mb-2 break-all text-[10px] leading-relaxed text-yan-500">
          种子 {state.seed}
          <br />
          链首 {state.auditHash.slice(0, 32)}…
        </p>
        <table className="w-full text-[11px] tabular-nums">
          <caption className="sr-only">每一次掷骰的编号、季次、骰面、结果与理由</caption>
          <thead>
            <tr className="text-left text-yan-500">
              <th scope="col" className="font-normal">编号</th>
              <th scope="col" className="font-normal">骰</th>
              <th scope="col" className="font-normal">值</th>
              <th scope="col" className="font-normal">缘由</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.recordId} className={cn('border-t border-xuan-300', r.sealed && 'text-yue-500')}>
                <td className="py-0.5 pr-1">{r.recordId}</td>
                <td className="pr-1">{r.die}</td>
                <td className="pr-1 font-display">{r.display}</td>
                <td className="text-yan-500">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {opponents.length > 0 && (
        <Panel title="此处对手">
          <ul className="space-y-1 text-[11px] leading-relaxed text-yan-500">
            {opponents.map((o) => (
              <li key={o.id}>
                <b className="font-display text-yan-900">{o.name}</b> · 手筋 {handDC(o)} · {o.hands} 手 ·
                彩头 {o.stake}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
