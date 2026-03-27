import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  getAllCheats,
  insertCheat,
  type CheatInsertRow,
} from "@/lib/supabase/queries";
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
      game_id: c.game_id,
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

function normalizeBody(raw: unknown): CheatInsertRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const gameId = typeof o.game_id === "string" ? o.game_id.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!gameId || !name) return null;

  return {
    game_id: gameId,
    name,
    mode: typeof o.mode === "string" ? o.mode : "",
    platform: typeof o.platform === "string" ? o.platform : "",
    extension: typeof o.extension === "string" ? o.extension : "",
    crack: Boolean(o.crack),
    client: typeof o.client === "string" ? o.client : "",
    link: typeof o.link === "string" ? o.link : "",
    statut: typeof o.statut === "string" ? o.statut : "",
    vip: Boolean(o.vip),
    semi_vip: Boolean(o.semi_vip),
  };
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const row = normalizeBody(body);
    if (!row) {
      return NextResponse.json(
        { error: "Invalid body (game_id, name required)" },
        { status: 400 },
      );
    }

    const { id } = await insertCheat(row);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/cheats POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
