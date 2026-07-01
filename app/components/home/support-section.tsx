"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  CustomerSupportIcon,
  FlashIcon,
  CrownIcon,
} from "@hugeicons/core-free-icons"
import { motion, useReducedMotion } from "framer-motion"
import { useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { cn } from "@/lib/utils"

const PILLARS = [
  {
    icon: CustomerSupportIcon,
    kicker: "01",
    title: "Real support",
    line:
      "No chatbot runaround — someone reads your ticket and replies with real context.",
  },
  {
    icon: FlashIcon,
    kicker: "02",
    title: "Fast responses",
    line:
      "When you’re stuck, waiting hurts — we aim to unblock you quickly, without jargon.",
  },
  {
    icon: CrownIcon,
    kicker: "03",
    title: "Premium priority",
    line:
      "Dedicated queue and priority escalation — premium members jump the line when it’s urgent.",
  },
] as const

const headerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
}

const fadeUp = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 32 },
  },
})

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const cardVariants = (reduce: boolean, i: number) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 28, rotateX: reduce ? 0 : -6 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 28,
      delay: i * 0.04,
    },
  },
})

type SupportSectionProps = {
  titleFontClassName?: string
}

export function SupportSection({ titleFontClassName }: SupportSectionProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount()
  const reduceMotion = useReducedMotion()

  return (
    <section
      ref={sectionRef}
      id="support"
      aria-labelledby={shouldLoad ? "support-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
      className="relative isolate overflow-hidden border-t border-white/[0.07] bg-black px-4 py-14 sm:py-20 lg:py-24"
    >
      {/* Background: colored halos */}
      {shouldLoad ? (
        <>
          <div
            className="pointer-events-none absolute -left-[22%] top-[12%] z-0 h-[min(420px,54vh)] w-[74%] rounded-full bg-emerald-500/8 blur-[125px]"
            aria-hidden
          />
        </>
      ) : null}

      {!shouldLoad ? (
        <SectionPlaceholder className="relative z-10 min-h-[280px] sm:min-h-[320px]" />
      ) : (
        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            className="mx-auto mb-12 max-w-2xl text-center sm:mb-14 lg:mb-16"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={headerVariants}
          >
            <motion.p
              variants={fadeUp(!!reduceMotion)}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90"
            >
              Support
            </motion.p>
            <motion.h2
              id="support-heading"
              variants={fadeUp(!!reduceMotion)}
              className={cn(
                titleFontClassName,
                "mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
              )}
            >
              After the click is where it really counts
            </motion.h2>
            <motion.p
              variants={fadeUp(!!reduceMotion)}
              className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg"
            >
              Many polish the landing page, then leave support to chance. We don’t: human answers, speed when
              you’re stuck, and a priority lane for premium.
            </motion.p>
          </motion.div>

          <motion.ul
            className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            variants={listContainer}
          >
            {PILLARS.map(({ icon, kicker, title, line }, i) => (
              <motion.li
                key={title}
                variants={cardVariants(!!reduceMotion, i)}
                style={{ perspective: 900 }}
                className="group relative"
              >
                <div
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-zinc-950/40 p-6 backdrop-blur-sm transition-colors duration-300 sm:p-7",
                    "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/[0.06] before:to-transparent before:opacity-0 before:transition-opacity group-hover:before:opacity-100",
                    "shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition-shadow duration-300 group-hover:border-emerald-500/25 group-hover:shadow-[0_20px_50px_-24px_rgba(16,185,129,0.15)]",
                  )}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <motion.span
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300 shadow-inner shadow-emerald-900/20"
                      whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: [0, -3, 3, 0] }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <HugeiconsIcon icon={icon} className="size-6" strokeWidth={2} />
                    </motion.span>
                    <span className="font-mono text-xs font-medium tabular-nums text-zinc-600 transition-colors group-hover:text-emerald-500/80">
                      {kicker}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">{line}</p>

                  {/* Subtle scan line on hover */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px translate-y-full bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}
    </section>
  )
}
