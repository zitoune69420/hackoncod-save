"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import DarkVeil from "@/app/components/animated/dark-veil"
import FluidGlass from "@/app/components/animated/fluid-glass"
import { useSectionVisible } from "@/hooks/use-section-visible"
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

/**
 * Veil + glass + scroll — mounted only after parent `useDeferSectionMount`.
 * Ne pas piloter `backdropActive` via un IO instable (scroll interne) : on observe le cadre
 * glass pour `paused` / `renderActive` afin de couper RAF + R3F quand le bloc n’est pas visible.
 */
export function UxFeelsBetterContent({ titleFontClassName }: UxFeelsBetterContentProps) {
  const [veilCanvas, setVeilCanvas] = useState<HTMLCanvasElement | null>(null)
  const glassFrameRef = useRef<HTMLDivElement>(null)
  /** Cadre lentille + voile : pause RAF / R3F quand ce bloc n’est pas au viewport. */
  const glassInView = useSectionVisible(glassFrameRef, { rootMargin: "96px 0px" })
  /**
   * La lentille lit le canvas du voile : si R3F reprend la même frame que la reprise du voile,
   * la texture est vide / périmée → flash. On attend 2 frames de RAF (voile peint d’abord),
   * puis on active le Canvas + fondu (voir wrapper ci‑dessous).
   */
  const [r3fReady, setR3fReady] = useState(false)

  useEffect(() => {
    if (!glassInView) {
      setR3fReady(false)
      return
    }
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setR3fReady(true)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [glassInView])

  const onVeilCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    setVeilCanvas(el)
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
          paused={!glassInView}
          resolutionScale={0.76}
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

        <div
          className={cn(
            "relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col bg-transparent",
            "transition-opacity duration-200 ease-out motion-reduce:transition-none",
            glassInView && r3fReady ? "opacity-100" : "opacity-0",
          )}
        >
          <FluidGlass
            renderActive={glassInView && r3fReady}
            backdropActive
            backdropCanvas={veilCanvas}
            className="h-full min-h-0 flex-1 bg-transparent"
            mode="lens"
            overlayScroll={{
              slides: [...UX_SLIDES],
              titleFontClassName,
            }}
            lensProps={{
              scale: 0.15,
              ior: 1.15,
              thickness: 2,
              chromaticAberration: 0.05,
              anisotropy: 0.02,
              samples: 4,
            }}
          />
        </div>
      </div>
    </div>
  )
}
