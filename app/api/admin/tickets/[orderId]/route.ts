import { deleteTicket } from "@/lib/supabase/shop-queries";
import { isUuid } from "@/lib/security/is-uuid";
import { NextRequest, NextResponse } from "next/server";

import { requireFounderDiscordLive } from "@/lib/require-founder-live";
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const { orderId } = await ctx.params;
    if (!isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await deleteTicket(orderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/tickets DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
