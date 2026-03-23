"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import DarkVeil from "@/app/components/animated/dark-veil"
import FluidGlass from "@/app/components/animated/fluid-glass"
import { cn } from "@/lib/utils"

const UX_SLIDES = [
  {
    title: "Less friction",
    subtitle:
      "Every click should bring you closer to the game, not push you away: a short path, fewer pointless steps, and a UI that respects your time.",
  },
  {
    title: "Fast navigation",
    subtitle:
      "Finding a piece of info or a tool shouldn’t feel like a mini-game: clear structure, useful shortcuts, filters built for real use cases (handle, mode, stats…).",
  },
  {
    title: "Clean interface",
    subtitle:
      "The screen should breathe: readable hierarchy, solid contrast, light motion — less visual noise, more focus.",
  },
  {
    title: "Premium feel",
    subtitle:
      "Polished micro-interactions, helpful copy, consistency start to finish: a UX that builds trust and makes you want to come back.",
  },
] as const

const GLASS_H = "min(76vh, 720px)" as const

export type UxFeelsBetterContentProps = {
  titleFontClassName?: string
}

/** Veil + glass + scroll chunk — mounted only after parent section defer. */
export function UxFeelsBetterContent({ titleFontClassName }: UxFeelsBetterContentProps) {
  const [veilCanvas, setVeilCanvas] = useState<HTMLCanvasElement | null>(null)
  const [glassInView, setGlassInView] = useState(true)
  const glassFrameRef = useRef<HTMLDivElement>(null)

  const onVeilCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    setVeilCanvas(el)
  }, [])

  /**
   * Wide root margin: avoids clipping the texture while the frame is still below the fold
   * while the section title is already visible.
   */
  useEffect(() => {
    const el = glassFrameRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([e]) => setGlassInView(e.isIntersecting),
      { root: null, rootMargin: "320px 0px 520px 0px", threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12 lg:mb-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Experience</p>
        <h2
          id="ux-feels-better-heading"
          className={cn(
            titleFontClassName,
            "mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
          )}
        >
          Why it feels better
        </h2>
        <p className="mt-4 text-base text-zinc-400 sm:text-lg">
          Four reasons we built the platform around clarity, speed, and a premium feel — scroll inside the frame.
        </p>
      </div>

      <div
        ref={glassFrameRef}
        className={cn(
          "relative isolate flex w-full flex-col overflow-hidden rounded-3xl",
          "border border-white/10 shadow-[0_0_80px_-24px_rgba(80,60,140,0.5)]",
        )}
        style={{ height: GLASS_H, minHeight: "260px" }}
      >
        <DarkVeil
          ref={onVeilCanvasRef}
          resolutionScale={0.82}
          speed={0.35}
          hueShift={-42}
          noiseIntensity={0.035}
          scanlineIntensity={0.06}
          scanlineFrequency={0.9}
          warpAmount={0.12}
        />

        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden
        />

        <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col bg-transparent">
          <FluidGlass
            backdropActive={glassInView}
            backdropCanvas={veilCanvas}
            className="h-full min-h-0 flex-1 bg-transparent"
            mode="lens"
            overlayScroll={{
              slides: [...UX_SLIDES],
              titleFontClassName,
            }}
            lensProps={{
              scale: 0.15,
              ior: 1.05,
              thickness: 4.75,
              chromaticAberration: 0.05,
              anisotropy: 0.02,
              samples: 6,
            }}
          />
        </div>
      </div>
    </div>
  )
}
