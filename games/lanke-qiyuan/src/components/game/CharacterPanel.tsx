'use client';

import { getOrigin } from '@/data/origins';
import { getRealm } from '@/data/realms';
import { getManual, MANUALS } from '@/data/manuals';
import { getPlace } from '@/data/places';
import { formatRealm } from '@/engine/prose';
import { speedBreakdown, boardBonus } from '@/engine/cultivation';
import { chessDaoLabel } from '@/engine/insight';
import { breakthroughChance, breakthroughGate } from '@/engine/breakthrough';
import { Meter, NodeRule, Panel, Stat, Button } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { VISIBLE_ATTRIBUTES, ATTRIBUTE_LABELS, type GameState } from '@/engine/types';

/**
 * 命盘 — everything the player is allowed to know about themselves.
 * 缘法 is deliberately absent: it is drawn by a sealed die at creation and
 * never rendered anywhere in the app.
 */
export function CharacterPanel({ state }: { state: GameState }) {
  const runTurn = useGameStore((s) => s.runTurn);
  const c = state.character;
  if (!c) return null;

  const origin = getOrigin(c.originId);
  const realmDef = getRealm(c.realm.realm);
  const speed = speedBreakdown(c);
  const gate = breakthroughGate(state);
  const chance = breakthroughChance(state);
  const studying = c.studyingId ? getManual(c.studyingId) : null;

  return (
    <div className="space-y-3">
      <Panel title="命盘">
        <div className="space-y-2">
          <Stat label="境界" value={formatRealm(c.realm)} />
          <Meter label="修为" value={c.realm.exp} max={c.realm.expNeeded} tone="zhu" />
          <Meter label="心神" value={c.spirit} max={c.maxSpirit} tone="yue" />
          <Meter label="心尘" value={c.dust} max={100} tone="xia" />
          <Meter label="棋道" value={c.chessDao} max={100} tone="tai" suffix={` ${chessDaoLabel(c.chessDao)}`} />
        </div>

        <NodeRule />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {VISIBLE_ATTRIBUTES.map((k) => (
            <Stat key={k} label={ATTRIBUTE_LABELS[k]} value={c.attributes[k]} />
          ))}
          <Stat label="年岁" value={`${c.age} / ${c.lifespan}`} />
          <Stat label="悟" value={c.insight} />
          <Stat label="银钱" value={c.coin} />
          <Stat label="所在" value={getPlace(state.placeId)?.name ?? '—'} />
        </div>

        <NodeRule />

        <div className="space-y-1 text-sm">
          <Stat label="出身" value={origin?.name ?? '—'} hint={origin?.desc} />
          <Stat
            label="棋缘"
            value={c.chessAffinity.grade}
            hint={`灵机 ${c.chessAffinity.affinities.join('·')} · 修为 ×${c.chessAffinity.speedMultiplier}`}
          />
          <p className="pt-1 text-[12px] leading-relaxed text-yan-500">
            灵机 {c.chessAffinity.affinities.join(' · ')}
            {origin && <> · 〔{origin.perkName}〕{origin.perkDesc}</>}
          </p>
        </div>
      </Panel>

      <Panel title="修行">
        <div className="space-y-1">
          <Stat label="每季修为" value={`≈ ${Math.round(speed.total)}`} />
          <p className="text-[12px] leading-relaxed text-yan-500">
            {realmDef.cultivateBase} × 棋缘{speed.affinity} × 参谱{speed.manual.toFixed(2)} ×
            心境{speed.mood.toFixed(2)} × 悟性{speed.comprehension.toFixed(2)} ×
            心尘{speed.dustPenalty.toFixed(2)}
          </p>
          <Stat label="弈道加成" value={`+${boardBonus(c)}`} />
          <Stat label="参谱" value={studying ? studying.name : '未参'} />
        </div>

        {c.moods.length > 0 && (
          <>
            <NodeRule />
            <ul className="space-y-1">
              {c.moods.map((m) => (
                <li
                  key={m.id}
                  className={cn('text-[12px] leading-relaxed', m.kind === 'boon' ? 'text-zhu-600' : 'text-xia-700')}
                >
                  〔{m.name}〕{m.turnsLeft >= 0 && <span className="text-yan-500">余{m.turnsLeft}季 </span>}
                  {m.desc}
                </li>
              ))}
            </ul>
          </>
        )}

        <NodeRule />

        <div className="space-y-1">
          <Stat label="破境成算" value={`${chance.total}%`} />
          <p className={cn('text-[12px] leading-relaxed', gate.ok ? 'text-zhu-600' : 'text-yan-500')}>
            {gate.ok ? '三关皆过。可破境。' : gate.reason}
          </p>
          <Button
            tone={gate.ok ? 'zhu' : 'quiet'}
            disabled={!gate.ok}
            onClick={() => runTurn('破境')}
            className="mt-1 w-full"
          >
            破境
          </Button>
        </div>
      </Panel>

      <Panel title="棋谱">
        <ul className="space-y-1.5">
          {MANUALS.map((m) => {
            const known = c.manuals.includes(m.id);
            const readable = c.chessDao >= m.minChessDao;
            return (
              <li key={m.id} className="text-[12px] leading-relaxed">
                <div className="flex items-center justify-between gap-2">
                  <span className={known ? 'text-yan-900' : readable ? 'text-yan-700' : 'text-yan-300'}>
                    <span className="text-yan-500">{m.tier}</span> {m.name}
                  </span>
                  {known ? (
                    c.studyingId === m.id ? (
                      <span className="shrink-0 text-zhu-600">参中</span>
                    ) : (
                      <button
                        type="button"
                        className="shrink-0 border border-xuan-400 px-1.5 rounded-sm hover:bg-xuan-200"
                        onClick={() => runTurn(`参 ${m.id}`)}
                      >
                        参
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={!readable}
                      className="shrink-0 border border-xuan-400 px-1.5 rounded-sm disabled:opacity-35 hover:bg-xuan-200"
                      onClick={() => runTurn(`悟 ${m.id}`)}
                      title={readable ? `耗悟 ${m.insightCost}` : `须棋道 ${m.minChessDao}`}
                    >
                      悟 {m.insightCost}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
