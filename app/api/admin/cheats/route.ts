import { getCurrentUserAccess } from "@/lib/permissions-server";
import { getAllCheats } from "@/lib/supabase/queries";
import type { CheatWithGame } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

function gameTitle(g: CheatWithGame["game"]): string {
  if (g == null) return "—";
  if (Array.isArray(g)) return g[0]?.title ?? "—";
  return (g as { title?: string }).title ?? "—";
}

export async function GET() {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cheats = await getAllCheats();
    const rows = cheats.map((c) => ({
      id: c.id,
      game: gameTitle(c.game),
      name: c.name,
      mode: c.mode ?? "",
      platform: c.platform ?? "",
      extension: c.extension ?? "",
      crack: Boolean(c.crack),
      client: String(c.client ?? ""),
      vip: Boolean(c.vip),
      semi_vip: Boolean(c.semi_vip),
      statut: String(c.statut ?? ""),
      link: String(c.link ?? ""),
    }));

    return NextResponse.json(rows, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/cheats]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
