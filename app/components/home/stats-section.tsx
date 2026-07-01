"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { animate, motion } from "framer-motion"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { useDeferSectionMount } from "@/hooks/use-defer-section-mount"
import { SectionPlaceholder } from "@/app/components/home/section-placeholder"
import { cn } from "@/lib/utils"

type Period = {
  id: string
  label: string
  stats: readonly [
    { value: number; suffix?: string; decimals?: number; label: string },
    { value: number; suffix?: string; decimals?: number; label: string },
    { value: number; suffix?: string; decimals?: number; label: string },
    { value: number; suffix?: string; decimals?: number; label: string },
  ]
}

const PERIODS: Period[] = [
  {
    id: "p1",
    label: "2023 — 2024",
    stats: [
      { value: 100, label: "Active members" },
      { value: 5, label: "Cheats listed" },
      { value: 4, label: "Updates / month" },
      { value: 67.1, suffix: "%", decimals: 1, label: "Uptime" },
    ],
  },
  {
    id: "p2",
    label: "2024 — 2025",
    stats: [
      { value: 3000, label: "Active members" },
      { value: 20, label: "Cheats listed" },
      { value: 6, label: "Updates / month" },
      { value: 86.4, suffix: "%", decimals: 1, label: "Uptime" },
    ],
  },
  {
    id: "p3",
    label: "2025 — 2026",
    stats: [
      { value: 7000, label: "Active members" },
      { value: 50, label: "Cheats listed" },
      { value: 9, label: "Updates / month" },
      { value: 95.6, suffix: "%", decimals: 1, label: "Uptime" },
    ],
  },
  {
    id: "p4",
    label: "2026 — 2027",
    stats: [
      { value: 10000, suffix: "+", label: "Active members" },
      { value: 110, label: "Cheats listed" },
      { value: 12, label: "Updates / month" },
      { value: 98.8, suffix: "%", decimals: 1, label: "Uptime" },
    ],
  },
]

/**
 * Compact “k” format only for ≥ 10,000 (e.g. 10k+).
 * Between 1,000 and 9,999: thousands with locale grouping (e.g. 3,000).
 */
function formatStat(n: number, decimals = 0) {
  if (decimals > 0) {
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }
  const r = Math.round(n)
  if (r < 1000) return String(r)
  if (r < 10000) return r.toLocaleString("en-US", { maximumFractionDigits: 0 })
  const k = n / 1000
  const rounded = Math.round(k * 10) / 10
  if (Number.isInteger(rounded) || Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return `${Math.round(rounded)}k`
  }
  return `${rounded.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
}

function StatValue({
  value,
  suffix,
  decimals = 0,
  active,
}: {
  value: number
  suffix?: string
  decimals?: number
  active: boolean
}) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!active) return
    setDisplay(0)
    const controls = animate(0, value, {
      duration: 1.15,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, active])

  return (
    <span ref={ref} className="tabular-nums tracking-tight">
      {formatStat(display, decimals)}
      {suffix ?? ""}
    </span>
  )
}

type StatsSectionProps = {
  titleFontClassName?: string
}

/** Stats → elbow segment (fixed while the grid layout is stable). */
function buildPathBase(elbowX: number, anchorX: number, anchorY: number) {
  return `M ${elbowX} ${anchorY} H ${anchorX}`
}

/** Elbow → pill segment (only part that changes with the period). */
function buildPathTip(
  tipX: number,
  tipY: number,
  anchorX: number,
  anchorY: number,
): { pathTip: string; elbowX: number } | null {
  const w = tipX - anchorX
  if (w <= 4) return null
  const midX = tipX - 0.28 * w
  const elbowX = anchorX + 0.39 * (midX - anchorX)
  return { pathTip: `M ${tipX} ${tipY} H ${midX} L ${elbowX} ${anchorY}`, elbowX }
}

type LineGeom = {
  pathBaseD: string
  pathTipD: string
  tipX: number
  tipY: number
  anchorX: number
  anchorY: number
  svgW: number
  svgH: number
}

const EMPTY_LINE: LineGeom = {
  pathBaseD: "",
  pathTipD: "",
  tipX: 0,
  tipY: 0,
  anchorX: 0,
  anchorY: 0,
  svgW: 0,
  svgH: 0,
}

/**
 * Stats section — inspired by stats15 layout: grid + period pills + SVG connector line.
 */
export function StatsSection({ titleFontClassName }: StatsSectionProps) {
  const { sectionRef, shouldLoad } = useDeferSectionMount()
  const [periodIndex, setPeriodIndex] = useState(PERIODS.length - 1)
  const period = PERIODS[periodIndex]!
  const statsRowRef = useRef<HTMLDivElement>(null)
  const statsGridRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lineGeom, setLineGeom] = useState<LineGeom>(EMPTY_LINE)

  const updateLinePath = useCallback(() => {
    const row = statsRowRef.current
    const grid = statsGridRef.current
    const wrap = pillRefs.current[periodIndex]
    if (!row || !grid || !wrap) return
    const rowRect = row.getBoundingClientRect()
    const gridRect = grid.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    const svgW = rowRect.width
    const svgH = rowRect.height
    const anchorX = gridRect.right - rowRect.left
    const anchorY = gridRect.top + gridRect.height / 2 - rowRect.top
    const tipX = wrapRect.left - rowRect.left
    const tipY = wrapRect.top + wrapRect.height / 2 - rowRect.top
    if (tipX <= anchorX + 4 || svgW < 8 || svgH < 8) {
      setLineGeom((prev) => ({ ...prev, pathBaseD: "", pathTipD: "", svgW, svgH }))
      return
    }
    const tipSeg = buildPathTip(tipX, tipY, anchorX, anchorY)
    if (!tipSeg) return
    const pathBaseD = buildPathBase(tipSeg.elbowX, anchorX, anchorY)
    setLineGeom({
      pathBaseD,
      pathTipD: tipSeg.pathTip,
      tipX,
      tipY,
      anchorX,
      anchorY,
      svgW,
      svgH,
    })
  }, [periodIndex, shouldLoad])

  useLayoutEffect(() => {
    if (!shouldLoad) return
    updateLinePath()
  }, [shouldLoad, updateLinePath])

  useEffect(() => {
    if (!shouldLoad) return
    const row = statsRowRef.current
    if (!row) return
    const ro = new ResizeObserver(() => updateLinePath())
    ro.observe(row)
    window.addEventListener("resize", updateLinePath)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", updateLinePath)
    }
  }, [shouldLoad, updateLinePath])

  return (
    <section
      ref={sectionRef}
      id="stats"
      aria-labelledby={shouldLoad ? "stats-heading" : undefined}
      aria-busy={!shouldLoad}
      data-deferred-section={shouldLoad ? "ready" : "pending"}
      className="relative w-full bg-black pt-32 pb-24 sm:pt-36 sm:pb-28 lg:pt-40 lg:pb-32"
    >
      {!shouldLoad ? (
        <SectionPlaceholder className="min-h-[520px]" />
      ) : (
        <div
          ref={statsRowRef}
          className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 md:flex-row md:gap-8 lg:gap-16"
        >
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0 hidden overflow-visible md:block"
            width={Math.max(1, lineGeom.svgW)}
            height={Math.max(1, lineGeom.svgH)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            {lineGeom.pathTipD ? (
              <>
                {/* Fixed base: no spring on path d */}
                <path
                  d={lineGeom.pathBaseD}
                  stroke="black"
                  strokeWidth={1.5}
                  pathLength={1}
                  strokeDashoffset={0}
                  strokeDasharray="1 1"
                  className="opacity-20"
                />
                <path
                  d={lineGeom.pathBaseD}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  pathLength={1}
                  strokeDashoffset={0}
                  strokeDasharray="1 1"
                  className="text-emerald-500/90 opacity-90"
                />
                <path
                  d={lineGeom.pathTipD}
                  stroke="black"
                  strokeWidth={1.5}
                  pathLength={1}
                  strokeDashoffset={0}
                  strokeDasharray="1 1"
                  className="opacity-20"
                />
                <motion.path
                  d={lineGeom.pathTipD}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  pathLength={1}
                  strokeDashoffset={0}
                  strokeDasharray="1 1"
                  className="text-emerald-500/90 opacity-90"
                  initial={false}
                  animate={{ d: lineGeom.pathTipD }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
                <motion.circle
                  r={5}
                  fill="currentColor"
                  className="text-emerald-500/90"
                  initial={false}
                  animate={{ cx: lineGeom.tipX, cy: lineGeom.tipY }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
                <circle
                  cx={lineGeom.anchorX}
                  cy={lineGeom.anchorY}
                  r={5}
                  fill="currentColor"
                  className="text-emerald-500/90"
                />
              </>
            ) : null}
          </svg>

          <div className="relative z-10 md:flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
              Stats
            </p>
            <h2
              id="stats-heading"
              className={cn(
                titleFontClassName,
                "mt-4 max-w-xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
              )}
            >
              Numbers, not noise
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Usage and internal growth rolled up — useful signals so you get a serious sense of activity, not
              marketing fluff.
            </p>
            <div className="my-10 flex flex-wrap gap-3">
              <Button size="lg" className="group rounded-full px-5 text-base tracking-tight" asChild>
                <Link href="/dashboard" className="inline-flex items-center gap-2">
                  <span>Get started</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4 -rotate-45 transition-all ease-out group-hover:ml-1 group-hover:rotate-0"
                    strokeWidth={2}
                  />
                </Link>
              </Button>
            </div>

            <div ref={statsGridRef} className="mt-12 flex max-w-3xl flex-col items-stretch md:mt-32">
              <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {period.stats.map((s) => (
                  <div key={`${period.id}-${s.label}`} className="w-full text-left">
                    <p className="text-3xl font-medium tabular-nums text-white sm:text-4xl lg:text-5xl">
                      <StatValue
                        value={s.value}
                        suffix={s.suffix}
                        decimals={s.decimals}
                        active={shouldLoad}
                      />
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-line text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex w-full flex-row flex-wrap gap-2 overflow-visible md:mt-56 md:w-fit md:flex-col md:items-start md:pl-0 md:pr-2">
            {/* Copy + reverse: avoid mutating PERIODS; idx = real index in PERIODS */}
            {[...PERIODS].reverse().map((p, displayIndex) => {
              const idx = PERIODS.length - 1 - displayIndex
              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    pillRefs.current[idx] = el
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPeriodIndex(idx)}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 text-sm transition-all duration-300 ease-out",
                      idx === periodIndex
                        ? "bg-emerald-500 text-zinc-950"
                        : "bg-white/10 text-zinc-300 hover:bg-white/15",
                    )}
                  >
                    {p.label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
