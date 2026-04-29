import { requireAdminShopFounderApiAccess } from "@/lib/admin-shop-access";
import { isUuid } from "@/lib/security/is-uuid";
import { deleteShopAccount, updateShopAccount } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

function normalizeShopAccountPatch(raw: unknown): Record<string, unknown> | null {
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
  setStr("image", 2048);
  setStr("games", 512);
  setStr("region", 256);
  setStr("login", 512);
  setStr("email", 512);
  setStr("password", 512);

  if (typeof o.two_fa === "boolean") out.two_fa = o.two_fa;
  if (typeof o.is_ranked === "boolean") out.is_ranked = o.is_ranked;
  if (typeof o.is_active === "boolean") out.is_active = o.is_active;

  if (o.level === null) {
    out.level = null;
  } else if (
    typeof o.level === "number" &&
    Number.isInteger(o.level) &&
    o.level >= 0
  ) {
    out.level = o.level;
  }

  if (typeof o.price === "number" && Number.isFinite(o.price) && o.price >= 0) {
    out.price = o.price;
  }

  setStr("currency", 8);
  setStr("last_activity", 64);
  if (typeof o.requires_chat === "boolean") {
    out.requires_chat = o.requires_chat;
  }
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
    const patch = normalizeShopAccountPatch(body);
    if (!patch) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await updateShopAccount(idTrim, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/accounts PATCH]", message);
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

    await deleteShopAccount(idTrim);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/accounts DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
