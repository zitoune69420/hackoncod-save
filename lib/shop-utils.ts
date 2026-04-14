const IMAGE_CACHE_KEY = "hackoncod_shop_images_cache";
const CACHE_DURATION = 50 * 60 * 1000; // 50 min

interface CachedImageUrl {
  url: string;
  timestamp: number;
}

function getCachedImageUrl(imagePath: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IMAGE_CACHE_KEY);
    if (!raw) return null;
    const cache: Record<string, CachedImageUrl> = JSON.parse(raw);
    const entry = cache[imagePath];
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) return entry.url;
    if (entry) {
      delete cache[imagePath];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedImageUrl(imagePath: string, url: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(IMAGE_CACHE_KEY);
    const cache: Record<string, CachedImageUrl> = raw ? JSON.parse(raw) : {};
    cache[imagePath] = { url, timestamp: Date.now() };
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded — silently ignore
  }
}

export async function getShopImageUrl(
  imagePath: string | null | undefined,
): Promise<string | null> {
  if (!imagePath) return null;
  const cached = getCachedImageUrl(imagePath);
  if (cached) return cached;
  try {
    const res = await fetch(
      `/api/shop/images?path=${encodeURIComponent(imagePath)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | null = data.url ?? null;
    if (url) setCachedImageUrl(imagePath, url);
    return url;
  } catch {
    return null;
  }
}

export function cleanExpiredImageCache(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(IMAGE_CACHE_KEY);
    if (!raw) return;
    const cache: Record<string, CachedImageUrl> = JSON.parse(raw);
    const now = Date.now();
    const cleaned: Record<string, CachedImageUrl> = {};
    for (const [path, entry] of Object.entries(cache)) {
      if (now - entry.timestamp < CACHE_DURATION) cleaned[path] = entry;
    }
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}
