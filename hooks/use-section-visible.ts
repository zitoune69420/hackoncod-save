"use client"

import { startTransition, useEffect, useState, type RefObject } from "react"

export type UseSectionVisibleOptions = {
  /** Marge autour du viewport (ex. `"48px 0px"`). */
  rootMargin?: string
  threshold?: number | number[]
}

/**
 * Suit en continu si l’élément intersecte le viewport (contrairement au defer mount,
 * on ne se déconnecte pas au premier intersect).
 * À utiliser pour couper RAF / WebGL quand la section n’est pas visible.
 */
export function useSectionVisible(
  ref: RefObject<Element | null>,
  options?: UseSectionVisibleOptions,
): boolean {
  const { rootMargin = "48px 0px", threshold = 0 } = options ?? {}
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const io = new IntersectionObserver(
      ([entry]) => {
        startTransition(() => {
          setVisible(entry.isIntersecting)
        })
      },
      { root: null, rootMargin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin, threshold])

  return visible
}
