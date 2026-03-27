import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  type CheatInsertRow,
  updateCheat,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

function normalizeBody(raw: unknown): Partial<CheatInsertRow> | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<CheatInsertRow> = {};

  if (typeof o.game_id === "string") out.game_id = o.game_id.trim();
  if (typeof o.name === "string") out.name = o.name.trim();
  if (typeof o.mode === "string") out.mode = o.mode;
  if (typeof o.platform === "string") out.platform = o.platform;
  if (typeof o.extension === "string") out.extension = o.extension;
  if (typeof o.crack === "boolean") out.crack = o.crack;
  if (typeof o.client === "string") out.client = o.client;
  if (typeof o.link === "string") out.link = o.link;
  if (typeof o.statut === "string") out.statut = o.statut;
  if (typeof o.vip === "boolean") out.vip = o.vip;
  if (typeof o.semi_vip === "boolean") out.semi_vip = o.semi_vip;

  return Object.keys(out).length ? out : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const row = normalizeBody(body);
    if (!row) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (row.name !== undefined && !row.name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (row.game_id !== undefined && !row.game_id.trim()) {
      return NextResponse.json({ error: "game_id cannot be empty" }, { status: 400 });
    }

    await updateCheat(id.trim(), row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/cheats PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
