import { getCurrentUserAccess } from "@/lib/permissions-server";
import { archiveTicket, createTicketMessage } from "@/lib/supabase/shop-queries";
import { isUuid } from "@/lib/security/is-uuid";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
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

    const body = await req.json().catch(() => null);
    const archived = body?.archived === true;

    await archiveTicket(orderId, archived);
    await createTicketMessage(
      orderId,
      "system",
      archived ? "[TICKET_ARCHIVED:true]" : "[TICKET_ARCHIVED:false]",
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/tickets/archive PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
