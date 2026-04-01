/** Bucket Supabase des binaires / fichiers liés aux cheats (même nom que les dossiers existants). */
export const MODS_STORAGE_BUCKET = "mods" as const;

/** Dossiers racine déjà présents dans le bucket (upload admin). */
export const MODS_STORAGE_FOLDERS = [
  "cheats",
  "shop-cheats",
  "shop-accounts",
  "shop-services",
  "shop-reviews",
] as const;

export type ModsStorageFolder = (typeof MODS_STORAGE_FOLDERS)[number];

export function normalizeModsFolder(raw: string | null | undefined): ModsStorageFolder {
  const v = raw?.trim();
  if (v && (MODS_STORAGE_FOLDERS as readonly string[]).includes(v)) {
    return v as ModsStorageFolder;
  }
  return "cheats";
}

/** Chemin objet storage (pas une URL http). */
export function isModsObjectPath(value: string): boolean {
  const t = value.trim();
  if (!t || t.length > 512) return false;
  if (t.includes("..") || t.startsWith("/") || /\\/u.test(t)) return false;
  if (/^https?:\/\//iu.test(t)) return false;
  return true;
}
