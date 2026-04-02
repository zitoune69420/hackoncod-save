/**
 * Paramètre d’URL `page` du dashboard (`/dashboard?page=…`).
 * - Pages de contenu : cheats, games, videos, reviews, misc, content, default
 * - `page=settings` : ouvre la modale paramètres (le contenu sous-jacent reste la dernière page visitée)
 * - `settings=open` : alias pour ouvrir les paramètres
 */

export const DASHBOARD_DEFAULT_PAGE = "cheats" as const;

export const DASHBOARD_PAGE_IDS = [
  "default",
  "content",
  "cheats",
  "games",
  "videos",
  "reviews",
  "misc",
  "forum",
  "vip-cheats",
  "semivip-cheats",
  "partners",
  // Administration (URLs reserved; implement pages later)
  "admin-server-cheats",
  "admin-server-games",
  "admin-server-videos",
  "admin-server-reviews",
  "admin-server-blacklist",
  "admin-shop-cheats",
  "admin-shop-games",
  "admin-shop-services",
  "admin-shop-accounts",
  "admin-shop-reviews",
  "admin-stats-users",
  "admin-stats-performance",
  "admin-stats-security",
] as const;

export type DashboardPageId = (typeof DASHBOARD_PAGE_IDS)[number];

/** Pages « Exclusif » (menu latéral). */
export const EXCLUSIVE_DASHBOARD_PAGE_IDS = [
  "vip-cheats",
  "semivip-cheats",
  "partners",
] as const satisfies readonly DashboardPageId[];

export type ExclusiveDashboardPageId =
  (typeof EXCLUSIVE_DASHBOARD_PAGE_IDS)[number];

export function isExclusiveDashboardPageId(
  pageId: string,
): pageId is ExclusiveDashboardPageId {
  return (EXCLUSIVE_DASHBOARD_PAGE_IDS as readonly string[]).includes(pageId);
}

/**
 * Pages dont la navigation affiche un spinner dans la sidebar (sous-menu concerné).
 * Uniquement les stats admin (contenu RSC lourd) — pas la section Exclusif.
 */
export function dashboardPageUsesSidebarNavPending(pageId: string): boolean {
  return pageId.startsWith("admin-stats-");
}

export function isValidDashboardPageId(
  value: string | null,
): value is DashboardPageId {
  return (
    value != null && (DASHBOARD_PAGE_IDS as readonly string[]).includes(value)
  );
}

/** La modale paramètres doit-elle être ouverte selon l’URL ? */
export function isDashboardSettingsOpen(
  searchParams: URLSearchParams,
): boolean {
  return (
    searchParams.get("page") === "settings" ||
    searchParams.get("settings") === "open"
  );
}

function firstSearchValue(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = raw[key];
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

/** Résout la page de contenu dashboard depuis `searchParams` RSC (objet brut). */
export function getDashboardContentPageFromRaw(
  raw: Record<string, string | string[] | undefined>,
): DashboardPageId {
  const pageParam = firstSearchValue(raw, "page");
  const fromParam = firstSearchValue(raw, "from");
  const settingsOpen =
    pageParam === "settings" || firstSearchValue(raw, "settings") === "open";
  if (settingsOpen) {
    return isValidDashboardPageId(fromParam)
      ? fromParam
      : DASHBOARD_DEFAULT_PAGE;
  }
  return isValidDashboardPageId(pageParam) ? pageParam : DASHBOARD_DEFAULT_PAGE;
}

/** Fenêtre analytics admin stats (`statsDays`), pour `?page=admin-stats-users`. */
export function getDashboardStatsDays(
  raw: Record<string, string | string[] | undefined>,
): 7 | 30 {
  const d = firstSearchValue(raw, "statsDays");
  if (d === "30") return 30;
  return 7;
}

/** `perfDays` pour `?page=admin-stats-performance` (défaut 7). */
export function getDashboardPerfDays(
  raw: Record<string, string | string[] | undefined>,
): 7 | 30 {
  const d = firstSearchValue(raw, "perfDays");
  if (d === "30") return 30;
  return 7;
}

/** `perfDevice=desktop|mobile` pour la page performance. */
export function getDashboardPerfDevice(
  raw: Record<string, string | string[] | undefined>,
): "desktop" | "mobile" {
  return firstSearchValue(raw, "perfDevice") === "mobile" ? "mobile" : "desktop";
}

/** `perfEnv=production|staging`. */
export function getDashboardPerfEnv(
  raw: Record<string, string | string[] | undefined>,
): "production" | "staging" {
  return firstSearchValue(raw, "perfEnv") === "staging"
    ? "staging"
    : "production";
}

/** `securityRange=1d|7d|30d` pour `?page=admin-stats-security`. */
export function getDashboardSecurityRange(
  raw: Record<string, string | string[] | undefined>,
): "1d" | "7d" | "30d" {
  const v = firstSearchValue(raw, "securityRange");
  if (v === "7d") return "7d";
  if (v === "30d") return "30d";
  return "1d";
}
