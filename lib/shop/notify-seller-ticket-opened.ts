import "server-only";

import { getDiscordBotToken } from "@/lib/env";
import { discordDefaultEmbedAvatarUrl } from "@/lib/discord/discord-embed-avatar-fallback";
import { sendDirectMessageEmbed } from "@/lib/discord/dm";
import { getDiscordUserPresentationsForUserIds } from "@/lib/discord/guild-member-display";
import type { DiscordApiEmbed } from "@/lib/discord/webhook";
import { resolveCreatedByToDiscordSnowflake } from "@/lib/shop/resolve-created-by-discord";
import {
  getOrderById,
  mergeShopOrderPreOrderData,
} from "@/lib/supabase/shop-queries";
import type { ShopOrder } from "@/lib/supabase/shop-types";

const NOTIFY_KEY = "_sellerTicketOpenNotifySentAt";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

function productLabel(order: ShopOrder): string {
  const p = order.product;
  if (p && "name" in p && typeof p.name === "string" && p.name.trim()) {
    return p.name.trim();
  }
  return "Produit";
}

function productCreatedBy(order: ShopOrder): string | null {
  const p = order.product;
  if (!p || typeof p !== "object") return null;
  const raw = (p as { created_by?: string | null }).created_by;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

/**
 * Quand le **client** ouvre le chat ticket (GET messages), envoie un MP Discord
 * au créateur du produit (`created_by` : snowflake ou UUID app user avec `discord_user_id`).
 * Idempotent via `pre_order_data._sellerTicketOpenNotifySentAt`.
 */
export async function notifySellerWhenClientOpensTicketChat(
  orderId: string,
): Promise<void> {
  if (!getDiscordBotToken()?.trim()) return;

  const order = await getOrderById(orderId);
  if (!order) return;

  const po =
    order.pre_order_data &&
    typeof order.pre_order_data === "object" &&
    order.pre_order_data !== null
      ? (order.pre_order_data as Record<string, unknown>)
      : {};
  if (typeof po[NOTIFY_KEY] === "string" && po[NOTIFY_KEY].length > 0) {
    return;
  }

  const createdBy = productCreatedBy(order);
  const recipientId = await resolveCreatedByToDiscordSnowflake(createdBy);
  if (!recipientId) return;

  const buyerSnowflake = order.user_id.trim();
  if (!DISCORD_SNOWFLAKE_RE.test(buyerSnowflake)) return;
  if (recipientId === buyerSnowflake) return;

  const pres = await getDiscordUserPresentationsForUserIds([buyerSnowflake]);
  const buyer = pres.get(buyerSnowflake);
  const displayName =
    buyer?.displayName?.trim() ||
    `Client ${buyerSnowflake.slice(-6)}`;
  const avatarUrl =
    buyer?.avatarUrl?.trim() || discordDefaultEmbedAvatarUrl(buyerSnowflake);

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  const dashboardUrl = base
    ? `${base}/dashboard?page=tickets&orderId=${order.id}`
    : null;

  const ticketRef =
    order.ticket_number != null ? `#${order.ticket_number}` : order.id.slice(0, 8);

  const embed: DiscordApiEmbed = {
    author: {
      name: displayName,
      icon_url: avatarUrl,
    },
    title: "Nouveau ticket ouvert",
    description: `Un client a ouvert le ticket **${ticketRef}** pour **${productLabel(order)}**.`,
    fields: [
      {
        name: "Ticket",
        value: `\`${ticketRef}\``,
        inline: true,
      },
      {
        name: "Produit",
        value: productLabel(order).slice(0, 256),
        inline: true,
      },
      {
        name: "Discord (acheteur)",
        value: `\`${buyerSnowflake}\``,
        inline: false,
      },
    ],
    color: 0x5865f2,
    timestamp: new Date().toISOString(),
  };

  if (dashboardUrl) {
    embed.fields?.push({
      name: "Lien",
      value: dashboardUrl,
      inline: false,
    });
  }

  await sendDirectMessageEmbed(recipientId, [embed]);
  await mergeShopOrderPreOrderData(orderId, {
    [NOTIFY_KEY]: new Date().toISOString(),
  });
}
