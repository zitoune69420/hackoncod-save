"use client"

import { useEffect, useRef, useState } from "react"

/** Même ordre de grandeur que l’ancien préchargement viewport (LazySection). */
const DEFAULT_ROOT_MARGIN = "320px 0px 400px 0px"

/**
 * Passe `shouldLoad` à true quand la section entre dans la zone (viewport ± rootMargin).
 * À utiliser avec `ref` sur le `<section>` racine — pas de wrapper div supplémentaire.
 */
export function useDeferSectionMount(rootMargin: string = DEFAULT_ROOT_MARGIN) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (shouldLoad) return
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoad(true)
      },
      { root: null, rootMargin, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shouldLoad, rootMargin])

  return { sectionRef, shouldLoad }
}
