/**
 * Persistent cache (localStorage + memory) for fetched data.
 * - Survives page reload.
 * - Expires after 5 minutes (admin edits must reach users quickly).
 * - "Refresh" button deletes entry then refetches.
 */

const PREFIX = "hackoncod_cache:";
const TTL_MS = 5 * 60 * 1000;
const memory = new Map<string, { value: unknown; expiresAt: number }>();

function storageKey(key: string) {
  return PREFIX + key;
}

function getFromStorage<T>(
  key: string,
): { value: T; expiresAt: number } | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as { value: T; expiresAt: number };
    // Upper bound also drops entries written with the former 3-day TTL.
    if (Date.now() > entry.expiresAt || entry.expiresAt > Date.now() + TTL_MS) {
      removeFromStorage(key);
      return undefined;
    }
    return entry;
  } catch {
    return undefined;
  }
}

function setToStorage(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const entry = { value: data, expiresAt: Date.now() + TTL_MS };
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // quota exceeded, etc.
  }
}

function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}

function looksLikeErrorPayload(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "error" in (value as Record<string, unknown>)
  );
}

export function getCached<T>(key: string): T | undefined {
  const fromMem = memory.get(key);
  if (fromMem && Date.now() <= fromMem.expiresAt) {
    if (looksLikeErrorPayload(fromMem.value)) {
      memory.delete(key);
      removeFromStorage(key);
    } else {
      return fromMem.value as T;
    }
  }
  if (fromMem) memory.delete(key);

  const fromStorage = getFromStorage<T>(key);
  if (fromStorage !== undefined) {
    if (looksLikeErrorPayload(fromStorage.value)) {
      removeFromStorage(key);
      return undefined;
    }
    memory.set(key, fromStorage);
    return fromStorage.value;
  }
  return undefined;
}

export function setCached<T>(key: string, data: T): void {
  if (looksLikeErrorPayload(data)) return;
  const expiresAt = Date.now() + TTL_MS;
  memory.set(key, { value: data, expiresAt });
  setToStorage(key, data);
}

export function invalidateCache(key: string): void {
  memory.delete(key);
  removeFromStorage(key);
}

/** Listes cheats publiques / VIP / semi-VIP, à vider après une mutation admin. */
export function invalidateCheatListCaches(): void {
  const isCheatList = (k: string) =>
    k.startsWith("cheats:") ||
    k === cacheKey("vip-cheats") ||
    k === cacheKey("semivip-cheats");
  for (const k of [...memory.keys()]) if (isCheatList(k)) memory.delete(k);
  if (typeof window === "undefined") return;
  try {
    for (const sk of Object.keys(localStorage)) {
      if (sk.startsWith(PREFIX) && isCheatList(sk.slice(PREFIX.length))) {
        localStorage.removeItem(sk);
      }
    }
  } catch {
    // ignore
  }
}

export function cacheKey(
  type:
    | "cheats"
    | "games"
    | "videos"
    | "reviews"
    | "vip-cheats"
    | "semivip-cheats"
    | "shop-cheats"
    | "shop-services"
    | "shop-accounts"
    | "shop-reviews"
    | "tickets"
    | "admin-all-cheats"
    | "admin-all-games"
    | "admin-all-videos"
    | "admin-all-reviews"
    | "admin-all-blacklist"
    | "admin-all-banned-ips"
    | "admin-shop-cheats-list"
    | "admin-shop-services-list"
    | "admin-shop-accounts-list"
    | "admin-shop-reviews-list",
  gameTitle?: string,
): string {
  if (type === "cheats" && gameTitle) return `cheats:v5:${gameTitle}`;
  if (type === "games") return "games";
  if (type === "videos") return "videos";
  if (type === "reviews") return "reviews";
  if (type === "vip-cheats") return "vip-cheats-v3";
  if (type === "semivip-cheats") return "semivip-cheats-v3";
  if (type === "shop-cheats") return "shop-cheats-v1";
  if (type === "shop-services") return "shop-services-v1";
  if (type === "shop-accounts") return "shop-accounts-v1";
  if (type === "shop-reviews") return "shop-reviews-v2";
  if (type === "tickets") return "shop-tickets-v1";
  if (type === "admin-all-cheats") return "admin-all-cheats-v3";
  if (type === "admin-all-games") return "admin-all-games-v1";
  if (type === "admin-all-videos") return "admin-all-videos-v1";
  if (type === "admin-all-reviews") return "admin-all-reviews-v1";
  if (type === "admin-all-blacklist") return "admin-all-blacklist-v4";
  if (type === "admin-all-banned-ips") return "admin-all-banned-ips-v2";
  if (type === "admin-shop-cheats-list") return "admin-shop-cheats-list-v1";
  if (type === "admin-shop-services-list")
    return "admin-shop-services-list-v1";
  if (type === "admin-shop-accounts-list")
    return "admin-shop-accounts-list-v1";
  if (type === "admin-shop-reviews-list")
    return "admin-shop-reviews-list-v1";
  throw new Error("Invalid cache key: cheats requires gameTitle");
}

/** Liste tickets : une entrée par utilisateur connecté (ne jamais partager entre sessions). */
export function ticketsListCacheKey(userId: string): string {
  return `shop-tickets-v2:${userId}`;
}
