'use client';

/**
 * panels.tsx — the drawer surfaces
 *
 * 万法坊 / 功法 / 门派 / 行囊 / 推演 / 化解 / 天机录. Each one reads a list built by
 * the engine (prices, odds, eligibility, rejection reasons) and renders it. No
 * panel computes a probability or a price itself; if a number is shown here,
 * some function in `engine/` produced it.
 */

import { buildAuditTable } from '@/engine/audit';
import { mitigationOptions } from '@/engine/calamity';
import { canDivine, DEPTH_LABELS, divinationCost } from '@/engine/divination';
import { itemById } from '@/data/items';
import { marketList, sellPrice } from '@/engine/market';
import { sectOffers, techniqueOffers } from '@/engine/progression';
import type { DivinationDepth, GameState, ItemKind } from '@/engine/types';
import type { Command } from '@/engine/turn';
import { Button, Odds, SectionTitle } from './primitives';

export type PanelId = 'market' | 'techniques' | 'sects' | 'bag' | 'divine' | 'mitigate' | 'audit';

export const PANEL_TITLES: Record<PanelId, string> = {
  market: '万法坊',
  techniques: '功法',
  sects: '门派',
  bag: '行囊',
  divine: '推演命数',
  mitigate: '化解劫运',
  audit: '天机录',
};

const KIND_LABEL: Record<ItemKind, string> = {
  pill: '丹',
  talisman: '符',
  weapon: '器',
  robe: '袍',
  charm: '佩',
  material: '材',
  relic: '遗',
};

interface PanelProps {
  state: GameState;
  dispatch: (c: Command) => void;
}

export function MarketPanel({ state, dispatch }: PanelProps) {
  const rows = marketList(state);
  return (
    <div>
      <SectionTitle note={`玄晶 ${state.character?.spiritStones ?? 0} · 售价为标价四成半`}>
        万法坊
      </SectionTitle>
      <ul className="space-y-2">
        {rows.map(({ item, buy, owned }) => (
          <li key={item.id} className="rounded border border-rim-soft/60 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-cjk-serif text-star">
                <span className="mr-1 text-[10px] text-star-faint">[{KIND_LABEL[item.kind]}]</span>
                {item.name}
                {owned > 0 ? <span className="ml-2 text-[11px] text-star-faint">持 {owned}</span> : null}
              </span>
              <span className="text-xs tabular-nums text-track">{buy} 玄晶</span>
            </div>
            <p className="mt-1 text-xs leading-6 text-star-dim">{item.desc}</p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => dispatch({ kind: '万法坊买', itemId: item.id })}>购一</Button>
              {owned > 0 ? (
                <Button tone="ghost" onClick={() => dispatch({ kind: '万法坊卖', itemId: item.id })}>
                  售一({sellPrice(state, item)})
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TechniquePanel({ state, dispatch }: PanelProps) {
  const offers = techniqueOffers(state);
  return (
    <div>
      <SectionTitle note="习一门入门功法即定道途,其余门自此关闭">功法</SectionTitle>
      {offers.length === 0 ? (
        <p className="text-sm text-star-dim">此时无可习之法。</p>
      ) : (
        <ul className="space-y-2">
          {offers.map((o) => (
            <li key={o.node.id} className="rounded border border-rim-soft/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-cjk-serif text-star">
                  {o.node.name}
                  <span className="ml-2 text-[11px] text-amethyst">{o.routeName}·{o.node.tier} 阶</span>
                </span>
                <span className="text-xs text-track tabular-nums">{o.node.costStones} 玄晶</span>
              </div>
              <p className="mt-1 text-xs leading-6 text-star-dim">{o.node.desc}</p>
              <div className="mt-2 flex items-center gap-3">
                <Button
                  disabled={!o.affordable || o.blocked !== null}
                  onClick={() => dispatch({ kind: '习功法', techniqueId: o.node.id })}
                >
                  研习
                </Button>
                <span className="text-xs text-star-faint">
                  成算 <Odds value={o.chance} />
                </span>
                {o.blocked ? <span className="text-xs text-jie">{o.blocked}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SectPanel({ state, dispatch }: PanelProps) {
  const offers = sectOffers(state);
  const inSect = Boolean(state.character?.sectId);
  return (
    <div>
      <SectionTitle note="门派按劫运与功德挑人">门派</SectionTitle>
      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.id} className="rounded border border-rim-soft/60 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-cjk-serif text-star">{o.name}</span>
              <span className="text-[11px] text-star-faint">
                {o.routeName} · 束脩 {o.tuition} · 月俸 {o.stipend} · 折 {Math.round(o.discount * 100)}%
              </span>
            </div>
            <p className="mt-1 text-xs leading-6 text-star-dim">{o.desc}</p>
            <div className="mt-2 flex items-center gap-3">
              <Button disabled={!o.eligible} onClick={() => dispatch({ kind: '入门派', sectId: o.id })}>
                投帖
              </Button>
              {o.reason ? <span className="text-xs text-jie">{o.reason}</span> : null}
            </div>
          </li>
        ))}
      </ul>
      {inSect ? (
        <div className="mt-4">
          <Button tone="danger" onClick={() => dispatch({ kind: '离门' })}>
            自请除名
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function BagPanel({ state, dispatch }: PanelProps) {
  const c = state.character!;
  return (
    <div>
      <SectionTitle note={`共 ${c.inventory.length} 类`}>行囊</SectionTitle>
      {c.inventory.length === 0 ? (
        <p className="text-sm text-star-dim">囊中空空。</p>
      ) : (
        <ul className="space-y-2">
          {c.inventory.map((stack) => {
            const item = itemById(stack.itemId);
            if (!item) return null;
            const usable = Boolean(item.effect && Object.keys(item.effect).length > 0);
            const wearable = ['weapon', 'robe', 'charm'].includes(item.kind);
            const worn =
              c.equipped.weapon === item.id ||
              c.equipped.robe === item.id ||
              c.equipped.charm === item.id;
            return (
              <li key={stack.itemId} className="rounded border border-rim-soft/60 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-cjk-serif text-star">
                    <span className="mr-1 text-[10px] text-star-faint">[{KIND_LABEL[item.kind]}]</span>
                    {item.name} ×{stack.count}
                    {worn ? <span className="ml-2 text-[11px] text-track">佩用中</span> : null}
                  </span>
                  {item.power ? <span className="text-[11px] text-jie">威能 {item.power}</span> : null}
                  {item.defense ? <span className="text-[11px] text-jade">护体 {item.defense}</span> : null}
                </div>
                <p className="mt-1 text-xs leading-6 text-star-dim">{item.desc}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {usable ? (
                    <Button onClick={() => dispatch({ kind: '用物', itemId: item.id })}>
                      {item.kind === 'relic' ? '参悟' : '服用'}
                    </Button>
                  ) : null}
                  {wearable && !worn ? (
                    <Button onClick={() => dispatch({ kind: '装备', itemId: item.id })}>佩上</Button>
                  ) : null}
                  {worn ? (
                    <Button
                      tone="ghost"
                      onClick={() =>
                        dispatch({ kind: '卸下', slot: item.kind as 'weapon' | 'robe' | 'charm' })
                      }
                    >
                      解下
                    </Button>
                  ) : null}
                  {!item.noTrade ? (
                    <Button tone="ghost" onClick={() => dispatch({ kind: '万法坊卖', itemId: item.id })}>
                      售一
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const DEPTHS: DivinationDepth[] = ['shallow', 'deep', 'heavenly'];

export function DivinePanel({ state, dispatch }: PanelProps) {
  const forecast = state.forecast;
  return (
    <div>
      <SectionTitle note="窥天耗一载,其余不耗">推演命数</SectionTitle>
      <p className="mb-3 text-xs leading-6 text-star-dim">
        星轨是序列化的,所以「下一掷」并非估算——深演与窥天读的就是那一枚将要落下的骰子。
        代价是天机反噬:看得越深,劫运涨得越多。
      </p>
      <ul className="space-y-2">
        {DEPTHS.map((depth) => {
          const cost = divinationCost(state, depth);
          const blocked = canDivine(state, depth);
          return (
            <li key={depth} className="rounded border border-rim-soft/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-cjk-serif text-star">{DEPTH_LABELS[depth]}</span>
                <span className="text-[11px] text-star-faint">
                  玄晶 {cost.stones} · 法力 {cost.mana} · 反噬 劫运 +{cost.calamity}
                  {cost.costsTurn ? ' · 耗一载' : ''}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Button
                  tone="gold"
                  disabled={blocked !== null}
                  onClick={() => dispatch({ kind: '推演命数', depth })}
                >
                  起卦
                </Button>
                {blocked ? <span className="text-xs text-jie">{blocked}</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {forecast ? (
        <div className="mt-4 rounded border border-track-dim/60 bg-track/5 p-3">
          <p className="mb-2 font-cjk-serif text-sm text-track">
            第 {forecast.turn} 载 · {DEPTH_LABELS[forecast.depth]}
          </p>
          <ul className="space-y-1.5">
            {forecast.lines.map((l) => (
              <li key={l.label} className="text-xs leading-6">
                <span className="mr-1 text-amethyst">〔{l.label}〕</span>
                <span
                  className={
                    l.tone === 'bad' ? 'text-jie' : l.tone === 'good' ? 'text-jade' : 'text-star-dim'
                  }
                >
                  {l.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-cjk-serif text-xs text-star-faint">{forecast.summary}</p>
        </div>
      ) : null}
    </div>
  );
}

export function MitigatePanel({ state, dispatch }: PanelProps) {
  const options = mitigationOptions(state);
  return (
    <div>
      <SectionTitle note="皆耗一载">化解劫运</SectionTitle>
      <p className="mb-3 text-xs leading-6 text-star-dim">
        劫运只有两条下降之路:硬受一劫,或者花钱消灾。前者伤身,后者伤财——
        而「主动应劫」是第三条:它不减劫运,只让劫在你选定的时辰落下。
      </p>
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.id} className="rounded border border-rim-soft/60 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-cjk-serif text-star">{o.name}</span>
              <span className="text-[11px] text-star-faint">
                {o.costLabel}
                {o.relief > 0 ? ` · 减劫运 ${o.relief}` : ''}
              </span>
            </div>
            <p className="mt-1 text-xs leading-6 text-star-dim">{o.desc}</p>
            <div className="mt-2 flex items-center gap-3">
              <Button
                tone={o.id === 'yingJie' ? 'danger' : 'default'}
                disabled={!o.affordable}
                onClick={() => dispatch({ kind: '化解劫运', mitigation: o.id })}
              >
                行之
              </Button>
              <span className="text-xs text-star-faint">
                成算 <Odds value={o.chance} />
              </span>
              {o.reason ? <span className="text-xs text-jie">{o.reason}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AuditPanel({ state }: PanelProps) {
  const rows = buildAuditTable(state.rolls).slice(-60).reverse();
  return (
    <div>
      <SectionTitle note={`共 ${state.stats.totalRolls} 掷 · 链首 ${state.auditHash.slice(0, 12)}…`}>
        天机录
      </SectionTitle>
      <p className="mb-3 text-xs leading-6 text-star-dim">
        每一掷的骰面、缘由与掷前星轨位置都在此备案,回合之间以 sha256 相扣。
        改过的存档载入时会被认出来。
      </p>
      <div className="scroll-thin max-h-[52vh] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">天机录:近六十次掷骰</caption>
          <thead className="sticky top-0 bg-nebula text-star-faint">
            <tr>
              <th scope="col" className="py-1 pr-2 font-normal">
                编号
              </th>
              <th scope="col" className="py-1 pr-2 font-normal">
                载
              </th>
              <th scope="col" className="py-1 pr-2 font-normal">
                骰
              </th>
              <th scope="col" className="py-1 pr-2 font-normal">
                值
              </th>
              <th scope="col" className="py-1 font-normal">
                缘由
              </th>
            </tr>
          </thead>
          <tbody className="text-star-dim">
            {rows.map((r) => (
              <tr key={r.recordId} className="border-t border-rim-soft/40">
                <td className="py-1 pr-2 tabular-nums text-star-faint">{r.recordId}</td>
                <td className="py-1 pr-2 tabular-nums">{r.turn}</td>
                <td className="py-1 pr-2">{r.die}</td>
                <td className="py-1 pr-2 tabular-nums text-track">{r.value}</td>
                <td className="py-1">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Panel({ id, state, dispatch }: { id: PanelId } & PanelProps) {
  switch (id) {
    case 'market':
      return <MarketPanel state={state} dispatch={dispatch} />;
    case 'techniques':
      return <TechniquePanel state={state} dispatch={dispatch} />;
    case 'sects':
      return <SectPanel state={state} dispatch={dispatch} />;
    case 'bag':
      return <BagPanel state={state} dispatch={dispatch} />;
    case 'divine':
      return <DivinePanel state={state} dispatch={dispatch} />;
    case 'mitigate':
      return <MitigatePanel state={state} dispatch={dispatch} />;
    case 'audit':
      return <AuditPanel state={state} dispatch={dispatch} />;
  }
}
