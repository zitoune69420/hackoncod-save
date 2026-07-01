"use client"

import dynamic from "next/dynamic"
const ColorBends = dynamic(() => import("@/app/components/animated/color-bends"), { ssr: false })
const SplitText = dynamic(() => import("@/app/components/animated/split-text"), { ssr: false })

import {
  clearHeroSubtitlePhase,
  HERO_SUBTITLE_START_EVENT,
  setHeroSubtitlePhaseComplete,
} from "@/lib/home-events"
import { cn } from "@/lib/utils"
import { gsap } from "gsap"
import { useLayoutEffect, useRef } from "react"

type HomeHeroProps = {
  fontClassName: string
  title: string
  titleClassName?: string
  children?: React.ReactNode
}

/** Title paints immediately with a fast animation (LCP-friendly); ColorBends
 *  background fades in independently, then content below the title fades in. */
export function HomeHero({
  fontClassName,
  title,
  titleClassName,
  children,
}: HomeHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const restRef = useRef<HTMLDivElement>(null)
  // Title renders immediately so it paints fast (better LCP); the background
  // fades in independently in parallel instead of gating the title.

  useLayoutEffect(() => {
    const root = rootRef.current
    const bg = bgRef.current
    if (!root || !bg) return

    clearHeroSubtitlePhase()

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bg,
        { opacity: 0 },
        { opacity: 1, duration: 1.2, ease: "power2.out" }
      )
    }, root)

    return () => ctx.revert()
  }, [])

  const onTitleComplete = () => {
    setHeroSubtitlePhaseComplete()
    window.dispatchEvent(new CustomEvent(HERO_SUBTITLE_START_EVENT))
    if (!children) return
    const rest = restRef.current
    if (!rest) return
    gsap.fromTo(
      rest,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-black px-4 pt-24 sm:pt-52"
    >
      <div
        ref={bgRef}
        className="pointer-events-none absolute inset-0 z-0 min-h-screen opacity-0"
      >
        <ColorBends
          className="h-full min-h-full w-full"
          colors={["#ae00ff","#003d4d"]}
          rotation={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={0}
          parallax={0}
          noise={0.12}
          transparent
          autoRotate={0}
        />
      </div>

      <div className="relative z-10 -mt-10 flex w-full max-w-[1400px] flex-col items-center sm:-mt-14 md:-mt-48">
        <SplitText
          text={title}
          tag="h1"
          className={cn(
            "max-w-[1400px] text-center text-[clamp(44px,7vw,88px)] font-extrabold tracking-[-0.03em] text-white",
            titleClassName
          )}
          font={fontClassName}
          playOnMount
          mountDelay={0}
          delay={12}
          duration={0.35}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 18 }}
          to={{ opacity: 1, y: 0 }}
          textAlign="center"
          onLetterAnimationComplete={onTitleComplete}
        />
        {children ? (
          <div
            ref={restRef}
            className="mt-8 flex w-full flex-col items-center gap-4 opacity-0"
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}
