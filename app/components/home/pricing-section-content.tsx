"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/** Label column vs tier columns grid ratios. FR_TIER < 1 = narrower tier columns */
const FR_LABEL = 0.82
const FR_TIER = 0.68
const FR_TOTAL = FR_LABEL + 3 * FR_TIER

function basicColumnOverlayStyle(): CSSProperties {
  return {
    left: `calc(100% * ${(FR_LABEL + FR_TIER) / FR_TOTAL})`,
    width: `calc(100% * ${FR_TIER / FR_TOTAL})`,
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 shrink-0 text-zinc-100", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CheckWithText({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <CheckIcon />
      <span className="tabular-nums text-zinc-200">{text}</span>
    </span>
  )
}

function CheckOnly() {
  return (
    <span className="inline-flex items-center justify-start">
      <CheckIcon />
    </span>
  )
}

function EmptyCell() {
  return <span className="text-zinc-600">—</span>
}

const TIERS = [
  {
    id: "free",
    name: "Free",
    cta: "Get started",
    href: "/dashboard",
    featured: false,
  },
  {
    id: "vip",
    name: "V.I.P",
    cta: "Get started",
    href: "/dashboard",
    featured: true,
  },
  {
    id: "premium",
    name: "Premium",
    cta: "Get a demo",
    href: "#contact",
    featured: false,
  },
] as const

export type PricingSectionContentProps = {
  titleFontClassName?: string
}

export function PricingSectionContent({ titleFontClassName }: PricingSectionContentProps) {
  return (
    <div className="mx-auto w-full max-w-[min(1720px,98vw)] px-4 sm:px-6 lg:px-10">
      <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Pricing</p>
        <h2
          id="pricing-heading"
          className={cn(
            titleFontClassName,
            "mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
          )}
        >
          Plans that scale with you
        </h2>
        <p className="mt-4 text-base text-zinc-400 sm:text-lg">
          Compare usage, features, and support across Free, V.I.P, and Premium.
        </p>
      </div>

      <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="inline-block min-w-[800px] w-full rounded-2xl p-2 sm:min-w-0 sm:p-3"
          role="region"
          aria-label="Pricing comparison"
        >
          <div className="relative isolate">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-0 rounded-xl bg-zinc-800/45 ring-1 ring-inset ring-white/[0.07]"
              style={basicColumnOverlayStyle()}
            />

            <div
              className="relative z-10 grid w-full"
              style={{
                gridTemplateColumns: `minmax(128px,${FR_LABEL}fr) repeat(3, minmax(0,${FR_TIER}fr))`,
              }}
            >
              <div className="p-3 pr-1 sm:p-4 sm:pr-2" />
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className="flex flex-col items-center justify-end gap-2 p-3 text-center sm:p-4"
                >
                  <span className="text-base font-semibold tracking-tight text-white sm:text-lg">{tier.name}</span>
                </div>
              ))}

              <div className="p-3 pr-1 sm:p-4 sm:pr-2" />
              {TIERS.map((tier) => (
                <div key={`cta-${tier.id}`} className="flex items-center justify-center px-2 pb-5 pt-0 sm:px-3">
                  <Link
                    href={tier.href}
                    className={cn(
                      "relative z-10 inline-flex w-full max-w-50 items-center justify-center rounded-full border px-4 py-2.5 text-xs font-semibold transition sm:text-sm",
                      tier.featured
                        ? "border-transparent bg-white text-zinc-950 hover:bg-zinc-200"
                        : "border-white/20 bg-transparent text-white hover:bg-white/10",
                    )}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}

              <CategoryLabel first>Content</CategoryLabel>

              <FeatureLabel>Cheats</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>

              <FeatureLabel>Games</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>

              <FeatureLabel>Tools</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>

              <CategoryLabel>Exclusive</CategoryLabel>

              <FeatureLabel>Premium Cheats</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <EmptyCell />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>

              <FeatureLabel>Premium Games</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <EmptyCell />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <EmptyCell />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  Soon
                </div>
              </TierCell>

              <FeatureLabel>Premium Tools</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <EmptyCell />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <EmptyCell />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  Soon
                </div>
              </TierCell>

              <CategoryLabel>Support</CategoryLabel>

              <FeatureLabel>Priority support</FeatureLabel>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
              <TierCell>
                <div className="pl-3">
                  <CheckOnly />
                </div>
              </TierCell>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <>
      <div
        className={cn(
          "col-span-1 pl-2 pr-1 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:pl-3 sm:pr-2 sm:text-xs",
          first ? "pb-2 pt-6 sm:pt-8" : "pb-2 pt-10 sm:pt-12",
        )}
      >
        {children}
      </div>
      <div className="col-span-1" aria-hidden />
      <div className="col-span-1" aria-hidden />
      <div className="col-span-1" aria-hidden />
    </>
  )
}

function FeatureLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-start py-3.5 pl-2 pr-1 sm:py-4 sm:pl-3 sm:pr-2">
      <span className="w-full text-left text-sm font-normal leading-snug text-zinc-300 sm:text-[15px]">{children}</span>
    </div>
  )
}

function TierCell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex items-center justify-start border-t border-white/8 py-3.5 pl-2 pr-3 sm:py-4 sm:pl-3 sm:pr-4">
      {children}
    </div>
  )
}
