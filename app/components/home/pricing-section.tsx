"use client"

import dynamic from "next/dynamic"
import { useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { cn } from "@/lib/utils"

const PricingSectionContentLoaded = dynamic(
  () => import("./pricing-section-content").then((m) => ({ default: m.PricingSectionContent })),
  {
    loading: () => <SectionPlaceholder className="min-h-[560px]" />,
  },
)

type PricingSectionProps = {
  titleFontClassName?: string
}

export function PricingSection({ titleFontClassName }: PricingSectionProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount()

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative z-10 bg-black pb-16 pt-24 text-zinc-100 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32",
        "scheme-dark selection:bg-white/10",
      )}
      aria-labelledby={shouldLoad ? "pricing-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
    >
      {!shouldLoad ? (
        <SectionPlaceholder className="min-h-[560px]" />
      ) : (
        <PricingSectionContentLoaded titleFontClassName={titleFontClassName} />
      )}
    </section>
  )
}
