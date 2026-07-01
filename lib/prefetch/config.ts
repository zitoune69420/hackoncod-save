/**
 * Configuration du préchargement automatique des pages.
 *
 * Le composant `PagePrefetcher` (app/components/page-prefetcher.tsx) scanne
 * les liens internes visibles sur la page courante et précharge les routes
 * correspondantes via `router.prefetch()`.
 */

/**
 * Routes exclues du préchargement (match par préfixe de pathname).
 * Ajouter ici toute route coûteuse, sensible ou inutile à précharger.
 */
export const PREFETCH_EXCLUDED_ROUTES: readonly string[] = [
  "/api",
  "/banned",
  "/",
];

/** Vrai si le pathname est exclu du préchargement. */
export function isPrefetchExcluded(pathname: string): boolean {
  return PREFETCH_EXCLUDED_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Préchargeurs de données par href normalisé (pathname + query).
 * Imports dynamiques pour ne pas alourdir le bundle du layout.
 * Chaque préchargeur doit être idempotent (cache interne).
 */
export const DATA_PREFETCHERS: Record<string, () => void | Promise<void>> = {
  "/dashboard?page=reviews": async () => {
    const { prefetchReviews } =
      await import("@/app/components/pages/client/reviews/reviews");
    prefetchReviews();
  },
};

/** Durée (ms) avant qu'une route déjà préchargée puisse l'être à nouveau. */
export const PREFETCH_TTL_MS = 5 * 60 * 1000;

/** Nombre max de routes préchargées par scan (garde-fou). */
export const PREFETCH_MAX_PER_SCAN = 20;
