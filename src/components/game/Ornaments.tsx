import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Four gilded corner pieces — the full-frame variant of the 「」 brackets.
 * Wrap any panel that deserves ceremony (creation cards, modals, the dice).
 */
export function CornerFrame({
  className,
  children,
  cornerClassName,
  ...props
}: React.ComponentProps<"div"> & { cornerClassName?: string }) {
  const corner = cn(
    "pointer-events-none absolute size-3.5 border-gold-400/60",
    cornerClassName
  );
  return (
    <div className={cn("relative", className)} {...props}>
      <span aria-hidden className={cn(corner, "top-0 left-0 border-t border-l")} />
      <span aria-hidden className={cn(corner, "top-0 right-0 border-t border-r")} />
      <span aria-hidden className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span aria-hidden className={cn(corner, "bottom-0 right-0 border-b border-r")} />
      {children}
    </div>
  );
}

/** Small gold section label flanked by hairlines — panel section headers. */
export function SectionHeading({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2.5 select-none", className)}
      {...props}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-600/50" />
      <span className="text-xs tracking-[0.3em] text-gold-600">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-600/50" />
    </div>
  );
}

/** Huge low-opacity calligraphy hanzi used as a panel watermark (道 / 仙 / 丹…). */
export function HanziWatermark({
  char,
  className,
}: {
  char: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute font-display text-[9rem] leading-none text-paper-50/[0.03] select-none",
        className
      )}
    >
      {char}
    </span>
  );
}

/** 印章 — the red seal stamp used for confirmations and reveals. */
export function SealStamp({
  char,
  className,
  animate = false,
}: {
  char: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={cn(
        "seal-stamp size-10 text-xl",
        animate && "animate-seal-stamp",
        className
      )}
    >
      {char}
    </span>
  );
}

/** ◆-centered hairline divider. */
export function OrnamentDivider({ className }: { className?: string }) {
  return <div className={cn("ornament-divider", className)} />;
}
