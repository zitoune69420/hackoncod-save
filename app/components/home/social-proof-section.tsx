"use client"

import { motion, useReducedMotion } from "framer-motion"
import GradientBlinds from "@/app/components/animated/gradient-blinds"
import { DEFER_ROOT_MARGIN_HEAVY, useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { useSectionVisible } from "@/hooks/use-section-visible"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { cn } from "@/lib/utils"

const QUOTES = [
  {
    quote:
      "I strongly encourage you to explore this option, as it truly deserves your attention. Take the time to discover it in detail—you might be pleasantly surprised by its advantages.",
    author: "CaptainGreg7",
  },
  {
    quote:
      "The instructions are clear and easy to follow, the staff is competent and well-trained, and you will always find people ready to assist you with kindness.",
    author: "zoxxq",
  },
  {
    quote:
      "Honestly, this is the best server I've ever seen, and I'm not just saying that because I'm the proud founder — we truly deserve a big round of applause! :)",
    author: "Omega",
  },
] as const

const headerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

const fade = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 32 } },
})

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

type SocialProofSectionProps = {
  titleFontClassName?: string
}

/** WebGL area height + top/bottom fades to avoid hard edges */
const BG_H = "min(820px,90vh)" as const

export function SocialProofSection({ titleFontClassName }: SocialProofSectionProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount(DEFER_ROOT_MARGIN_HEAVY)
  const webglSectionVisible = useSectionVisible(sectionRef, { rootMargin: "96px 0px" })
  const reduceMotion = useReducedMotion()

  return (
    <section
      ref={sectionRef}
      id="social-proof"
      aria-labelledby={shouldLoad ? "social-proof-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
      className="relative overflow-hidden bg-black"
    >
      {!shouldLoad ? (
        <SectionPlaceholder className="min-h-[700px]" />
      ) : (
        <>
          {/*
            isolate: canvas mix-blend-mode must not blend with text above
            (otherwise content can disappear visually).
          */}
          <div
            className="absolute left-0 right-0 top-0 isolate z-0 w-full overflow-hidden"
            style={{ height: BG_H }}
          >
            <GradientBlinds
              paused={!webglSectionVisible}
              gradientColors={["#FF9FFC", "#5227FF"]}
              angle={0}
              noise={0.3}
              blindCount={12}
              blindMinWidth={50}
              spotlightRadius={0.5}
              spotlightSoftness={1}
              spotlightOpacity={1}
              mouseDampening={0.1}
              distortAmount={0}
              shineDirection="left"
              mixBlendMode="lighten"
              className="absolute inset-0 h-full w-full"
            />
            {/* Soft top fade */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-1 min-h-[42%] bg-linear-to-b from-black via-black/80 to-transparent"
              aria-hidden
            />
            {/* Soft bottom fade into the section below */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-1 min-h-[42%] bg-linear-to-t from-black via-black/80 to-transparent"
              aria-hidden
            />
          </div>

          <div className="pointer-events-none relative z-10 mx-auto max-w-7xl px-5 pb-48 pt-32 sm:px-6 sm:pb-32 sm:pt-48 lg:pb-32 lg:pt-48">
            <motion.div
              className="mx-auto mb-14 max-w-3xl text-center sm:mb-16"
              initial="show"
              animate="show"
              variants={headerVariants}
            >
              <motion.p
                variants={fade(!!reduceMotion)}
                className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80 sm:text-base"
              >
                Social proof
              </motion.p>
              <motion.h2
                id="social-proof-heading"
                variants={fade(!!reduceMotion)}
                className={cn(
                  titleFontClassName,
                  "mt-4 text-balance text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl",
                )}
              >
                Credible feedback, not empty hype
              </motion.h2>
              <motion.p
                variants={fade(!!reduceMotion)}
                className="mt-5 text-lg text-zinc-100 sm:text-xl"
              >
                No wall of stars or suspiciously perfect anonymous quotes — lines you could actually hear in
                real life.
              </motion.p>
            </motion.div>

            <motion.ul
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
              initial="show"
              animate="show"
              variants={listVariants}
            >
              {QUOTES.map(({ quote, author }, i) => (
                <motion.li
                  key={author}
                  variants={fade(!!reduceMotion)}
                  custom={i}
                  className="flex flex-col rounded-3xl border border-white/15 bg-black/70 p-7 shadow-[0_8px_40px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-8"
                >
                  <p className="text-base leading-relaxed text-zinc-50 sm:text-lg">
                    <span className="text-emerald-400/90">&ldquo;</span>
                    {quote}
                    <span className="text-emerald-400/90">&rdquo;</span>
                  </p>
                  <p className="mt-5 text-sm font-medium text-zinc-400">{author}</p>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </>
      )}
    </section>
  )
}
