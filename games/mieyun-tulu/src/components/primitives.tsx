'use client';

/**
 * primitives.tsx — the small shared pieces of the 玄紫 shell
 *
 * Buttons, bars and the dual meter. Kept in one file because they are all
 * presentational and none of them is more than a few lines; anything with a
 * rule in it belongs in `engine/`, not here.
 */

import type { ReactNode } from 'react';

export function Button({
  children,
  onClick,
  disabled,
  tone = 'default',
  hotkey,
  title,
  ariaLabel,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'ghost' | 'gold';
  hotkey?: string;
  title?: string;
  ariaLabel?: string;
  full?: boolean;
}) {
  const tones: Record<string, string> = {
    default:
      'border-rim-soft bg-nebula/80 text-star hover:border-violet-core hover:bg-nebula-2',
    primary:
      'border-violet-core/70 bg-violet-core/18 text-orchid hover:bg-violet-core/32',
    gold: 'border-track-dim bg-track/10 text-track hover:bg-track/20',
    danger: 'border-jie-dim bg-jie/10 text-jie hover:bg-jie/20',
    ghost: 'border-transparent bg-transparent text-star-dim hover:text-star',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-keyshortcuts={hotkey}
      className={`${full ? 'w-full ' : ''}group relative inline-flex items-center justify-center gap-2 rounded border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]}`}
    >
      {hotkey ? (
        <span
          aria-hidden="true"
          className="rounded-sm border border-rim-soft px-1 text-[10px] leading-4 text-star-faint"
        >
          {hotkey}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export function Bar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-abyss ring-1 ring-rim-soft/60"
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5" title={hint}>
      <span className="text-xs text-star-faint">{label}</span>
      <span className="font-cjk-serif text-sm text-star tabular-nums">{value}</span>
    </div>
  );
}

/**
 * 气运 / 劫运 — drawn as one object because they are one object. The gold arc
 * grows rightward from the centre, the red arc grows leftward, and the gap
 * between them is the only room the character has to live in.
 */
export function DualMeter({ fortune, calamity, tier }: { fortune: number; calamity: number; tier: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-track">气运 {Math.round(fortune)}</span>
        <span className="font-cjk-serif text-[11px] text-star-faint">{tier}</span>
        <span className="text-jie">劫运 {Math.round(calamity * 10) / 10}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-abyss ring-1 ring-rim-soft">
        <div
          role="meter"
          aria-valuenow={Math.round(fortune)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="气运"
          className="absolute left-0 top-0 h-full transition-[width] duration-700"
          style={{
            width: `${Math.min(100, fortune)}%`,
            background: 'linear-gradient(90deg, rgba(242,200,121,.25), rgba(242,200,121,.85))',
          }}
        />
        <div
          role="meter"
          aria-valuenow={Math.round(calamity)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="劫运"
          className={`absolute right-0 top-0 h-full transition-[width] duration-700 ${calamity >= 60 ? 'anim-jie' : ''}`}
          style={{
            width: `${Math.min(100, calamity)}%`,
            background: 'linear-gradient(270deg, rgba(255,97,128,.3), rgba(255,97,128,.9))',
          }}
        />
      </div>
    </div>
  );
}

export function SectionTitle({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h3 className="font-cjk-serif text-sm tracking-[0.2em] text-amethyst">{children}</h3>
      {note ? <span className="text-[11px] text-star-faint">{note}</span> : null}
    </div>
  );
}

export function Odds({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-star-faint">必然</span>;
  const tone = value >= 70 ? 'text-jade' : value >= 40 ? 'text-track' : 'text-jie';
  return <span className={`text-xs tabular-nums ${tone}`}>{value}%</span>;
}
