import { requireAdminShopApiAccess } from "@/lib/admin-shop-access";
import { isUuid } from "@/lib/security/is-uuid";
import {
  deleteShopReview,
  getCreatedByForShopProduct,
  getShopReviewById,
  partnerOwnsCreatedByValue,
  updateShopReview,
  type ShopReviewAdminPatchRow,
} from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

function normalizeShopReviewPatch(raw: unknown): ShopReviewAdminPatchRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: ShopReviewAdminPatchRow = {};

  if ("comment" in o) {
    if (o.comment === null) out.comment = null;
    else if (typeof o.comment === "string") {
      const m = o.comment.trim();
      if (m.length > 0 && m.length < 3) return null;
      if (m.length > 4000) return null;
      out.comment = m === "" ? null : m;
    } else return null;
  }

  if ("rating" in o) {
    const nRaw = o.rating;
    const n =
      typeof nRaw === "number"
        ? nRaw
        : typeof nRaw === "string"
          ? Number.parseInt(nRaw, 10)
          : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 5) return null;
    out.rating = n;
  }

  if ("is_visible" in o) {
    if (typeof o.is_visible !== "boolean") return null;
    out.is_visible = o.is_visible;
  }

  return Object.keys(out).length ? out : null;
}

async function canModerateShopReview(
  gate: Awaited<ReturnType<typeof requireAdminShopApiAccess>> & { ok: true },
  productType: string,
  productId: string,
): Promise<boolean> {
  if (gate.scope.mode === "founder") return true;
  const cb = await getCreatedByForShopProduct(productType, productId);
  return partnerOwnsCreatedByValue(
    cb,
    gate.scope.discordId,
    gate.scope.appUserId,
  );
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAdminShopApiAccess();
    if (!gate.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: gate.status });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const review = await getShopReviewById(idTrim);
    if (!review) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !(await canModerateShopReview(
        gate,
        review.product_type,
        review.product_id,
      ))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const row = normalizeShopReviewPatch(body);
    if (!row) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await updateShopReview(idTrim, row);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/reviews PATCH]", message);
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
    const gate = await requireAdminShopApiAccess();
    if (!gate.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: gate.status });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const review = await getShopReviewById(idTrim);
    if (!review) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !(await canModerateShopReview(
        gate,
        review.product_type,
        review.product_id,
      ))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteShopReview(idTrim);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/reviews DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
