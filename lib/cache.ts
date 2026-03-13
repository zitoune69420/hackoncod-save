/**
 * Cache persistant (localStorage + mémoire) pour les données fetchées.
 * - Survit au reload de la page.
 * - Expiration après 3 jours.
 * - Le bouton "Actualiser" supprime l'entrée puis refetch.
 */

const PREFIX = "hackoncod_cache:"
const TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 jours
const memory = new Map<string, { value: unknown; expiresAt: number }>()

function storageKey(key: string) {
  return PREFIX + key
}

function getFromStorage<T>(key: string): { value: T; expiresAt: number } | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return undefined
    const entry = JSON.parse(raw) as { value: T; expiresAt: number }
    if (Date.now() > entry.expiresAt) {
      removeFromStorage(key)
      return undefined
    }
    return entry
  } catch {
    return undefined
  }
}

function setToStorage(key: string, data: unknown): void {
  if (typeof window === "undefined") return
  try {
    const entry = { value: data, expiresAt: Date.now() + TTL_MS }
    localStorage.setItem(storageKey(key), JSON.stringify(entry))
  } catch {
    // quota exceeded, etc.
  }
}

function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(storageKey(key))
  } catch {
    // ignore
  }
}

export function getCached<T>(key: string): T | undefined {
  const fromMem = memory.get(key)
  if (fromMem && Date.now() <= fromMem.expiresAt) return fromMem.value as T
  if (fromMem) memory.delete(key)

  const fromStorage = getFromStorage<T>(key)
  if (fromStorage !== undefined) {
    memory.set(key, fromStorage)
    return fromStorage.value
  }
  return undefined
}

export function setCached<T>(key: string, data: T): void {
  const expiresAt = Date.now() + TTL_MS
  memory.set(key, { value: data, expiresAt })
  setToStorage(key, data)
}

export function invalidateCache(key: string): void {
  memory.delete(key)
  removeFromStorage(key)
}

export function cacheKey(type: "cheats" | "games" | "videos", gameTitle?: string): string {
  if (type === "cheats" && gameTitle) return `cheats:${gameTitle}`
  if (type === "games") return "games"
  if (type === "videos") return "videos"
  throw new Error("Invalid cache key: cheats requires gameTitle")
}
