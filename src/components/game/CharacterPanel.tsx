"use client";

import * as React from "react";
import { HeartPulse, Hourglass, Shield, Sword, Sparkles } from "lucide-react";

import type {
  Character,
  CombatArt,
  ItemDef,
  Npc,
  Technique,
} from "@/engine/types";
import {
  ATTRIBUTE_META,
  GRADE_INFO,
  VISIBLE_ATTRIBUTES,
  formatRealm,
  formatStones,
  SPIRIT_ROOT_STYLE,
} from "@/components/game/format";
import {
  HanziWatermark,
  SectionHeading,
} from "@/components/game/Ornaments";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface CharacterPanelProps {
  character: Character;
  npcs?: Npc[];
  itemsById?: Record<string, ItemDef>;
  techniquesById?: Record<string, Technique>;
  artsById?: Record<string, CombatArt>;
  className?: string;
}

/**
 * 【面板】 — identity, glowing realm title, vitals, engraved attribute rows,
 * spirit root, technique, equipment, injuries, inventory summary and 好感.
 * 机缘 is intentionally absent — the hidden attribute never renders.
 */
export function CharacterPanel({
  character: c,
  npcs = [],
  itemsById = {},
  techniquesById = {},
  artsById = {},
  className,
}: CharacterPanelProps) {
  const expPct =
    c.realm.expNeeded > 0
      ? Math.min((c.realm.exp / c.realm.expNeeded) * 100, 100)
      : 100;
  const hpPct = c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;
  const lifePct = c.lifespan > 0 ? ((c.lifespan - c.age) / c.lifespan) * 100 : 0;

  const rootStyle = SPIRIT_ROOT_STYLE[c.spiritRoot.grade];
  const technique = c.techniqueId ? techniquesById[c.techniqueId] : null;
  const itemCount = c.inventory.reduce((n, s) => n + s.count, 0);
  const bestItems = [...c.inventory]
    .map((s) => ({ stack: s, def: itemsById[s.itemId] }))
    .filter((x) => x.def)
    .sort((a, b) => (b.def!.grade as number) - (a.def!.grade as number))
    .slice(0, 3);

  return (
    <Card className={cn("corner-brackets relative", className)}>
      <CardContent className="relative flex flex-col gap-4">
        <HanziWatermark char="道" className="-top-6 -right-4" />

        {/* identity + realm */}
        <div className="relative flex flex-col items-center gap-1.5 pt-1 text-center">
          <span className="font-display text-3xl leading-tight text-paper-50">
            {c.name}
          </span>
          <span className="text-xs tracking-[0.3em] text-mist-400">
            {c.gender} · {c.sectId ? "宗门修士" : "散修"}
          </span>
          <span
            className={cn(
              "animate-qi-pulse pt-1 font-display text-xl tracking-[0.2em] text-gold-300 text-glow-gold"
            )}
          >
            {formatRealm(c.realm)}
          </span>
          <div className="w-full pt-1.5">
            <Progress value={expPct} aria-label="修为进度" />
            <div className="flex justify-between pt-1 font-mono text-[10px] tabular-nums text-mist-400">
              <span>修为</span>
              <span>
                {Math.floor(c.realm.exp)} / {c.realm.expNeeded}
              </span>
            </div>
          </div>
        </div>

        {/* vitals */}
        <div className="flex flex-col gap-2.5">
          <VitalRow
            icon={<HeartPulse className="size-3.5 text-crimson-400" />}
            label="气血"
            value={`${c.hp}/${c.maxHp}`}
            pct={hpPct}
            indicatorClassName="from-crimson-600 to-crimson-400 shadow-[0_0_8px_rgba(255,76,0,0.3)] bg-gradient-to-r"
          />
          <VitalRow
            icon={<Hourglass className="size-3.5 text-gold-300" />}
            label="寿元"
            value={`余${Math.max(c.lifespan - c.age, 0)}载`}
            pct={lifePct}
            indicatorClassName="from-gold-600 to-gold-400 shadow-[0_0_8px_rgba(242,190,69,0.3)] bg-gradient-to-r"
          />
        </div>

        <SectionHeading>属 性</SectionHeading>
        <div className="flex flex-col gap-2">
          {VISIBLE_ATTRIBUTES.map((key) => (
            <AttributeRow
              key={key}
              label={ATTRIBUTE_META[key].label}
              hint={ATTRIBUTE_META[key].hint}
              value={c.attributes[key]}
            />
          ))}
        </div>

        <SectionHeading>灵 根</SectionHeading>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge
            variant={rootStyle.badge}
            className={cn("px-3 py-2 font-serif text-sm tracking-[0.2em]", rootStyle.glowClass)}
          >
            {c.spiritRoot.grade}
          </Badge>
          {c.spiritRoot.elements.map((el) => (
            <span
              key={el}
              className="flex size-6 items-center justify-center rounded-full border border-ink-600 bg-ink-800 font-serif text-xs text-paper-200"
            >
              {el}
            </span>
          ))}
          <span className="font-mono text-xs tabular-nums text-mist-400">
            ×{c.spiritRoot.speedMultiplier}
          </span>
        </div>

        <SectionHeading>功 法</SectionHeading>
        <div className="flex flex-col items-center gap-1.5">
          {technique ? (
            <>
              <span className="font-serif text-sm tracking-widest text-jade-300">
                《{technique.name}》
              </span>
              <span className="text-[11px] text-mist-400">
                {technique.grade} · 速率×{technique.speedBonus}
              </span>
            </>
          ) : c.techniqueId ? (
            <span className="font-serif text-sm tracking-widest text-jade-300">
              {c.techniqueId}
            </span>
          ) : (
            <span className="text-xs text-mist-600">未得功法，气感未开</span>
          )}
          {c.combatArts.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {c.combatArts.map((artId) => (
                <Badge key={artId} variant="jade" className="text-[10px]">
                  <Sparkles data-icon="inline-start" />
                  {artsById[artId]?.name ?? artId}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <SectionHeading>装 备</SectionHeading>
        <div className="grid grid-cols-3 gap-1.5">
          <EquipSlot
            icon={<Sword className="size-3.5" />}
            label="兵刃"
            item={c.equipped.weapon ? itemsById[c.equipped.weapon] : undefined}
            rawId={c.equipped.weapon}
          />
          <EquipSlot
            icon={<Shield className="size-3.5" />}
            label="护具"
            item={c.equipped.armor ? itemsById[c.equipped.armor] : undefined}
            rawId={c.equipped.armor}
          />
          <EquipSlot
            icon={<Sparkles className="size-3.5" />}
            label="饰物"
            item={
              c.equipped.accessory ? itemsById[c.equipped.accessory] : undefined
            }
            rawId={c.equipped.accessory}
          />
        </div>

        {c.injuries.length > 0 ? (
          <>
            <SectionHeading>伤 势</SectionHeading>
            <div className="flex flex-wrap justify-center gap-1.5">
              {c.injuries.map((inj) => (
                <Badge key={inj.id} variant="destructive" className="text-[10px]">
                  {inj.name} · {"❋".repeat(inj.severity)} · 余{inj.turnsLeft}转
                </Badge>
              ))}
            </div>
          </>
        ) : null}

        <SectionHeading>储物袋</SectionHeading>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-mist-400">
              共 {itemCount} 件 · {c.inventory.length} 类
            </span>
            <span className="font-mono tabular-nums text-gold-300">
              ◈ {formatStones(c.spiritStones)} 灵石
            </span>
          </div>
          {bestItems.length > 0 ? (
            <div className="flex flex-col gap-1">
              {bestItems.map(({ stack, def }) => (
                <div
                  key={stack.itemId}
                  className="flex items-center justify-between rounded-sm bg-ink-800/50 px-2 py-1 text-xs"
                >
                  <span className={GRADE_INFO[def!.grade].textClass}>
                    {def!.name}
                  </span>
                  <span className="font-mono tabular-nums text-mist-400">
                    ×{stack.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-center text-xs text-mist-600">空空如也</span>
          )}
        </div>

        {npcs.length > 0 ? (
          <>
            <SectionHeading>因 缘</SectionHeading>
            <div className="flex flex-col gap-2">
              {npcs.map((npc) => (
                <FavorRow key={npc.id} npc={npc} />
              ))}
            </div>
          </>
        ) : null}

        <Separator className="mt-1 opacity-60" />
        <p className="text-center font-serif text-[10px] tracking-[0.3em] text-mist-600 select-none">
          天道无亲，常与善人
        </p>
      </CardContent>
    </Card>
  );
}

function VitalRow({
  icon,
  label,
  value,
  pct,
  indicatorClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  indicatorClassName: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-paper-200">
          {icon}
          {label}
        </span>
        <span className="font-mono tabular-nums text-mist-400">{value}</span>
      </div>
      <Progress
        value={Math.max(0, Math.min(pct, 100))}
        indicatorClassName={indicatorClassName}
        aria-label={label}
      />
    </div>
  );
}

function AttributeRow({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2.5" title={hint}>
      <span className="w-8 shrink-0 font-serif text-sm tracking-widest text-paper-200">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-[3px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < value
                ? "bg-gradient-to-r from-gold-600 to-gold-400"
                : "bg-ink-700"
            )}
          />
        ))}
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-gold-300">
        {value}
      </span>
    </div>
  );
}

function EquipSlot({
  icon,
  label,
  item,
  rawId,
}: {
  icon: React.ReactNode;
  label: string;
  item?: ItemDef;
  rawId?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md px-1 py-2 ring-1",
        item
          ? cn(GRADE_INFO[item.grade].bgClass, GRADE_INFO[item.grade].ringClass)
          : "bg-ink-900/40 ring-ink-700/60"
      )}
    >
      <span className={item ? GRADE_INFO[item.grade].textClass : "text-mist-600"}>
        {icon}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-center text-[10px] leading-tight",
          item ? GRADE_INFO[item.grade].textClass : "text-mist-600"
        )}
      >
        {item?.name ?? rawId ?? label}
      </span>
    </div>
  );
}

function FavorRow({ npc }: { npc: Npc }) {
  const pct = Math.min(Math.abs(npc.favor), 100);
  const positive = npc.favor >= 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-paper-200">{npc.name}</span>
        <span className="text-[10px] text-mist-400">{npc.identity}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-ink-700">
          <span
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              positive
                ? "bg-gradient-to-r from-jade-600 to-jade-400"
                : "bg-gradient-to-r from-crimson-600 to-crimson-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={cn(
            "w-8 text-right font-mono text-[10px] tabular-nums",
            positive ? "text-jade-300" : "text-crimson-400"
          )}
        >
          {npc.favor > 0 ? `+${npc.favor}` : npc.favor}
        </span>
      </div>
    </div>
  );
}
