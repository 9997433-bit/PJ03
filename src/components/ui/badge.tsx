import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // 鎏金 — subtle gilded chip (realm names, rare tags)
        default:
          "border-gold-600/40 bg-gold-400/12 text-gold-300 [a]:hover:bg-gold-400/20",
        // solid gold — reserved for the rarest moments (天灵根, 大吉)
        gold: "border-gold-400/60 bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 font-semibold shadow-[0_0_14px_rgba(242,190,69,0.35)]",
        // 碧玉 — vitality / success
        jade: "border-jade-600/50 bg-jade-400/12 text-jade-300 [a]:hover:bg-jade-400/20",
        // 胭脂 — danger / injury
        destructive:
          "border-crimson-600/50 bg-crimson-600/15 text-crimson-400 focus-visible:ring-destructive/20 [a]:hover:bg-crimson-600/25",
        // 紫棠 — legendary tier
        mystic:
          "border-mystic-600/60 bg-mystic-900/30 text-mystic-400 [a]:hover:bg-mystic-900/50",
        secondary:
          "border-ink-700 bg-ink-800 text-paper-200 [a]:hover:bg-ink-700",
        outline:
          "border-ink-600 text-paper-200 [a]:hover:bg-ink-800 [a]:hover:text-paper-50",
        ghost:
          "hover:bg-ink-800 hover:text-paper-200",
        link: "text-gold-300 underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
