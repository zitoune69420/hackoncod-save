"use client"

import { DEFER_ROOT_MARGIN_HEAVY, useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { UxFeelsBetterContent } from "@/app/components/home/ux-feels-better-content"
import { cn } from "@/lib/utils"

type UxFeelsBetterProps = {
  titleFontClassName?: string
}

export function UxFeelsBetter({ titleFontClassName }: UxFeelsBetterProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount(DEFER_ROOT_MARGIN_HEAVY)

  return (
    <section
      ref={sectionRef}
      className={cn(
        "dark relative z-10 bg-black pt-8 pb-20 text-zinc-50 sm:pt-10 sm:pb-24 lg:pb-28",
        "-mt-16 sm:-mt-20 lg:-mt-28",
        "scheme-dark selection:bg-white/15",
      )}
      aria-labelledby={shouldLoad ? "ux-feels-better-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
    >
      {!shouldLoad ? (
        <SectionPlaceholder className="min-h-[min(76vh,720px)] bg-black ring-white/8" />
      ) : (
        <UxFeelsBetterContent titleFontClassName={titleFontClassName} />
      )}
    </section>
  )
}
