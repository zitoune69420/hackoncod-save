/**
 * Persistent cache (localStorage + memory) for fetched data.
 * - Survives page reload.
 * - Expires after 3 days.
 * - "Refresh" button deletes entry then refetches.
 */

const PREFIX = "hackoncod_cache:";
const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
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
    if (Date.now() > entry.expiresAt) {
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

export function getCached<T>(key: string): T | undefined {
  const fromMem = memory.get(key);
  if (fromMem && Date.now() <= fromMem.expiresAt) return fromMem.value as T;
  if (fromMem) memory.delete(key);

  const fromStorage = getFromStorage<T>(key);
  if (fromStorage !== undefined) {
    memory.set(key, fromStorage);
    return fromStorage.value;
  }
  return undefined;
}

export function setCached<T>(key: string, data: T): void {
  const expiresAt = Date.now() + TTL_MS;
  memory.set(key, { value: data, expiresAt });
  setToStorage(key, data);
}

export function invalidateCache(key: string): void {
  memory.delete(key);
  removeFromStorage(key);
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
    | "admin-all-banned-ips",
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
  throw new Error("Invalid cache key: cheats requires gameTitle");
}

/** Liste tickets : une entrée par utilisateur connecté (ne jamais partager entre sessions). */
export function ticketsListCacheKey(userId: string): string {
  return `shop-tickets-v2:${userId}`;
}
