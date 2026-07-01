"use client"

import { startTransition, useEffect, useRef, useState } from "react"

/**
 * Marges modérées : un `rootMargin` trop large (ex. 300px+/400px+) fait entrer **plusieurs**
 * sections lourdes (WebGL, GSAP, R3F) dans la zone d’intersection **en même temps** → pics CPU/GPU
 * et scroll saccadé. On ne précharge que lorsque la section est **proche** du viewport.
 */
export const DEFER_ROOT_MARGIN_DEFAULT = "72px 0px 96px 0px"

/**
 * Sections très lourdes (WebGL plein cadre, R3F) : monter un peu plus tard pour éviter le chevauchement
 * avec d’autres blocs qui deviennent visibles dans la même fenêtre de scroll.
 */
export const DEFER_ROOT_MARGIN_HEAVY = "32px 0px 56px 0px"

/**
 * Passe `shouldLoad` à true quand la section entre dans la zone (viewport ± rootMargin).
 * À utiliser avec `ref` sur le `<section>` racine — pas de wrapper div supplémentaire.
 *
 * Le passage à `shouldLoad` utilise `startTransition` pour ne pas bloquer les interactions / le scroll
 * sur le thread principal.
 */
export function useDeferSectionMount(rootMargin: string = DEFER_ROOT_MARGIN_DEFAULT) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (shouldLoad) return
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        startTransition(() => {
          setShouldLoad(true)
        })
      },
      { root: null, rootMargin, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shouldLoad, rootMargin])

  return { sectionRef, shouldLoad }
}
