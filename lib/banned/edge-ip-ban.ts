import "server-only";

import { getSupabaseProjectUrl, getSupabasePublishableKey } from "@/lib/env";

const MAX_IP_LEN = 45;

/**
 * Vérif banned_ips via RPC PostgREST (Edge / middleware) avec la clé **anon/publishable**,
 * pas la service_role. Nécessite la migration `is_ip_banned` sur le projet Supabase.
 */
export async function fetchIsIpBannedEdge(ip: string): Promise<boolean> {
  const base = getSupabaseProjectUrl();
  const key = getSupabasePublishableKey();
  if (!base || !key || !ip || ip === "unknown") return false;

  const safeIp = ip.trim().slice(0, MAX_IP_LEN);
  if (!safeIp) return false;

  const r = await fetch(`${base}/rest/v1/rpc/is_ip_banned`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_ip: safeIp }),
    cache: "no-store",
  });
  if (!r.ok) return false;
  const data: unknown = await r.json().catch(() => null);
  return data === true;
}
