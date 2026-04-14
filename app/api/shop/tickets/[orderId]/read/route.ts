import { auth } from "@/app/auth";
import { getCurrentUserAccess, getDiscordUserIdForAuthUser } from "@/lib/permissions-server";
import { getOrderById, markTicketAsRead } from "@/lib/supabase/shop-queries";
import { isUuid } from "@/lib/security/is-uuid";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await ctx.params;
    if (!isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const discordId = await getDiscordUserIdForAuthUser(user.id, user.image);
    const access = await getCurrentUserAccess({ source: "db" });
    const isAdminOrPartner = access.role === "founder" || access.role === "partner";

    if (order.user_id !== discordId && !isAdminOrPartner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await markTicketAsRead(orderId, discordId ?? user.id, isAdminOrPartner);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/shop/tickets/read POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
