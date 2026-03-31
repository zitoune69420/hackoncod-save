import { getCurrentUserAccess } from "@/lib/permissions-server";
import { isUuid } from "@/lib/security/is-uuid";
import {
  deleteVideo,
  type VideoUpsertRow,
  updateVideo,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

function nullIfEmpty(s: unknown): string | null | undefined {
  if (s === undefined) return undefined;
  if (s === null) return null;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t === "" ? null : t;
}

function normalizePatchBody(raw: unknown): Partial<VideoUpsertRow> | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<VideoUpsertRow> = {};

  if (typeof o.title === "string") {
    const t = o.title.trim();
    if (!t) return null;
    out.title = t;
  }
  if ("description" in o) out.description = nullIfEmpty(o.description) ?? null;
  if ("image" in o) out.image = nullIfEmpty(o.image) ?? null;
  if ("link" in o) out.link = nullIfEmpty(o.link) ?? null;

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

    await updateVideo(idTrim, row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/videos PATCH]", message);
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

    await deleteVideo(idTrim);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/videos DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
