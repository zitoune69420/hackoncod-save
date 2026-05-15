"use client";

import { useEffect } from "react";

import {
  getClientFingerprint,
  installFingerprintFetch,
} from "@/lib/client/fingerprint";

/**
 * Monte le wrapper `window.fetch` qui ajoute `X-Client-Fingerprint` sur les
 * requêtes same-origin, et déclenche le calcul initial pour amorcer le cache.
 * Doit être monté tôt (idéalement avant SiteBanSync, qui fetch /api/ban/status).
 */
export function FingerprintInstaller() {
  useEffect(() => {
    installFingerprintFetch();
    void getClientFingerprint();
  }, []);
  return null;
}
