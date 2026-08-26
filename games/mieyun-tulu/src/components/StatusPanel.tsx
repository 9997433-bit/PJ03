'use client';

import { fateById } from '@/data/fates';
import { itemById } from '@/data/items';
import { originById } from '@/data/origins';
import { sectById } from '@/data/sects';
import { ROUTE_BY_ID } from '@/data/techniques';
import { calamityOmen, calamityTier } from '@/engine/calamity';
import { realmLabel } from '@/engine/cultivation';
import { derive } from '@/engine/derived';
import { sectRankTitle } from '@/engine/progression';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type GameState } from '@/engine/types';
import { Bar, DualMeter, SectionTitle, Stat } from './primitives';

export function StatusPanel({ state }: { state: GameState }) {
  const c = state.character;
  if (!c) return null;
  const d = derive(c);
  const fate = fateById(c.fateId);
  const origin = originById(c.originId);
  const sect = sectById(c.sectId);
  const rank = sectRankTitle(state);
  const route = c.routeId ? ROUTE_BY_ID[c.routeId] : null;

  return (
    <aside className="panel space-y-4 p-4" aria-label="命册">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-cjk-serif text-xl tracking-widest text-star">{c.name}</h2>
          <span className="text-xs text-star-faint">
            第 {state.turn} 载 · 年 {c.age}/{c.lifespan}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-star-faint">
          {origin?.name} · {fate?.name} · {c.spiritRoot.grade}
          〔{c.spiritRoot.elements.join('')}〕
        </p>
      </div>

      <div className="startrack" />

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-cjk-serif text-lg text-amethyst">{realmLabel(c.realm)}</span>
          <span className="text-[11px] tabular-nums text-star-faint">
            {c.realm.exp}/{c.realm.expNeeded}
          </span>
        </div>
        <Bar
          value={c.realm.exp}
          max={c.realm.expNeeded}
          color="linear-gradient(90deg,#5a37c9,#b79aff)"
          label="修为"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-[11px] text-star-faint">
          <span>气血 {c.hp}/{c.maxHp}</span>
          <span>法力 {c.mana}/{c.maxMana}</span>
        </div>
        <Bar value={c.hp} max={c.maxHp} color="linear-gradient(90deg,#7a2340,#ff6180)" label="气血" />
        <Bar value={c.mana} max={c.maxMana} color="linear-gradient(90deg,#22496b,#5fe0b4)" label="法力" />
      </div>

      <div className="startrack" />

      <div>
        <DualMeter fortune={c.fortune} calamity={c.calamity.value} tier={calamityTier(state)} />
        <p className="mt-2 font-cjk-serif text-[11px] leading-5 text-star-faint">{calamityOmen(state)}</p>
      </div>

      <div className="startrack" />

      <div>
        <SectionTitle>身外</SectionTitle>
        <Stat label="灵石" value={c.spiritStones} />
        <Stat label="功德" value={c.merit} hint="化解劫运与部分门派的门槛" />
        <Stat label="声望" value={c.reputation} />
        <Stat label="斗法威能" value={d.power} />
        <Stat label="护体" value={d.defense} />
        <Stat label="灭运 / 饶恕" value={`${c.extinguishCount} / ${c.sparedCount}`} />
        <Stat label="渡劫 / 化解" value={`${c.calamity.survived} / ${c.calamity.dissolved}`} />
      </div>

      <div>
        <SectionTitle>资质</SectionTitle>
        <div className="grid grid-cols-5 gap-1 text-center">
          {ATTRIBUTE_KEYS.map((k) => (
            <div key={k} className="rounded border border-rim-soft/60 py-1">
              <div className="text-[10px] text-star-faint">{ATTRIBUTE_LABELS[k]}</div>
              <div className="font-cjk-serif tabular-nums text-star">{c.attributes[k]}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>门庭</SectionTitle>
        <Stat label="道途" value={route ? route.name : '未择'} />
        <Stat label="门派" value={sect ? `${sect.name}${rank ? `·${rank}` : ''}` : '无门无派'} />
        <Stat
          label="佩用"
          value={
            [c.equipped.weapon, c.equipped.robe, c.equipped.charm]
              .filter(Boolean)
              .map((id) => itemById(id!)?.name ?? id)
              .join(' / ') || '空手'
          }
        />
      </div>

      {c.injuries.length > 0 ? (
        <div>
          <SectionTitle>伤势</SectionTitle>
          <ul className="space-y-1">
            {c.injuries.map((i) => (
              <li key={i.id} className="text-xs text-jie">
                {i.name} · 余 {i.turnsLeft} 载
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
