/**
 * Vérif banned_ips par IP via PostgREST (compatible Edge / middleware).
 */
export async function fetchIsIpBannedEdge(ip: string): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base || !key || !ip || ip === "unknown") return false;

  const safe = encodeURIComponent(ip);
  const r = await fetch(
    `${base}/rest/v1/banned_ips?ip=eq.${safe}&select=id&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!r.ok) return false;
  const rows = (await r.json()) as unknown[];
  return Array.isArray(rows) && rows.length > 0;
}
