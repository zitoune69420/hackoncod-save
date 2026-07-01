/**
 * Logique partagée : résoudre un cheat par nom + un objet bucket mods, puis mettre à jour `link`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllCheats, updateCheat } from "../lib/supabase/queries";
import { listAllModsObjectPaths, pathMatchesModsScope } from "../lib/mods-orphan-files";
import { MODS_STORAGE_BUCKET } from "../lib/mods-storage";
import type { CheatWithGame } from "../lib/supabase/types";

export type LinkScope = "server" | "shop";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function gameTitle(g: CheatWithGame["game"]): string {
  if (g == null) return "—";
  if (Array.isArray(g)) return g[0]?.title ?? "—";
  return (g as { title?: string }).title ?? "—";
}

function rankCheatMatch(nameNorm: string, queryNorm: string): number {
  if (nameNorm === queryNorm) return 100;
  if (nameNorm.includes(queryNorm)) return 80;
  const words = queryNorm.split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  const hit = words.filter((w) => nameNorm.includes(w)).length;
  return Math.round((hit / words.length) * 60);
}

export function findSingleCheatByName(
  cheats: CheatWithGame[],
  cheatQuery: string,
): { ok: true; cheat: CheatWithGame } | { ok: false; error: string } {
  const cq = norm(cheatQuery);
  if (!cq) return { ok: false, error: "Nom cheat vide" };

  const scored = cheats
    .map((c) => ({
      c,
      score: rankCheatMatch(norm(c.name), cq),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return norm(a.c.name).length - norm(b.c.name).length;
    });

  if (scored.length === 0) {
    return { ok: false, error: `Aucun cheat trouvé pour: ${cheatQuery}` };
  }

  const best = scored[0]!;
  const tied = scored.filter((s) => s.score === best.score);
  if (tied.length > 1) {
    const lines = tied
      .map(
        (t) =>
          ` - ${t.c.id}  ${JSON.stringify(t.c.name)}  (${gameTitle(t.c.game)})`,
      )
      .join("\n");
    return {
      ok: false,
      error: `Plusieurs cheats ex aequo pour "${cheatQuery}":\n${lines}`,
    };
  }

  return { ok: true, cheat: best.c };
}

export function findSingleModsPath(
  paths: string[],
  fileQuery: string,
  scope: LinkScope,
): { ok: true; path: string } | { ok: false; error: string } {
  const fn = norm(fileQuery);
  const fileLower = fileQuery.trim().toLowerCase();
  const candidates = paths.filter((p) => {
    if (!pathMatchesModsScope(p, scope)) return false;
    const base = p.split("/").pop() ?? p;
    const bl = base.toLowerCase();
    return (
      bl === fileLower ||
      bl.includes(fileLower) ||
      fileLower.includes(bl) ||
      norm(base).includes(fn) ||
      fn.includes(norm(base))
    );
  });

  if (candidates.length === 0) {
    return {
      ok: false,
      error: `Aucun fichier bucket pour: ${fileQuery} (scope ${scope})`,
    };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      error: `Plusieurs fichiers pour "${fileQuery}":\n${candidates.map((p) => ` - ${p}`).join("\n")}`,
    };
  }

  return { ok: true, path: candidates[0]! };
}

export async function linkCheatToModsFile(options: {
  allCheats: CheatWithGame[];
  paths: string[];
  cheatNameQuery: string;
  fileNameQuery: string;
  scope?: LinkScope;
}): Promise<
  | { ok: true; cheat: CheatWithGame; path: string }
  | { ok: false; error: string }
> {
  const scope = options.scope ?? "server";
  const cheatR = findSingleCheatByName(
    options.allCheats,
    options.cheatNameQuery,
  );
  if (!cheatR.ok) return cheatR;

  const pathR = findSingleModsPath(
    options.paths,
    options.fileNameQuery,
    scope,
  );
  if (!pathR.ok) return pathR;

  await updateCheat(cheatR.cheat.id, { link: pathR.path });
  return { ok: true, cheat: cheatR.cheat, path: pathR.path };
}

export async function loadModsPaths(
  supabase: SupabaseClient,
): Promise<string[]> {
  return listAllModsObjectPaths(supabase, MODS_STORAGE_BUCKET);
}

export { norm, gameTitle };
