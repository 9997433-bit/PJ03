'use client';

import type { Character, GameState } from '@/engine/types';
import { getOrigin } from '@/data/origins';
import { realmLabel } from '@/data/realmData';
import { getTechnique } from '@/data/techniques';
import { getItem } from '@/data/items';
import { breakthroughChance, defenseOf, powerOf, atMajorGate } from '@/engine/stubEngine';

/**
 * 【面板】— identity, realm progress, visible attributes, root, technique,
 * injuries, equipment. 机缘 intentionally absent (anti-cheat layer 3).
 */
export function CharacterPanel({ state }: { state: GameState }) {
  const c = state.character as Character;
  const gate = breakthroughChance(c);
  const expRatio = Math.min(1, c.realm.exp / c.realm.expNeeded);
  const rootGradeGold = c.spiritRoot.grade === '天灵根' || c.spiritRoot.grade === '异灵根';

  const attrs: { label: string; value: number }[] = [
    { label: '根骨', value: c.attributes.genGu },
    { label: '悟性', value: c.attributes.wuXing },
    { label: '心性', value: c.attributes.xinXing },
    { label: '气运', value: c.attributes.qiYun },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 font-sans text-sm">
      {/* identity + seal avatar */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-gold-600/50 bg-ink-700 font-display text-2xl text-gold-300">
          {c.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="font-serif text-base text-paper-50">{c.name}</p>
          <p className="mt-0.5 text-xs text-paper-500">
            {c.gender} · {getOrigin(c.originId)?.name ?? '未知'} · {c.age}岁
          </p>
        </div>
      </div>

      {/* realm + progress */}
      <section>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-display text-lg text-gold-300">{realmLabel(c.realm)}</span>
          <span className="text-xs text-paper-500 tabular-nums">
            {c.realm.exp}/{c.realm.expNeeded}
          </span>
        </div>
        <div className="bar-track h-1.5 w-full">
          <div className="bar-fill-jade" style={{ width: `${expRatio * 100}%` }} />
        </div>
        {atMajorGate(c) && (
          <p className="mt-1.5 text-xs text-gold-400">
            瓶颈已至 · 突破成功率约 <span className="tabular-nums">{gate}%</span>
          </p>
        )}
      </section>

      {/* HP + lifespan */}
      <section className="flex flex-col gap-2.5">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-paper-400">气血</span>
            <span className="text-crimson-400/90 tabular-nums">
              {c.hp}/{c.maxHp}
            </span>
          </div>
          <div className="bar-track h-1.5 w-full">
            <div className="bar-fill-crimson" style={{ width: `${(c.hp / c.maxHp) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-paper-400">寿元</span>
            <span className="text-paper-200 tabular-nums">
              {c.lifespan - c.age}载
            </span>
          </div>
          <div className="bar-track h-1.5 w-full">
            <div className="bar-fill-gold" style={{ width: `${Math.max(0, ((c.lifespan - c.age) / c.lifespan) * 100)}%` }} />
          </div>
        </div>
      </section>

      {/* attributes — 机缘 deliberately absent */}
      <section>
        <p className="mb-2 text-[11px] tracking-[0.3em] text-paper-500">属性</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {attrs.map((a) => (
            <div key={a.label} className="flex items-baseline justify-between border-b border-ink-600/60 pb-1">
              <span className="text-paper-400">{a.label}</span>
              <span className="text-gold-300 tabular-nums">{a.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* spirit root */}
      <section className="flex items-center justify-between">
        <span className="text-paper-400">灵根</span>
        <span
          className={`border px-2 py-0.5 text-xs tracking-widest ${
            rootGradeGold
              ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
              : 'border-ink-500 bg-ink-700 text-paper-200'
          }`}
        >
          {c.spiritRoot.grade}
          {c.spiritRoot.elements.length > 0 && ` · ${c.spiritRoot.elements.join('')}`}
        </span>
      </section>

      {/* technique */}
      <section className="flex items-center justify-between">
        <span className="text-paper-400">功法</span>
        <span className="text-paper-200">
          {c.techniqueId ? `《${getTechnique(c.techniqueId)?.name}》` : '无'}
          {c.techniqueId && (
            <span className="ml-1.5 text-xs text-jade-400">{getTechnique(c.techniqueId)?.grade}</span>
          )}
        </span>
      </section>

      {/* equipment */}
      <section>
        <p className="mb-2 text-[11px] tracking-[0.3em] text-paper-500">装备</p>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-paper-500">兵刃</span>
            <span className="text-paper-200">{c.equipped.weapon ? getItem(c.equipped.weapon).name : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-paper-500">护具</span>
            <span className="text-paper-200">{c.equipped.armor ? getItem(c.equipped.armor).name : '—'}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-ink-600/60 pt-1.5">
            <span className="text-paper-500">威能 / 防御</span>
            <span className="text-gold-300 tabular-nums">
              {powerOf(c)} / {defenseOf(c)}
            </span>
          </div>
        </div>
      </section>

      {/* injuries */}
      {c.injuries.length > 0 && (
        <section>
          <p className="mb-2 text-[11px] tracking-[0.3em] text-crimson-500/80">伤势</p>
          <div className="flex flex-col gap-1.5">
            {c.injuries.map((inj) => (
              <div key={inj.id} className="flex justify-between text-xs">
                <span className="text-crimson-500">{inj.name}</span>
                <span className="text-paper-500">余{inj.turnsLeft}转</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
