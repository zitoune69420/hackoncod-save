"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DATA_PREFETCHERS,
  isPrefetchExcluded,
  PREFETCH_MAX_PER_SCAN,
  PREFETCH_TTL_MS,
} from "@/lib/prefetch/config";

/**
 * Précharge les pages accessibles depuis la page courante.
 *
 * Scanne les liens internes (`<a href>`) présents dans le DOM, puis appelle
 * `router.prefetch()` sur chaque route éligible. Garde-fous :
 * - routes exclues via `PREFETCH_EXCLUDED_ROUTES` ;
 * - jamais la page courante ni la page précédente (évite les boucles
 *   aller-retour) ;
 * - dédoublonnage avec TTL (`PREFETCH_TTL_MS`) pour ne pas re-précharger
 *   en boucle à chaque mutation du DOM ;
 * - plafond par scan (`PREFETCH_MAX_PER_SCAN`) ;
 * - désactivé si l'utilisateur est en mode économie de données ou sur
 *   connexion lente.
 *
 * Précharge aussi les données associées à une route si un préchargeur est
 * déclaré dans `DATA_PREFETCHERS`.
 */
function PagePrefetcherInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentKeyRef = useRef<string | null>(null);
  const previousKeyRef = useRef<string | null>(null);
  const prefetchedAtRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const search = searchParams.toString();
    const currentKey = search ? `${pathname}?${search}` : pathname;
    if (currentKeyRef.current !== currentKey) {
      previousKeyRef.current = currentKeyRef.current;
      currentKeyRef.current = currentKey;
    }

    if (isSlowConnection()) return;

    const prefetchedAt = prefetchedAtRef.current;

    const scan = () => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>("a[href]");
      const seen = new Set<string>();
      let count = 0;

      for (const anchor of anchors) {
        if (count >= PREFETCH_MAX_PER_SCAN) break;

        const key = normalizeInternalHref(anchor.href);
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const targetPathname = key.split("?")[0];
        if (isPrefetchExcluded(targetPathname)) continue;
        // Ni la page courante ni la précédente : évite les boucles A ↔ B.
        if (key === currentKeyRef.current || key === previousKeyRef.current) {
          continue;
        }

        const last = prefetchedAt.get(key);
        if (last !== undefined && Date.now() - last < PREFETCH_TTL_MS) {
          continue;
        }
        prefetchedAt.set(key, Date.now());
        count++;

        router.prefetch(key);

        const dataPrefetch =
          DATA_PREFETCHERS[key] ?? DATA_PREFETCHERS[targetPathname];
        if (dataPrefetch) {
          Promise.resolve(dataPrefetch()).catch(() => {
            // Échec silencieux : le préchargement est un bonus, la page
            // chargera ses données normalement à la navigation.
          });
        }
      }
    };

    let idleHandle: number | ReturnType<typeof setTimeout>;
    const scheduleScan = () => {
      cancelIdle(idleHandle);
      idleHandle = requestIdle(scan);
    };

    scheduleScan();

    // Les liens apparaissent souvent après coup (sections lazy, dialogs) :
    // re-scan débouncé sur mutation du DOM.
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(scheduleScan, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      clearTimeout(debounce);
      cancelIdle(idleHandle);
    };
  }, [router, pathname, searchParams]);

  return null;
}

/**
 * Normalise un href absolu en clé interne `pathname` ou `pathname?query`.
 * Retourne null si le lien n'est pas une page interne préchargeable.
 */
function normalizeInternalHref(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Fichiers statiques (téléchargements, images…) : pas des pages.
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith(".html")) {
    return null;
  }
  return url.search ? `${url.pathname}${url.search}` : url.pathname;
}

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

function isSlowConnection(): boolean {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
}

function requestIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout: 2000 });
  }
  return setTimeout(callback, 300);
}

function cancelIdle(handle: number | ReturnType<typeof setTimeout>) {
  if (typeof window.cancelIdleCallback === "function" && typeof handle === "number") {
    window.cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle as ReturnType<typeof setTimeout>);
}

/** `useSearchParams` impose une frontière Suspense. */
export function PagePrefetcher() {
  return (
    <Suspense fallback={null}>
      <PagePrefetcherInner />
    </Suspense>
  );
}
