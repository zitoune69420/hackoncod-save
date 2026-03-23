/**
 * Paramètre d’URL `page` du dashboard (`/dashboard?page=…`).
 * - Pages de contenu : cheats, games, videos, reviews, misc, content, default
 * - `page=settings` : ouvre la modale paramètres (le contenu sous-jacent reste la dernière page visitée)
 * - `settings=open` : alias pour ouvrir les paramètres
 */

export const DASHBOARD_DEFAULT_PAGE = "cheats" as const

export const DASHBOARD_PAGE_IDS = [
  "default",
  "content",
  "cheats",
  "games",
  "videos",
  "reviews",
  "misc",
] as const

export type DashboardPageId = (typeof DASHBOARD_PAGE_IDS)[number]

export function isValidDashboardPageId(value: string | null): value is DashboardPageId {
  return value != null && (DASHBOARD_PAGE_IDS as readonly string[]).includes(value)
}

/** La modale paramètres doit-elle être ouverte selon l’URL ? */
export function isDashboardSettingsOpen(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("page") === "settings" || searchParams.get("settings") === "open"
  )
}
