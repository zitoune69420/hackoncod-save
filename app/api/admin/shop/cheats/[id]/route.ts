import { requireAdminShopFounderApiAccess } from "@/lib/admin-shop-access";
import { isUuid } from "@/lib/security/is-uuid";
import { deleteShopCheat, updateShopCheat } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

function normalizeShopCheatPatch(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  const setStr = (key: string, maxLen?: number) => {
    if (!(key in o)) return;
    if (o[key] === null) {
      out[key] = null;
      return;
    }
    if (typeof o[key] !== "string") return;
    let v = (o[key] as string).trim();
    if (maxLen != null && v.length > maxLen) v = v.slice(0, maxLen);
    out[key] = v === "" ? null : v;
  };

  if (typeof o.name === "string") {
    const v = o.name.trim();
    if (v.length > 0) out.name = v.slice(0, 512);
  }
  if (typeof o.slug === "string") {
    const v = o.slug.trim();
    if (v.length > 0) out.slug = v.slice(0, 256);
  }
  setStr("description", 20000);
  setStr("game", 256);
  setStr("platform", 128);
  setStr("status", 128);
  setStr("image", 2048);

  if (typeof o.requires_spoofer === "boolean") {
    out.requires_spoofer = o.requires_spoofer;
  }
  if (typeof o.requires_chat === "boolean") {
    out.requires_chat = o.requires_chat;
  }
  if (typeof o.is_active === "boolean") out.is_active = o.is_active;
  setStr("revolut", 512);
  setStr("paypal", 512);
  setStr("created_by", 128);

  return Object.keys(out).length ? out : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAdminShopFounderApiAccess();
    if (!gate.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: gate.status });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const patch = normalizeShopCheatPatch(body);
    if (!patch) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await updateShopCheat(idTrim, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/cheats PATCH]", message);
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
    const gate = await requireAdminShopFounderApiAccess();
    if (!gate.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: gate.status });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await deleteShopCheat(idTrim);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/cheats DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
