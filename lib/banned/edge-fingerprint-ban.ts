import "server-only";

import { getSupabaseProjectUrl, getSupabasePublishableKey } from "@/lib/env";

const MAX_FP_LEN = 256;
const FP_ALLOWED = /^[A-Za-z0-9._:\-+/=]+$/;

/**
 * Vérif banned_fingerprints via RPC PostgREST (Edge / middleware) avec la clé **anon/publishable**.
 * Nécessite la migration `is_fingerprint_banned`.
 */
export async function fetchIsFingerprintBannedEdge(
  fp: string,
): Promise<boolean> {
  const base = getSupabaseProjectUrl();
  const key = getSupabasePublishableKey();
  if (!base || !key || !fp) return false;

  const safeFp = fp.trim().slice(0, MAX_FP_LEN);
  if (!safeFp || !FP_ALLOWED.test(safeFp)) return false;

  const r = await fetch(`${base}/rest/v1/rpc/is_fingerprint_banned`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_fp: safeFp }),
    cache: "no-store",
  });
  if (!r.ok) return false;
  const data: unknown = await r.json().catch(() => null);
  return data === true;
}
