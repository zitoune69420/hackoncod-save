import { requireFounderDiscordLive } from "@/lib/require-founder-live";
import {
  buildOrphanRows,
  collectLinkedObjectPathsFromCheats,
  listAllModsObjectPaths,
  type AdminModsScope,
  type CheatMatchRow,
} from "@/lib/mods-orphan-files";
import { MODS_STORAGE_BUCKET } from "@/lib/mods-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllCheats } from "@/lib/supabase/queries";
import type { CheatWithGame } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

function gameTitle(g: CheatWithGame["game"]): string {
  if (g == null) return "—";
  if (Array.isArray(g)) return g[0]?.title ?? "—";
  return (g as { title?: string }).title ?? "—";
}

function parseScope(raw: string | null): AdminModsScope | null {
  if (raw === "server" || raw === "shop") return raw;
  return null;
}

export async function GET(req: Request) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const scope = parseScope(searchParams.get("scope"));
    if (!scope) {
      return NextResponse.json(
        { error: "Query scope=server|shop required" },
        { status: 400 },
      );
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

    return NextResponse.json(
      {
        bucket: MODS_STORAGE_BUCKET,
        scope,
        totalObjects: allPaths.length,
        linkedPaths: linked.size,
        orphanCount: orphans.length,
        orphans,
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/mods/orphans]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
