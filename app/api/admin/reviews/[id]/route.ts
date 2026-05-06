import { isUuid } from "@/lib/security/is-uuid";
import { requireFounderDiscordLive } from "@/lib/require-founder-live";
import {
  deleteReview,
  type ReviewAdminPatchRow,
  updateReview,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

function normalizePatchBody(raw: unknown): ReviewAdminPatchRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: ReviewAdminPatchRow = {};

  if ("message" in o) {
    if (typeof o.message !== "string") return null;
    const m = o.message.trim();
    if (m.length < 3 || m.length > 4000) return null;
    out.message = m;
  }
  if ("note" in o) {
    const nRaw = o.note;
    const n =
      typeof nRaw === "number"
        ? nRaw
        : typeof nRaw === "string"
          ? Number.parseInt(nRaw, 10)
          : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 5) return null;
    out.note = n;
  }
  if ("author_name" in o) {
    if (o.author_name === null) out.author_name = null;
    else if (typeof o.author_name === "string") {
      const a = o.author_name.trim();
      out.author_name = a === "" ? null : a;
    } else return null;
  }

  return Object.keys(out).length ? out : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
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

    await updateReview(idTrim, row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/reviews PATCH]", message);
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
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await deleteReview(idTrim);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/reviews DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
