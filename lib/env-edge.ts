/**
 * Variables lues depuis l’Edge (middleware). Ne doit pas importer `server-only`.
 * Réutilise uniquement pour le middleware où `lib/env.ts` est inapproprié (Edge bundle).
 */

export function getUpstashRedisRestUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL?.trim() || undefined;
}

export function getUpstashRedisRestToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || undefined;
}

/**
 * proxycheck.io — si défini : les IP signalées comme proxy/VPN sont refusées (Edge).
 */
export function getSecurityProxycheckApiKey(): string | undefined {
  return process.env.SECURITY_PROXYCHECK_API_KEY?.trim() || undefined;
}

export function getSecurityStrictPageRatePerMinute(): number {
  const n = Number(process.env.SECURITY_PAGE_RL_PER_MIN?.trim());
  if (Number.isFinite(n) && n >= 5 && n <= 500) return Math.floor(n);
  return 25;
}

export function getSecurityStrictApiRatePerMinute(): number {
  const n = Number(process.env.SECURITY_API_RL_PER_MIN?.trim());
  if (Number.isFinite(n) && n >= 3 && n <= 300) return Math.floor(n);
  return 12;
}
