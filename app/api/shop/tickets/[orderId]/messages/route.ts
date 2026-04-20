import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";
import { getDiscordUserPresentationsForUserIds } from "@/lib/discord/guild-member-display";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { resolveViewerDiscordSnowflake } from "@/lib/shop/resolve-viewer-discord-snowflake";
import {
  getOrderById,
  getTicketMessages,
  createTicketMessage,
  updateOrderLanguage,
} from "@/lib/supabase/shop-queries";
import { isUuid } from "@/lib/security/is-uuid";
import { NextRequest, NextResponse } from "next/server";
import type { MessageType, TicketMessage, TicketMessageEnriched } from "@/lib/supabase/shop-types";

async function enrichTicketMessages(messages: TicketMessage[]): Promise<TicketMessageEnriched[]> {
  const ids = [
    ...new Set(
      messages.map((m) => m.sent_by).filter((id): id is string => id != null),
    ),
  ];
  const pres = await getDiscordUserPresentationsForUserIds(ids);
  return messages.map((m) => {
    if (!m.sent_by) return { ...m };
    const p = pres.get(m.sent_by);
    return {
      ...m,
      author_avatar_url: p?.avatarUrl ?? null,
      author_display_name: p?.displayName ?? null,
    };
  });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await getHeadersForBetterAuth(),
    });
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

    const discordId = await resolveViewerDiscordSnowflake(user);
    const access = await getCurrentUserAccess({ source: "db" });
    const isAdminOrPartner = access.role === "founder" || access.role === "partner";

    if (order.user_id !== discordId && !isAdminOrPartner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await getTicketMessages(orderId);
    const messages = await enrichTicketMessages(raw);
    return NextResponse.json({
      messages,
      viewerDiscordId: discordId ?? null,
    });
  } catch (err) {
    console.error("[api/shop/tickets/messages GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await getHeadersForBetterAuth(),
    });
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

    if (!["paid", "in_progress", "waiting_client", "completed"].includes(order.status)) {
      return NextResponse.json({ error: "Order not eligible for chat" }, { status: 400 });
    }

    const discordId = await resolveViewerDiscordSnowflake(user);
    const access = await getCurrentUserAccess({ source: "db" });
    const isAdminOrPartner = access.role === "founder" || access.role === "partner";

    if (order.user_id !== discordId && !isAdminOrPartner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.archived && !isAdminOrPartner) {
      return NextResponse.json({ error: "Ticket archived" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const isClientLanguageSet =
      /^\[LANGUAGE_SET:(fr|en|other)\]$/i.test(content) &&
      order.user_id === discordId &&
      !isAdminOrPartner;

    let type: MessageType = "client";
    if (isAdminOrPartner) {
      type = access.role === "founder" ? "admin" : "staff";
      if (body?.type === "system") type = "system";
    } else if (isClientLanguageSet) {
      type = "system";
    }

    const msg = await createTicketMessage(orderId, type, content, discordId ?? undefined);
    if (!msg) {
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    if (isClientLanguageSet) {
      const m = /^\[LANGUAGE_SET:(fr|en|other)\]$/i.exec(content);
      const code = m?.[1]?.toLowerCase();
      if (code) await updateOrderLanguage(orderId, code);
    }

    const [enriched] = await enrichTicketMessages([msg]);
    return NextResponse.json(enriched, { status: 201 });
  } catch (err) {
    console.error("[api/shop/tickets/messages POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
