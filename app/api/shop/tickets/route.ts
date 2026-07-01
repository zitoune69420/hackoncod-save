import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { getUserTickets } from "@/lib/supabase/shop-queries";
import { resolveViewerDiscordSnowflake } from "@/lib/shop/resolve-viewer-discord-snowflake";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await getHeadersForBetterAuth(),
    });
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";

    const discordId = await resolveViewerDiscordSnowflake(user);
    if (!discordId) {
      return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });
    }

    const access = await getCurrentUserAccess({ source: "db" });
    const isAdminOrPartner = access.role === "founder" || access.role === "partner";

    const tickets = await getUserTickets(discordId, isAdminOrPartner, archived);
    return NextResponse.json(tickets);
  } catch (err) {
    console.error("[api/shop/tickets]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
