"use client"

import dynamic from "next/dynamic"
import { useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"

const ValuePillarsContentLoaded = dynamic(
  () => import("./value-pillars-content").then((m) => ({ default: m.ValuePillarsContent })),
  {
    loading: () => <SectionPlaceholder className="min-h-[min(90vh,820px)]" />,
  },
)

type ValuePillarsProps = {
  titleFontClassName?: string
}

export function ValuePillars({ titleFontClassName }: ValuePillarsProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount()

  return (
    <section
      ref={sectionRef}
      id="value-pillars"
      aria-labelledby={shouldLoad ? "value-pillars-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
      className="relative bg-black text-white"
    >
      {!shouldLoad ? (
        <SectionPlaceholder className="min-h-[min(90vh,820px)]" />
      ) : (
        <ValuePillarsContentLoaded titleFontClassName={titleFontClassName} />
      )}
    </section>
  )
}
