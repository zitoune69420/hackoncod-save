"use client"

import { cn } from "@/lib/utils"

/** Lightweight block while a section hasn’t loaded its heavy content yet */
export function SectionPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full animate-pulse rounded-xl bg-zinc-950/90 ring-1 ring-white/[0.06]",
        className,
      )}
      aria-hidden
    />
  )
}
