/** Bucket Supabase des binaires / fichiers liés aux cheats (même nom que les dossiers existants). */
export const MODS_STORAGE_BUCKET = "mods" as const;

/** Sous-dossiers du bucket pour la boutique (upload admin). Les cheats serveur vont à la racine. */
export const MODS_STORAGE_FOLDERS = [
  "shop-cheats",
  "shop-accounts",
  "shop-services",
  "shop-reviews",
] as const;

export type ModsStorageFolder = (typeof MODS_STORAGE_FOLDERS)[number];

/** Préfixe d’upload : sous-dossier boutique ou `root` (fichier directement à la racine du bucket). */
export type ModsUploadPrefix = ModsStorageFolder | "root";

export function normalizeModsUploadPrefix(
  raw: string | null | undefined,
): ModsUploadPrefix {
  const v = raw?.trim();
  if (v === "root" || v === "" || v === "cheats") return "root";
  if (v && (MODS_STORAGE_FOLDERS as readonly string[]).includes(v)) {
    return v as ModsStorageFolder;
  }
  return "root";
}

/** Chemin objet storage (pas une URL http). */
export function isModsObjectPath(value: string): boolean {
  const t = value.trim();
  if (!t || t.length > 512) return false;
  if (t.includes("..") || t.startsWith("/") || /\\/u.test(t)) return false;
  if (/^https?:\/\//iu.test(t)) return false;
  return true;
}
