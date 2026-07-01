import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";
import {
  resolveOrderWelcomeLocale,
} from "@/lib/shop/order-welcome-message";
import { resolveViewerDiscordSnowflake } from "@/lib/shop/resolve-viewer-discord-snowflake";
import { createGeneralSupportTicket } from "@/lib/supabase/shop-queries";
import { NextRequest, NextResponse } from "next/server";

const MIN_LEN = 10;
const MAX_LEN = 8000;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await getHeadersForBetterAuth(),
    });
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = await resolveViewerDiscordSnowflake(user);
    if (!discordId) {
      return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const message =
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message.trim()
        : "";

    if (message.length < MIN_LEN) {
      return NextResponse.json(
        { error: "Message too short", code: "too_short" },
        { status: 400 },
      );
    }
    if (message.length > MAX_LEN) {
      return NextResponse.json(
        { error: "Message too long", code: "too_long" },
        { status: 400 },
      );
    }

    const welcomeLocale = resolveOrderWelcomeLocale(req.headers.get("accept-language"));
    const order = await createGeneralSupportTicket({
      userId: discordId,
      initialMessage: message,
      welcomeLocale,
    });

    if (!order) {
      return NextResponse.json({ error: "Could not create ticket" }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("[api/shop/tickets/general]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
