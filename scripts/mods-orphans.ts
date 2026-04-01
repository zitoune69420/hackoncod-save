/**
 * Bucket « mods » : fichiers sans cheat.link, rapprochement par nom, liaison manuelle ou en lot.
 *
 * Prérequis : .env.local avec NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage :
 *   # Liste JSON (orphelins + suggestions)
 *   npx tsx scripts/mods-orphans.ts --scope server
 *
 *   # Un seul lien
 *   npx tsx scripts/mods-orphans.ts --attach <cheatUuid> <objectPath> --scope server
 *
 *   # Appliquer en masse la meilleure suggestion par fichier (sans re-taper chaque cheat)
 *   npx tsx scripts/mods-orphans.ts --scope server --apply --min-score 85
 *   npx tsx scripts/mods-orphans.ts --scope server --apply --only-missing-link --dry-run
 *
 * Règles --apply : un cheat ne reçoit qu’au plus un fichier par exécution ; on ignore si score
 * sous le seuil, si --only-missing-link et que le cheat a déjà un lien, ou si le cheat a déjà été
 * utilisé dans ce run.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import { getAllCheats, updateCheat } from "../lib/supabase/queries";
import {
  buildOrphanRows,
  collectLinkedObjectPathsFromCheats,
  listAllModsObjectPaths,
  pathMatchesModsScope,
  type AdminModsScope,
  type CheatMatchRow,
} from "../lib/mods-orphan-files";
import { isModsObjectPath, MODS_STORAGE_BUCKET } from "../lib/mods-storage";
import type { CheatWithGame } from "../lib/supabase/types";

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

function gameTitle(g: CheatWithGame["game"]): string {
  if (g == null) return "—";
  if (Array.isArray(g)) return g[0]?.title ?? "—";
  return (g as { title?: string }).title ?? "—";
}

type ParsedArgs = {
  scope: AdminModsScope;
  attach: { cheatId: string; path: string } | null;
  apply: boolean;
  dryRun: boolean;
  minScore: number;
  onlyMissingLink: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  let scope: AdminModsScope = "server";
  let attach: { cheatId: string; path: string } | null = null;
  let apply = false;
  let dryRun = false;
  let minScore = 85;
  let onlyMissingLink = false;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scope" && argv[i + 1]) {
      const s = argv[++i];
      if (s === "server" || s === "shop") scope = s;
    } else if (a === "--attach") {
      const cheatId = argv[++i];
      const path = argv[++i];
      if (cheatId && path) attach = { cheatId, path };
    } else if (a === "--apply") {
      apply = true;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--only-missing-link") {
      onlyMissingLink = true;
    } else if (a === "--min-score" && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 0 && n <= 100) minScore = n;
    }
  }
  return { scope, attach, apply, dryRun, minScore, onlyMissingLink };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const {
    scope,
    attach,
    apply,
    dryRun,
    minScore,
    onlyMissingLink,
  } = parseArgs(process.argv);

  if (attach) {
    if (!isModsObjectPath(attach.path)) {
      console.error("Invalid object path");
      process.exit(1);
    }
    if (!pathMatchesModsScope(attach.path, scope)) {
      console.error("Path does not match scope (server vs shop-cheats/)");
      process.exit(1);
    }
    await updateCheat(attach.cheatId, { link: attach.path });
    console.log("Updated cheat", attach.cheatId, "→", attach.path);
    return;
  }

  const supabase = createAdminClient();
  const [allPaths, cheatsRaw] = await Promise.all([
    listAllModsObjectPaths(supabase, MODS_STORAGE_BUCKET),
    getAllCheats(),
  ]);

  const cheats: CheatMatchRow[] = cheatsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    game: gameTitle(c.game),
    link: String(c.link ?? ""),
  }));

  const linked = collectLinkedObjectPathsFromCheats(cheats);
  const orphans = buildOrphanRows(allPaths, linked, cheats, scope);

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          bucket: MODS_STORAGE_BUCKET,
          scope,
          totalObjects: allPaths.length,
          linkedPaths: linked.size,
          orphanCount: orphans.length,
          orphans: orphans.map((o) => ({
            path: o.path,
            topSuggestions: o.suggestions.slice(0, 3),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const usedCheats = new Set<string>();
  let applied = 0;
  let skipped = 0;
  const lines: string[] = [];

  for (const row of orphans) {
    const best = row.suggestions[0];
    if (!best || best.score < minScore) {
      skipped++;
      continue;
    }
    if (onlyMissingLink && !best.missingLink) {
      skipped++;
      continue;
    }
    if (usedCheats.has(best.cheatId)) {
      lines.push(
        `skip (cheat already used in this run): ${row.path} → ${best.name} (${best.score})`,
      );
      skipped++;
      continue;
    }
    if (!pathMatchesModsScope(row.path, scope)) {
      skipped++;
      continue;
    }

    const label = `[${best.score}] ${best.name} (${best.game})`;
    if (dryRun) {
      lines.push(`DRY-RUN: ${row.path} → cheat ${best.cheatId} ${label}`);
    } else {
      await updateCheat(best.cheatId, { link: row.path });
      lines.push(`OK: ${row.path} → cheat ${best.cheatId} ${label}`);
    }
    applied++;
    usedCheats.add(best.cheatId);
  }

  for (const line of lines) console.log(line);
  console.log(
    dryRun
      ? `\nDry-run: ${applied} liaison(s) simulée(s), ${skipped} ignorée(s) (seuil ${minScore}${onlyMissingLink ? ", lien vide requis" : ""}).`
      : `\nFait: ${applied} liaison(s) écrite(s), ${skipped} ignorée(s) (seuil ${minScore}${onlyMissingLink ? ", lien vide requis" : ""}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
