import { getCurrentUserAccess } from "@/lib/permissions-server";
import { updateOrderStatus, createTicketMessage } from "@/lib/supabase/shop-queries";
import { isUuid } from "@/lib/security/is-uuid";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  try {
    const access = await getCurrentUserAccess({ source: "live" });
    if (!access.isAuthenticated || (access.role !== "founder" && access.role !== "partner")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await ctx.params;
    if (!isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await updateOrderStatus(orderId, "completed");
    await createTicketMessage(orderId, "system", "[SALE_CONFIRMED]");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/tickets/confirm-sale POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
