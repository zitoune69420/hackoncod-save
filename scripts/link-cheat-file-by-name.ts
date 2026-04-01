/**
 * Lie un cheat (par nom affiché) à un objet du bucket mods (par nom ou fin de chemin).
 *
 *   npx tsx scripts/link-cheat-file-by-name.ts --cheat "GSC LOADER BO3" --file "GSC injector BO3.zip"
 *
 * Prérequis : .env.local (SUPABASE_SERVICE_ROLE_KEY, etc.)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import { getAllCheats, updateCheat } from "../lib/supabase/queries";
import { listAllModsObjectPaths, pathMatchesModsScope } from "../lib/mods-orphan-files";
import { MODS_STORAGE_BUCKET } from "../lib/mods-storage";
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

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  let cheatQ = "";
  let fileQ = "";
  let scope: "server" | "shop" = "server";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cheat" && args[i + 1]) cheatQ = args[++i]!;
    else if (args[i] === "--file" && args[i + 1]) fileQ = args[++i]!;
    else if (args[i] === "--scope" && args[i + 1]) {
      const s = args[++i];
      if (s === "shop" || s === "server") scope = s;
    }
  }
  if (!cheatQ || !fileQ) {
    console.error(
      'Usage: npx tsx scripts/link-cheat-file-by-name.ts --cheat "GSC LOADER BO3" --file "GSC injector BO3.zip" [--scope server]',
    );
    process.exit(1);
  }

  const cheats = await getAllCheats();
  const cn = norm(cheatQ);
  const matches = cheats.filter((c) => norm(c.name) === cn || norm(c.name).includes(cn));
  if (matches.length === 0) {
    console.error("Aucun cheat trouvé pour:", cheatQ);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error("Plusieurs cheats, affine le nom :");
    for (const c of matches) {
      console.error(" -", c.id, c.name, "(" + gameTitle(c.game) + ")");
    }
    process.exit(1);
  }
  const cheat = matches[0]!;

  const supabase = createAdminClient();
  const paths = await listAllModsObjectPaths(supabase, MODS_STORAGE_BUCKET);
  const fn = norm(fileQ);
  const fileLower = fileQ.trim().toLowerCase();
  const candidates = paths.filter((p) => {
    if (!pathMatchesModsScope(p, scope)) return false;
    const base = p.split("/").pop() ?? p;
    return (
      base.toLowerCase() === fileLower ||
      base.toLowerCase().includes(fileLower) ||
      norm(base).includes(fn)
    );
  });

  if (candidates.length === 0) {
    console.error("Aucun fichier dans le bucket pour:", fileQ, "scope:", scope);
    process.exit(1);
  }
  if (candidates.length > 1) {
    console.error("Plusieurs fichiers possibles:");
    for (const p of candidates) console.error(" -", p);
    process.exit(1);
  }

  const objectPath = candidates[0]!;
  await updateCheat(cheat.id, { link: objectPath });
  console.log("OK");
  console.log("  cheat:", cheat.name, cheat.id);
  console.log("  link: ", objectPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
