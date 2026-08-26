/** Joins class names, dropping falsy entries. Deliberately dependency-free. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Clamped 0–100 percentage for the meter widths. */
export function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
