"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  ShoppingBag01Icon,
  SparklesIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { cn } from "@/lib/utils"

const ITEMS = [
  {
    icon: CheckmarkCircle02Icon,
    title: "Stable & dependable",
    line: "Curated tools, checked resources — less guesswork.",
  },
  {
    icon: ShoppingBag01Icon,
    title: "All access, one place",
    line: "Sign in once and reach cheats, tools, and docs from a single hub.",
  },
  {
    icon: SparklesIcon,
    title: "Dead simple",
    line: "Clean layout — find what you need without digging through noise.",
  },
  {
    icon: ArrowRight01Icon,
    title: "Start free",
    line: "Jump in at no cost and scale up only when you’re ready.",
  },
] as const

type TrustStripProps = {
  titleFontClassName?: string
}

/** Section 2 — trust strip: short UI friction copy (stability / access / simplicity). */
export function TrustStrip({ titleFontClassName }: TrustStripProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount()

  return (
    <section
      ref={sectionRef}
      aria-labelledby={shouldLoad ? "trust-strip-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
      className="relative border-t border-white/10 bg-black px-4 py-12 sm:py-24 lg:py-28"
    >
      {!shouldLoad ? (
        <SectionPlaceholder className="min-h-[240px]" />
      ) : (
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12 lg:mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Trust</p>
            <h2
              id="trust-strip-heading"
              className={cn(
                titleFontClassName,
                "mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
              )}
            >
              Why players stick with us
            </h2>
            <p className="mt-4 text-base text-zinc-400 sm:text-lg">
              Short promises that define how we ship stability, access, and simplicity.
            </p>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {ITEMS.map(({ icon, title, line }) => (
              <li
                key={title}
                className="flex flex-col items-center text-center lg:items-start lg:text-left"
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/90">
                  <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2} />
                </span>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-white/55 lg:max-w-none">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
