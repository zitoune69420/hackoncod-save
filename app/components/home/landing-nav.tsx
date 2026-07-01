"use client"

import Link from "next/link"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"
import { DASHBOARD_DEFAULT_PAGE } from "@/lib/dashboard-url"
import { cn } from "@/lib/utils"
import {
  HERO_SUBTITLE_START_EVENT,
  isHeroSubtitlePhaseComplete,
} from "@/lib/home-events"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Community", href: "#community" },
  { label: "Docs", href: `/dashboard?page=${DASHBOARD_DEFAULT_PAGE}` },
] as const

const SCROLL_THRESHOLD_PX = 8

const NAV_AUTH_BTN =
  "h-10 rounded-full px-5 text-sm font-semibold sm:h-11 sm:px-7" as const

function userInitials(name: string | null | undefined, email: string | null | undefined) {
  const n = name?.trim()
  if (n) {
    const parts = n.split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "?"
}

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
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const user = session?.user

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

  const signInWithDiscord = async () => {
    try {
      setIsSigningIn(true)
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: `/dashboard?page=${DASHBOARD_DEFAULT_PAGE}`,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSigningIn(false)
    }
  }

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
          {sessionPending ? (
            <div className="flex items-center gap-2 sm:gap-3" aria-hidden>
              <div
                className={cn(NAV_AUTH_BTN, "w-24 animate-pulse bg-white/10")}
              />
              <div
                className={cn(NAV_AUTH_BTN, "w-28 animate-pulse bg-white/10")}
              />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                asChild
                variant="default"
                size="lg"
                className={cn(NAV_AUTH_BTN, "border-0 px-6")}
              >
                <Link href={`/dashboard?page=${DASHBOARD_DEFAULT_PAGE}`}>Account</Link>
              </Button>
              <Link
                href={`/dashboard?page=${DASHBOARD_DEFAULT_PAGE}`}
                className={cn(
                  "shrink-0 rounded-full ring-2 ring-white/25 ring-offset-2 ring-offset-black transition-opacity hover:opacity-90",
                  "size-10 sm:size-11",
                )}
                aria-label="Account"
              >
                <Avatar className="size-10 sm:size-11">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/90 text-xs font-semibold text-primary-foreground">
                    {userInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          ) : (
            <>
              <Button
                type="button"
                size="lg"
                disabled={isSigningIn}
                onClick={signInWithDiscord}
                className={cn(
                  NAV_AUTH_BTN,
                  "border border-white bg-transparent text-white hover:border-accent hover:bg-white/5",
                )}
              >
                {isSigningIn ? "Redirecting…" : "Log in"}
              </Button>
              <Button
                asChild
                size="lg"
                className={cn(
                  NAV_AUTH_BTN,
                  "border-0 bg-white text-black shadow-sm hover:bg-white/90",
                )}
              >
                <Link href={`/dashboard?page=${DASHBOARD_DEFAULT_PAGE}`}>Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
