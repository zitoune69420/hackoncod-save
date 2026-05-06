import { getSecurityProxycheckApiKey } from "@/lib/env-edge";

const CACHE_TTL_MS = 300_000;
const cache = new Map<string, { until: number; blocked: boolean }>();

/**
 * proxycheck.io — bloque proxy / VPN / hosting si `SECURITY_PROXYCHECK_API_KEY` est défini.
 * En cas d’erreur réseau / quota : pas de blocage (évite de couper le site).
 */
export async function isBlockedVpnOrProxyEdge(ip: string): Promise<boolean> {
  const key = getSecurityProxycheckApiKey();
  if (!key || !ip || ip === "unknown") return false;

  const safe = ip.trim().slice(0, 45);
  if (!safe) return false;

  const hit = cache.get(safe);
  const now = Date.now();
  if (hit && hit.until > now) return hit.blocked;

  try {
    const url = `https://proxycheck.io/v2/${encodeURIComponent(safe)}?key=${encodeURIComponent(key)}&vpn=1&asn=1&cur=0`;
    const r = await fetch(url, { cache: "no-store", method: "GET" });
    if (!r.ok) return false;

    const data: unknown = await r.json().catch(() => null);
    if (!data || typeof data !== "object") return false;
    const rec = data as Record<string, unknown>;
    const status =
      typeof rec.status === "string" ? rec.status.toLowerCase() : "";
    if (status !== "ok" && status !== "warn") return false;

    const ipBlock = rec[safe];
    if (!ipBlock || typeof ipBlock !== "object") return false;
    const b = ipBlock as Record<string, unknown>;
    const proxy =
      typeof b.proxy === "string" ? b.proxy.toLowerCase() === "yes" : false;
    const typeRaw = typeof b.type === "string" ? b.type.toUpperCase() : "";
    const typeBlocked =
      typeRaw.includes("VPN") ||
      typeRaw.includes("TOR") ||
      typeRaw.includes("DCH") ||
      typeRaw.includes("SES");

    const blocked = proxy || typeBlocked;
    cache.set(safe, { until: now + CACHE_TTL_MS, blocked });
    return blocked;
  } catch {
    return false;
  }
}
