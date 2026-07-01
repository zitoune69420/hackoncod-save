/** Émis quand l’animation du titre est terminée : sous-titre (et intro navbar) en même temps. */
export const HERO_SUBTITLE_START_EVENT = "hackoncod:hero-subtitle-start" as const

/** Attribut sur `<html>` pour resynchroniser la navbar si l’événement est déjà passé. */
export const HERO_SUBTITLE_DATA_ATTR = "data-hero-subtitle"

export function setHeroSubtitlePhaseComplete() {
  document.documentElement.setAttribute(HERO_SUBTITLE_DATA_ATTR, "1")
}

export function clearHeroSubtitlePhase() {
  document.documentElement.removeAttribute(HERO_SUBTITLE_DATA_ATTR)
}

export function isHeroSubtitlePhaseComplete() {
  return document.documentElement.getAttribute(HERO_SUBTITLE_DATA_ATTR) === "1"
}
