import "server-only";

import {
  getSupabaseProjectUrlEdge,
  getSupabaseServiceRoleKeyEdge,
} from "@/lib/env-edge";

/**
 * Propagation Edge des signaux ban quand le middleware détecte un user banni :
 * INSERT IF NOT EXISTS dans banned_ips + banned_fingerprints selon les signaux
 * présents dans la requête. Permet de capturer le fingerprint d'un user déjà
 * banni par IP, et inversement, pour rendre le bypass plus coûteux.
 *
 * Appel **fire-and-forget** : aucune attente sur l'écriture, aucun log si KO.
 */
export async function fetchRecordBanSignalsEdge(input: {
  ip: string | null | undefined;
  fp: string | null | undefined;
  did: string | null | undefined;
  reason: string | null | undefined;
}): Promise<void> {
  const base = getSupabaseProjectUrlEdge();
  const key = getSupabaseServiceRoleKeyEdge();
  if (!base || !key) return;

  const body: Record<string, string> = {};
  const ip = input.ip?.trim();
  if (ip && ip !== "unknown") body.p_ip = ip.slice(0, 64);
  const fp = input.fp?.trim();
  if (fp) body.p_fp = fp.slice(0, 256);
  const did = input.did?.trim();
  if (did) body.p_did = did.slice(0, 24);
  if (!body.p_ip && !body.p_fp) return;
  const reason = input.reason?.trim();
  if (reason) body.p_reason = reason.slice(0, 500);

  try {
    await fetch(`${base}/rest/v1/rpc/record_ban_signals`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    /* fire-and-forget : ne pas bloquer le pipeline ban */
  }
}
