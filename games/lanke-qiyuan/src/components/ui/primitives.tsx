'use client';

import type { ReactNode } from 'react';
import { cn, pct } from '@/lib/utils';

/**
 * The whole UI kit. Four primitives is enough for a text game, and writing
 * them by hand keeps the package dependency-free (next + react + zustand).
 */

type ButtonTone = 'zhu' | 'quiet' | 'xia' | 'ghost';

const BUTTON_TONES: Record<ButtonTone, string> = {
  zhu: 'bg-zhu-500 text-xuan-50 border-zhu-600 hover:bg-zhu-400 active:bg-zhu-600',
  quiet: 'bg-xuan-100 text-yan-900 border-xuan-400 hover:bg-xuan-200 hover:border-zhu-400',
  xia: 'bg-xuan-100 text-xia-700 border-xia-500/60 hover:bg-xia-500 hover:text-xuan-50',
  ghost: 'bg-transparent text-yan-700 border-transparent hover:bg-xuan-200',
};

export function Button({
  children,
  onClick,
  tone = 'quiet',
  disabled,
  className,
  title,
  ariaLabel,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 text-sm rounded-sm',
        'transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
        BUTTON_TONES[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn('panel rounded-sm', className)}>
      {title && (
        <header className="flex items-center justify-between border-b border-xuan-300 px-3 py-2">
          <h2 className="font-display text-sm tracking-[0.18em] text-zhu-600">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Meter({
  label,
  value,
  max,
  tone = 'zhu',
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'zhu' | 'tai' | 'xia' | 'yue';
  suffix?: string;
}) {
  const width = pct(value, max);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] text-yan-700">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          <span className="text-yan-500">/{max}</span>
          {suffix}
        </span>
      </div>
      <div
        className={cn('meter mt-1 h-1.5', `meter-${tone}`)}
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <i style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm" title={hint}>
      <span className="text-yan-500">{label}</span>
      <span className="font-display tabular-nums text-yan-900">{value}</span>
    </div>
  );
}

export function NodeRule({ className }: { className?: string }) {
  return <div className={cn('node-rule my-3', className)} aria-hidden="true" />;
}

/** 黑白子 — used as bullets, list markers and the loading indicator. */
export function Stone({ color, size = 10 }: { color: 'black' | 'white'; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={color === 'black' ? 'stone-black' : 'stone-white'}
      style={{ width: size, height: size }}
    />
  );
}
