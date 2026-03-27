import { getCurrentUserAccess } from "@/lib/permissions-server";
import { isUuid } from "@/lib/security/is-uuid";
import {
  deleteGame,
  type GameUpsertRow,
  updateGame,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

function nullIfEmpty(s: unknown): string | null | undefined {
  if (s === undefined) return undefined;
  if (s === null) return null;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t === "" ? null : t;
}

function normalizePatchBody(raw: unknown): Partial<GameUpsertRow> | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<GameUpsertRow> = {};

  if (typeof o.title === "string") {
    const t = o.title.trim();
    if (!t) return null;
    out.title = t;
  }
  if ("description" in o) out.description = nullIfEmpty(o.description) ?? null;
  if ("image" in o) out.image = nullIfEmpty(o.image) ?? null;
  if ("steam" in o) out.steam = nullIfEmpty(o.steam) ?? null;
  if ("link" in o) out.link = nullIfEmpty(o.link) ?? null;
  if ("client" in o) out.client = nullIfEmpty(o.client) ?? null;
  if (typeof o.displayed === "boolean") out.displayed = o.displayed;

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
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const row = normalizePatchBody(body);
    if (!row) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await updateGame(idTrim, row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/games PATCH]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await deleteGame(idTrim);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/games DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
