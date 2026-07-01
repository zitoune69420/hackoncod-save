/**
 * Lie en série des fichiers du bucket mods à des cheats (par nom affiché en base).
 *
 *   npx tsx scripts/link-cheats-batch.ts [--scope server|shop] [--dry-run]
 *
 * Prérequis : .env.local
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import { getAllCheats } from "../lib/supabase/queries";
import {
  findSingleCheatByName,
  findSingleModsPath,
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

/**
 * Fichier (extrémité de chemin bucket) → nom de cheat à matcher en base.
 * Même fichier peut apparaître deux fois (plusieurs cheats → même archive).
 */
const PAIRS: { file: string; cheat: string }[] = [
  { file: "BOIII GSC Injector.zip", cheat: "BOIII Injector" },
  { file: "BO3 ZM Tool.zip", cheat: "Axera" },
  { file: "1771693086091-ColdWar-Lucy-", cheat: "ColdWar Lucy" },
  { file: "Unlock Camos GSC.zip", cheat: "GSC Unlock Camo level" },
  { file: "Project Hinatuy GSC.zip", cheat: "ProjectHiNAtyu" },
  {
    file: "CoD IW Director's Cut Unlocker.zip",
    cheat: "Director's Cut Unlocker Character Changer",
  },
  { file: "IW COD ZM.zip", cheat: "IWCodZMTool" },
  { file: "IW COD ZM.zip", cheat: "Infinite Warfare Unlock Tool" },
  { file: "Encore V8.zip", cheat: "EncoreV8" },
  { file: "MXT 1.0.1.zip", cheat: "MXT BO4" },
  { file: "Temp Unlock.zip", cheat: "Unlock All TEMPS" },
  { file: "SheshHooks.zip", cheat: "SeshHook" },
  { file: "WaW Rank.zip", cheat: "WaW Unlock" },
  { file: "WaW v2.zip", cheat: "WaW Tools" },
  { file: "Fresh Modders - T4 Mod Menu.zip", cheat: "FreshModded" },
  { file: "WWII Unlock All.zip", cheat: "Unlock tool" },
];

async function main(): Promise<void> {
  loadEnvLocal();
  let scope: LinkScope = "server";
  let dryRun = false;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--scope" && process.argv[i + 1]) {
      const s = process.argv[++i];
      if (s === "shop" || s === "server") scope = s;
    } else if (process.argv[i] === "--dry-run") dryRun = true;
  }

  const supabase = createAdminClient();
  const [allCheats, paths] = await Promise.all([
    getAllCheats(),
    loadModsPaths(supabase),
  ]);

  let ok = 0;
  let fail = 0;

  for (const { file, cheat } of PAIRS) {
    if (dryRun) {
      const c = findSingleCheatByName(allCheats, cheat);
      const p = findSingleModsPath(paths, file, scope);
      console.log(`\n[DRY] file=${JSON.stringify(file)} cheat=${JSON.stringify(cheat)}`);
      if (!c.ok) console.log("  CHEAT:", c.error);
      else console.log("  cheat →", c.cheat.name, c.cheat.id);
      if (!p.ok) console.log("  FILE:", p.error);
      else console.log("  path →", p.path);
      if (c.ok && p.ok) ok++;
      else fail++;
      continue;
    }

    const r = await linkCheatToModsFile({
      allCheats,
      paths,
      cheatNameQuery: cheat,
      fileNameQuery: file,
      scope,
    });
    if (r.ok) {
      ok++;
      console.log("OK", cheat, "←", file);
      console.log("  id:", r.cheat.id, "| jeu:", gameTitle(r.cheat.game));
      console.log("  ", r.path);
    } else {
      fail++;
      console.error("FAIL", file, "→", cheat);
      console.error(" ", r.error);
    }
  }

  console.log(`\nRésumé: ${ok} OK, ${fail} échec(s)`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
