import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  getSecurityStrictApiAuthRatePerMinute,
  getSecurityStrictApiRatePerMinute,
  getSecurityStrictPageRatePerMinute,
  getUpstashRedisRestToken,
  getUpstashRedisRestUrl,
} from "@/lib/env-edge";

/** Fenêtre fenêtrée (ms) sans Upstash ; clef unique par fenêtre évite explosion mémoire. */
const MEM_WINDOW_MS = 60_000;
const MEM_MAX_KEYS = 40_000;

type MemBucket = { windowStart: number; count: number };
const memStore = new Map<string, MemBucket>();

function memPrune(now: number) {
  if (memStore.size <= MEM_MAX_KEYS) return;
  for (const [k, b] of memStore) {
    if (now - b.windowStart > MEM_WINDOW_MS * 2) memStore.delete(k);
    if (memStore.size <= MEM_MAX_KEYS * 0.7) break;
  }
}

async function memLimit(key: string, limit: number): Promise<{ ok: boolean }> {
  const now = Date.now();
  memPrune(now);
  const b = memStore.get(key);
  if (!b || now - b.windowStart >= MEM_WINDOW_MS) {
    memStore.set(key, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (b.count >= limit) return { ok: false };
  b.count += 1;
  return { ok: true };
}

let pageLm: Ratelimit | null = null;
let apiLm: Ratelimit | null = null;
let apiAuthLm: Ratelimit | null = null;

function upstashLimiters() {
  const url = getUpstashRedisRestUrl();
  const token = getUpstashRedisRestToken();
  if (!url || !token) return null;
  if (pageLm && apiLm && apiAuthLm) return { pageLm, apiLm, apiAuthLm };
  const redis = new Redis({ url, token });
  const pagePerMin = getSecurityStrictPageRatePerMinute();
  const apiPerMin = getSecurityStrictApiRatePerMinute();
  const apiAuthPerMin = getSecurityStrictApiAuthRatePerMinute();
  pageLm = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(pagePerMin, "1 m"),
    prefix: "rl:page",
    analytics: false,
  });
  apiLm = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(apiPerMin, "1 m"),
    prefix: "rl:api",
    analytics: false,
  });
  apiAuthLm = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(apiAuthPerMin, "1 m"),
    prefix: "rl:api-auth",
    analytics: false,
  });
  return { pageLm, apiLm, apiAuthLm };
}

export type EdgeRateKind = "page" | "api" | "api-auth";

export async function edgeRateLimitAllow(
  identifier: string,
  kind: EdgeRateKind,
): Promise<{ ok: boolean }> {
  const safeId = identifier.trim().slice(0, 64) || "unknown";
  const key = `${kind}:${safeId}`;
  const up = upstashLimiters();
  if (up) {
    const lm =
      kind === "page" ? up.pageLm : kind === "api" ? up.apiLm : up.apiAuthLm;
    const { success } = await lm.limit(key);
    return { ok: success };
  }
  const lim =
    kind === "page"
      ? getSecurityStrictPageRatePerMinute()
      : kind === "api"
        ? getSecurityStrictApiRatePerMinute()
        : getSecurityStrictApiAuthRatePerMinute();
  return memLimit(key, lim);
}
