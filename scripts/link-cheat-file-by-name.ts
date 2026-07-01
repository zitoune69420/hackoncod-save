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
import { getAllCheats } from "../lib/supabase/queries";
import {
  gameTitle,
  linkCheatToModsFile,
  loadModsPaths,
  type LinkScope,
} from "./link-cheat-core";

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

async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  let cheatQ = "";
  let fileQ = "";
  let scope: LinkScope = "server";
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

  const supabase = createAdminClient();
  const [allCheats, paths] = await Promise.all([
    getAllCheats(),
    loadModsPaths(supabase),
  ]);

  const r = await linkCheatToModsFile({
    allCheats,
    paths,
    cheatNameQuery: cheatQ,
    fileNameQuery: fileQ,
    scope,
  });

  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }

  console.log("OK");
  console.log("  cheat:", r.cheat.name, r.cheat.id, "(" + gameTitle(r.cheat.game) + ")");
  console.log("  link: ", r.path);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
