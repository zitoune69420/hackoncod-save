import "server-only";

import { getSupabaseProjectUrl, getSupabasePublishableKey } from "@/lib/env";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

/**
 * Vérif ban via Discord snowflake (Edge / middleware) avec la clé **anon/publishable**.
 * Le RPC combine banned_ips.discord_id + retard.user_id + users.discord_user_id (site_banned).
 * Nécessite la migration `is_discord_banned`.
 */
export async function fetchIsDiscordBannedEdge(did: string): Promise<boolean> {
  const base = getSupabaseProjectUrl();
  const key = getSupabasePublishableKey();
  if (!base || !key || !did) return false;

  const safe = did.trim();
  if (!DISCORD_SNOWFLAKE_RE.test(safe)) return false;

  const r = await fetch(`${base}/rest/v1/rpc/is_discord_banned`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_did: safe }),
    cache: "no-store",
  });
  if (!r.ok) return false;
  const data: unknown = await r.json().catch(() => null);
  return data === true;
}
