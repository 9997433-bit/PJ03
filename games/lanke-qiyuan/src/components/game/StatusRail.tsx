'use client';

import type { GameState } from '@/engine';
import { ATTRIBUTE_LABELS, boardPower, breakthroughGates, cultivationSpeed, formatRealm, formatSeason } from '@/engine';
import { getManual } from '@/data/manuals';
import { getOrigin } from '@/data/origins';
import { getPlace } from '@/data/places';
import { Gauge, Panel, Rule, SectionTitle, Stat, cx } from '../ui';

/** The left rail: everything true about you right now, and nothing hidden. */
export function StatusRail({ state }: { state: GameState }) {
  const c = state.character;
  if (!c) return null;

  const origin = getOrigin(c.originId);
  const place = getPlace(state.placeId);
  const manual = c.studyingId ? getManual(c.studyingId) : null;
  const gates = breakthroughGates(state);

  return (
    <Panel className="p-5">
      <div className="mb-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-paper-100 text-lg tracking-[0.2em]">{c.name}</h2>
          <span className="text-paper-500 text-[11px] tracking-[0.2em]">道号{c.courtesy}</span>
        </div>
        <p className="text-paper-500 mt-1 text-[11px] tracking-[0.16em]">
          {origin?.name} · {formatSeason(state.turn)} · 年{c.age}
        </p>
      </div>

      <div className="space-y-3">
        <Gauge
          label="修为"
          value={c.realm.exp}
          max={c.realm.expNeeded}
          tone="bamboo"
          hint={`${formatRealm(c.realm)} — 满则可破境`}
        />
        <Gauge label="心神" value={c.spirit} max={c.maxSpirit} tone="jade" hint="行动之本。耗尽则诸事不成,须坐忘。" />
        <Gauge label="心尘" value={c.dust} max={100} tone="dusk" hint="世事所积。尘重则参悟慢、检定失手、破境受阻。" />
        <Gauge label="棋道" value={c.chessDao} max={100} tone="moon" hint="此局之主轴。观棋与对弈皆可长进,破境有门限。" />
      </div>

      <Rule />

      <div>
        <Stat label="境界" value={formatRealm(c.realm)} tone="text-bamboo-200" />
        <Stat label="所在" value={place?.name ?? '—'} />
        <Stat label="寿元" value={`${c.age} / ${c.lifespan}`} />
        <Stat label="银钱" value={c.coin} />
        <Stat label="悟" value={c.insight} tone="text-moon-300" />
      </div>

      <Rule />

      <SectionTitle>心 性</SectionTitle>
      <div>
        <Stat label={ATTRIBUTE_LABELS.xinJing} value={c.attributes.xinJing} />
        <Stat label={ATTRIBUTE_LABELS.wuXing} value={c.attributes.wuXing} />
        <Stat label={ATTRIBUTE_LABELS.caiXue} value={c.attributes.caiXue} />
        <Stat label={ATTRIBUTE_LABELS.qiYun} value={c.attributes.qiYun} />
      </div>

      <Rule />

      <SectionTitle>棋 缘</SectionTitle>
      <p className="text-bamboo-200 text-[13px] tracking-[0.14em]">{c.chessAffinity.grade}</p>
      <p className="text-paper-500 mt-1 text-[11.5px]">
        灵机【{c.chessAffinity.affinities.join('·')}】· 参悟 ×{c.chessAffinity.speedMultiplier}
      </p>
      <div className="mt-3">
        <Stat label="参悟总率" value={`×${cultivationSpeed(c).toFixed(2)}`} />
        <Stat label="枰力" value={boardPower(c)} />
        <Stat label="所参" value={manual ? manual.name : '无'} />
      </div>

      {c.moods.length > 0 && (
        <>
          <Rule />
          <SectionTitle>心 境</SectionTitle>
          <ul className="space-y-1.5">
            {c.moods.map((m) => (
              <li key={m.id} className="text-[11.5px] leading-[1.6]">
                <span className={m.kind === 'boon' ? 'text-jade-300' : 'text-dusk-400'}>
                  {m.name}
                </span>
                <span className="text-paper-500">
                  {' '}
                  (余{m.turnsLeft < 0 ? '∞' : m.turnsLeft}季) — {m.desc}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {gates && gates.nextRealm && (
        <>
          <Rule />
          <SectionTitle>破 境 三 关</SectionTitle>
          <ul className="space-y-1 text-[11.5px]">
            <GateRow ok={gates.expReady} text={`修为圆满 ${c.realm.exp}/${c.realm.expNeeded}`} />
            <GateRow ok={gates.daoReady} text={`棋道 ${c.chessDao}/${gates.chessDaoNeeded}`} />
            <GateRow ok={gates.dustReady} text={`心尘 ${c.dust} ≤ ${gates.dustCeiling}`} />
          </ul>
          {gates.ready && (
            <p className="text-bamboo-300 mt-2 text-[11.5px]">三关皆过 · 门限 {gates.chance}%</p>
          )}
        </>
      )}
    </Panel>
  );
}

function GateRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={cx('flex items-center gap-2', ok ? 'text-bamboo-300' : 'text-paper-500')}>
      <span className={cx('inline-block h-1.5 w-1.5 rounded-full', ok ? 'bg-bamboo-400' : 'bg-ink-500')} />
      {text}
    </li>
  );
}
