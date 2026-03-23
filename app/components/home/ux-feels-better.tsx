"use client"

import dynamic from "next/dynamic"
import { useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { cn } from "@/lib/utils"

const UxFeelsBetterContentLoaded = dynamic(
  () => import("./ux-feels-better-content").then((m) => ({ default: m.UxFeelsBetterContent })),
  {
    loading: () => (
      <SectionPlaceholder className="min-h-[min(76vh,720px)] bg-black ring-white/8" />
    ),
  },
)

type UxFeelsBetterProps = {
  titleFontClassName?: string
}

export function UxFeelsBetter({ titleFontClassName }: UxFeelsBetterProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount()

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
        <UxFeelsBetterContentLoaded titleFontClassName={titleFontClassName} />
      )}
    </section>
  )
}
