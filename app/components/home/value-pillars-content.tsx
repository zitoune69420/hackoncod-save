"use client"

import ScrollStack, { ScrollStackItem } from "@/app/components/animated/scroll-stack"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Refresh01Icon,
  InformationCircleIcon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const PILLARS = [
  {
    title: "Stability",
    body: "Curated listings and consistent tooling — fewer surprises when you need something that works.",
    icon: CheckmarkCircle02Icon,
  },
  {
    title: "Fast updates",
    body: "We refresh the catalog and surface changes quickly so you’re not stuck on stale links or old builds.",
    icon: Refresh01Icon,
  },
  {
    title: "Security",
    body: "Clear sourcing and sane practices — we steer clear of shady bundles and opaque downloads.",
    icon: InformationCircleIcon,
  },
  {
    title: "Support",
    body: "A direct line when something breaks: guidance, docs, and real humans when it matters.",
    icon: UserGroup02Icon,
  },
] as const

export type ValuePillarsContentProps = {
  titleFontClassName?: string
}

/** Heavy scroll-stack content — loaded only when the section enters the viewport zone. */
export function ValuePillarsContent({ titleFontClassName }: ValuePillarsContentProps) {
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-16 text-center sm:pb-12 sm:pt-20 lg:pb-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          Value pillars
        </p>
        <h2
          id="value-pillars-heading"
          className={cn(
            titleFontClassName,
            "mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
          )}
        >
          Why us
        </h2>
        <p className="mt-4 text-base text-zinc-400 sm:text-lg">
          Four reasons players keep coming back.
        </p>
      </div>

      <ScrollStack
        useWindowScroll
        smoothScroll={false}
        blurAmount={0}
        baseScale={0.92}
        itemDistance={120}
        itemScale={0.019}
        itemStackDistance={28}
        stackPosition="25%"
        stackInsetTop={42}
        scaleEndPosition="6%"
        className="mx-auto w-full max-w-3xl px-3 sm:px-4"
        innerClassName="max-w-3xl !pt-[min(5vh,3.5rem)] px-2 sm:!pt-[min(8vh,5rem)] sm:px-4 md:!pt-[min(10vh,6rem)] md:px-10"
      >
        {PILLARS.map(({ title, body, icon }) => (
          <ScrollStackItem
            key={title}
            itemClassName={cn(
              "flex min-h-[22rem] flex-col border border-white/15 md:min-h-[26rem]",
              "bg-zinc-950 text-white",
              "p-9 shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:p-11 md:p-14",
            )}
          >
            <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white sm:size-14">
              <HugeiconsIcon icon={icon} className="size-7 sm:size-8" strokeWidth={2} />
            </span>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
            <p className="mt-4 max-w-prose text-base leading-relaxed text-white/65 sm:text-lg">{body}</p>
          </ScrollStackItem>
        ))}
      </ScrollStack>
    </>
  )
}
