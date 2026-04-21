import "server-only";

type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as {
  __hackoncodPubDlTokenBuckets?: Map<string, Bucket>;
  __hackoncodPubDlApiBuckets?: Map<string, Bucket>;
  __hackoncodPubDlCheatBuckets?: Map<string, Bucket>;
};

function tokenMap(): Map<string, Bucket> {
  if (!g.__hackoncodPubDlTokenBuckets) {
    g.__hackoncodPubDlTokenBuckets = new Map();
  }
  return g.__hackoncodPubDlTokenBuckets;
}

function apiMap(): Map<string, Bucket> {
  if (!g.__hackoncodPubDlApiBuckets) {
    g.__hackoncodPubDlApiBuckets = new Map();
  }
  return g.__hackoncodPubDlApiBuckets;
}

function cheatMap(): Map<string, Bucket> {
  if (!g.__hackoncodPubDlCheatBuckets) {
    g.__hackoncodPubDlCheatBuckets = new Map();
  }
  return g.__hackoncodPubDlCheatBuckets;
}

/** Fenêtre courte : rafales (scraping rapide). */
const BURST_WINDOW_MS = 60_000;

/** Limite émission de jetons HMAC (Server Action), par IP. */
const TOKEN_ISSUES_PER_BURST = 14;

/** Résolutions d’URL signée (GET API), par IP. */
const DOWNLOAD_API_PER_BURST = 22;

/** Même fichier (cheat) pour une IP : limite renouvellements d’URL / minute. */
const CHEAT_REPEAT_WINDOW_MS = 60_000;
const DOWNLOADS_SAME_CHEAT_PER_IP = 12;

const UNKNOWN_IP_TOKEN_CAP = 4;
const UNKNOWN_IP_API_CAP = 6;

function pruneExpired(map: Map<string, Bucket>, now: number): void {
  if (map.size < 5000) return;
  for (const [k, b] of map) {
    if (now > b.resetAt) map.delete(k);
  }
}

function takeSlot(
  map: Map<string, Bucket>,
  key: string,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  pruneExpired(map, now);
  const b = map.get(key);
  if (!b || now > b.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= maxPerWindow) {
    return false;
  }
  b.count += 1;
  return true;
}

function normalizeIpKey(ip: string): string {
  const t = ip.trim();
  if (!t || t === "unknown") return "__unknown__";
  return t;
}

/**
 * Limite l’émission de jetons (anti-scraping des UUID + signatures).
 * Effet par instance Node (Fluid Compute réutilise souvent la même instance).
 */
export function allowPublicDownloadTokenIssue(ip: string): boolean {
  const key = normalizeIpKey(ip);
  const cap = key === "__unknown__" ? UNKNOWN_IP_TOKEN_CAP : TOKEN_ISSUES_PER_BURST;
  return takeSlot(tokenMap(), key, cap, BURST_WINDOW_MS);
}

/** Limite les appels GET qui déclenchent createSignedUrl / travail serveur. */
export function allowPublicDownloadApiGet(ip: string): boolean {
  const key = normalizeIpKey(ip);
  const cap = key === "__unknown__" ? UNKNOWN_IP_API_CAP : DOWNLOAD_API_PER_BURST;
  return takeSlot(apiMap(), key, cap, BURST_WINDOW_MS);
}

/** Évite de marteler le même cheat (coût stockage / bande passante sortante). */
export function allowPublicDownloadForCheat(ip: string, cheatId: string): boolean {
  const ikey = normalizeIpKey(ip);
  const id = cheatId.trim();
  if (!id) return false;
  const key = `${ikey}:${id}`;
  return takeSlot(cheatMap(), key, DOWNLOADS_SAME_CHEAT_PER_IP, CHEAT_REPEAT_WINDOW_MS);
}
