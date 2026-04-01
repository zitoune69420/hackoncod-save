/**
 * Rapprochement fichiers du bucket `mods` ↔ lignes `cheat` (fichiers sans lien DB).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCheatFileLink } from "@/lib/cheat-file-link";
import { MODS_STORAGE_BUCKET } from "@/lib/mods-storage";

export type AdminModsScope = "server" | "shop";

export function cheatRowLinkToObjectPath(link: string): string | null {
  const trimmed = link.trim();
  if (!trimmed) return null;
  const parsed = parseCheatFileLink(trimmed);
  if (!parsed || parsed.kind !== "storage") return null;
  let p = parsed.objectPath.trim().replace(/^\/+/, "");
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep */
  }
  return p || null;
}

/** Fichiers boutique vs serveur (racine / legacy, hors préfixes `shop-*` sauf shop-cheats). */
export function pathMatchesModsScope(
  path: string,
  scope: AdminModsScope,
): boolean {
  if (scope === "shop") return path.startsWith("shop-cheats/");
  if (path.startsWith("shop-")) return false;
  return true;
}

/**
 * Liste récursive de tous les chemins objets (fichiers) dans le bucket.
 */
export async function listAllModsObjectPaths(
  supabase: SupabaseClient,
  bucket: string = MODS_STORAGE_BUCKET,
): Promise<string[]> {
  const files: string[] = [];
  const dirs: string[] = [""];

  while (dirs.length > 0) {
    const prefix = dirs.shift()!;
    let offset = 0;
    const limit = 1000;
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(error.message);
      const batch = data ?? [];
      if (batch.length === 0) break;
      for (const item of batch) {
        const rel = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id == null) {
          dirs.push(rel);
        } else {
          files.push(rel);
        }
      }
      if (batch.length < limit) break;
      offset += limit;
    }
  }
  return files;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripUuidPrefixFromBaseName(base: string): string {
  return base.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i,
    "",
  );
}

/** Score 0–100 : nom de cheat vs segment de fichier (sans dossier, sans préfixe uuid upload). */
export function scorePathAgainstCheatName(
  objectPath: string,
  cheatName: string,
): number {
  const base = objectPath.split("/").pop() ?? objectPath;
  const stem = stripUuidPrefixFromBaseName(base).replace(/\.[^.]+$/i, "");
  const fn = normalizeForMatch(stem);
  const cn = normalizeForMatch(cheatName);
  if (!fn || !cn) return 0;
  if (fn === cn) return 100;
  if (fn.includes(cn) || cn.includes(fn)) return 95;
  const words = cn.split(" ").filter((w) => w.length >= 2);
  if (words.length === 0) return 0;
  let hit = 0;
  for (const w of words) {
    if (fn.includes(w)) hit++;
  }
  return Math.min(90, Math.round((hit / words.length) * 90));
}

export type CheatMatchRow = {
  id: string;
  name: string;
  game: string;
  link: string;
};

export type OrphanSuggestion = {
  cheatId: string;
  name: string;
  game: string;
  score: number;
  missingLink: boolean;
};

export type OrphanFileRow = {
  path: string;
  suggestions: OrphanSuggestion[];
};

export function collectLinkedObjectPathsFromCheats(
  cheats: CheatMatchRow[],
): Set<string> {
  const set = new Set<string>();
  for (const c of cheats) {
    const p = cheatRowLinkToObjectPath(c.link);
    if (p) set.add(p);
  }
  return set;
}

export function buildOrphanRows(
  allPaths: string[],
  linkedPaths: Set<string>,
  cheats: CheatMatchRow[],
  scope: AdminModsScope,
): OrphanFileRow[] {
  const scoped = allPaths.filter((p) => pathMatchesModsScope(p, scope));
  const orphans = scoped.filter((p) => !linkedPaths.has(p));

  const rows: OrphanFileRow[] = [];
  for (const path of orphans) {
    const suggestions = cheats
      .map((c) => ({
        cheatId: c.id,
        name: c.name,
        game: c.game,
        score: scorePathAgainstCheatName(path, c.name),
        missingLink: !c.link?.trim(),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.missingLink !== b.missingLink) return a.missingLink ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
    rows.push({ path, suggestions });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
