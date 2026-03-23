"use client"

import Link from "next/link"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  HERO_SUBTITLE_START_EVENT,
  isHeroSubtitlePhaseComplete,
} from "@/lib/home-events"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Community", href: "#community" },
  { label: "Docs", href: "/dashboard" },
] as const

const SCROLL_THRESHOLD_PX = 8

type LandingNavProps = {
  brandName?: string
  brandClassName?: string
  className?: string
}

export function LandingNav({
  brandName = "Hack on COD",
  brandClassName,
  className,
}: LandingNavProps) {
  const headerRef = useRef<HTMLElement>(null)
  const introCtxRef = useRef<gsap.Context | null>(null)
  const introDoneRef = useRef(false)
  const [scrolled, setScrolled] = useState(false)

  /* Hidden until title animation ends — same moment as subtitle. */
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    gsap.set(el, { opacity: 0, pointerEvents: "none" })
  }, [])

  useEffect(() => {
    const runIntro = () => {
      if (introDoneRef.current) return
      const el = headerRef.current
      if (!el) return
      introDoneRef.current = true

      introCtxRef.current?.revert()
      introCtxRef.current = gsap.context(() => {
        gsap.to(el, {
          opacity: 1,
          pointerEvents: "auto",
          duration: 0.55,
          ease: "power2.out",
        })
        const inner = el.querySelector<HTMLElement>("[data-nav-inner]")
        if (inner?.children.length) {
          gsap.fromTo(
            inner.children,
            { opacity: 0, y: -18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              stagger: 0.07,
              ease: "power3.out",
            }
          )
        }
      }, el)
    }

    const onSubtitlePhase = () => runIntro()
    window.addEventListener(HERO_SUBTITLE_START_EVENT, onSubtitlePhase)
    if (isHeroSubtitlePhaseComplete()) {
      requestAnimationFrame(runIntro)
    }

    return () => {
      window.removeEventListener(HERO_SUBTITLE_START_EVENT, onSubtitlePhase)
      introCtxRef.current?.revert()
      introCtxRef.current = null
      introDoneRef.current = false
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300",
        scrolled
          ? "border-b border-white/10 bg-black/20 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
        className
      )}
    >
      <div
        data-nav-inner
        className="mx-auto flex w-full max-w-[1800px] items-center gap-6 px-6 py-4 sm:px-10 lg:px-14 xl:px-16"
      >
        <Link
          href="/"
          className={cn(
            "shrink-0 text-lg font-semibold tracking-tight text-white sm:text-xl",
            brandClassName
          )}
        >
          {brandName}
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center gap-8 md:flex lg:gap-12 xl:gap-14"
          aria-label="Main"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm font-medium text-white/75 transition-colors hover:text-white lg:text-[15px]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 md:ml-0">
          <Button
            asChild
            size="lg"
            className="h-10 rounded-full border-white bg-transparent px-5 text-sm font-semibold text-white hover:border-accent sm:h-11 sm:px-7"
          >
            <Link href="/dashboard">Log in</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="h-10 rounded-full border-0 bg-white px-5 text-sm font-semibold text-black shadow-sm hover:bg-white/90 sm:h-11 sm:px-7"
          >
            <Link href="/dashboard">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
