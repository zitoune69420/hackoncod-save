import { MODS_STORAGE_BUCKET } from "@/lib/mods-storage";

export type ParsedCheatLink =
  | { kind: "http"; url: string }
  | { kind: "storage"; bucket: string; objectPath: string };

const SUPABASE_OBJECT_RE =
  /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/iu;

function stripDanger(s: string): boolean {
  return s.includes("..") || /\\/u.test(s) || s.includes("\0");
}

/**
 * Interprète `cheat.link` : URL absolue, URL Supabase storage, ou chemin type ancien site `/uploads/…` / clé plate.
 */
export function parseCheatFileLink(raw: string): ParsedCheatLink | null {
  const t = raw.trim();
  if (!t) return null;

  if (/^https?:\/\//iu.test(t)) {
    const sup = SUPABASE_OBJECT_RE.exec(t);
    if (sup) {
      const bucket = sup[1]!.trim();
      let objectPath = sup[2]!.trim();
      try {
        objectPath = decodeURIComponent(objectPath);
      } catch {
        /* keep */
      }
      if (!bucket || !objectPath || stripDanger(objectPath)) return null;
      return { kind: "storage", bucket, objectPath };
    }
    return { kind: "http", url: t };
  }

  let path = t.replace(/^\/+/, "");

  if (path.toLowerCase().startsWith("uploads/")) {
    path = path.slice("uploads/".length);
  }

  if (!path || stripDanger(path) || path.length > 512) return null;

  return {
    kind: "storage",
    bucket: MODS_STORAGE_BUCKET,
    objectPath: path,
  };
}

/** Buckets à essayer pour un lien storage sans bucket explicite (hors URL Supabase). */
export function storageBucketsToTry(parsed: ParsedCheatLink): string[] {
  if (parsed.kind !== "storage") return [];
  const legacy = process.env.SUPABASE_LEGACY_FILES_BUCKET?.trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of [parsed.bucket, legacy, MODS_STORAGE_BUCKET].filter(Boolean)) {
    if (b && !seen.has(b)) {
      seen.add(b);
      out.push(b);
    }
  }
  return out.length ? out : [MODS_STORAGE_BUCKET];
}
