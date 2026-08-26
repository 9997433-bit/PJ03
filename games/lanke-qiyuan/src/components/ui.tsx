'use client';

/** Small presentational primitives shared by every screen. */

import type { ReactNode } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Panel({
  children,
  className,
  ruled = true,
  corners = false,
}: {
  children: ReactNode;
  className?: string;
  ruled?: boolean;
  corners?: boolean;
}) {
  return (
    <div className={cx('panel', ruled && 'panel-ruled', corners && 'stone-corners', className)}>
      {corners && (
        <>
          <span className="sc sc-tl" />
          <span className="sc sc-tr" />
          <span className="sc sc-bl" />
          <span className="sc sc-br" />
        </>
      )}
      {children}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-bamboo-300 text-sm tracking-[0.28em]">{children}</h3>
      {aside && <span className="text-paper-500 text-[11px] tabular-nums">{aside}</span>}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  primary,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx('btn px-3 py-2 text-sm', primary && 'btn-primary', className)}
    >
      {children}
    </button>
  );
}

export function Meter({
  value,
  max,
  tone = 'bamboo',
  className,
}: {
  value: number;
  max: number;
  tone?: 'bamboo' | 'jade' | 'dusk' | 'moon';
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx('meter', `meter-${tone}`, 'h-[3px] w-full', className)}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A labelled meter with a numeric readout — the status rail's workhorse. */
export function Gauge({
  label,
  value,
  max,
  tone = 'bamboo',
  suffix,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'bamboo' | 'jade' | 'dusk' | 'moon';
  suffix?: string;
  hint?: string;
}) {
  return (
    <div title={hint}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-paper-400 text-[11px] tracking-[0.2em]">{label}</span>
        <span className="text-paper-200 text-[11px] tabular-nums">
          {value}
          <span className="text-paper-500">
            /{max}
            {suffix ?? ''}
          </span>
        </span>
      </div>
      <Meter value={value} max={max} tone={tone} />
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[3px]">
      <span className="text-paper-500 text-[11px] tracking-[0.18em]">{label}</span>
      <span className={cx('text-[13px] tabular-nums', tone ?? 'text-paper-100 text-paper-200')}>
        {value}
      </span>
    </div>
  );
}

export function Rule() {
  return <div className="rule-stone my-4" />;
}

export function Stone({ white }: { white?: boolean }) {
  return <span className={cx('stone', white ? 'stone-white' : 'stone-black')} />;
}
