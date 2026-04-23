import { getDiscordDisplayNamesForUserIds } from "@/lib/discord/guild-member-display";
import { createAdminClient } from "./admin";
import type {
  ShopCheatPublic,
  ShopServicePublic,
  ShopAccountPublic,
  ShopReview,
  ShopOrder,
  TicketMessage,
  Ticket,
  MessageType,
  OrderStatus,
  CheatPrice,
  ServicePrice,
  Sale,
  SaleAccount,
  SaleCheat,
} from "./shop-types";
import type { OrderWelcomeLocale } from "@/lib/shop/order-welcome-message";

/**
 * UUID sentinelle pour `shop_orders.product_id` quand `product_type === "support"`.
 * Si la table a une FK vers `shop_cheats`, ajoute une ligne avec cet id ou assouplis la contrainte.
 */
export const SHOP_GENERAL_SUPPORT_PRODUCT_ID =
  "00000000-0000-0000-0000-000000000001";

// ── Prices ──────────────────────────────────────────────────────────

export async function getCheatPrices(cheatId: string): Promise<CheatPrice[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cheat_prices")
    .select("*")
    .eq("cheat_id", cheatId)
    .eq("is_active", true)
    .order("duration_days", { ascending: true });
  if (error) return [];
  return (data ?? []) as CheatPrice[];
}

export async function getServicePrices(
  serviceId: string,
): Promise<ServicePrice[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_prices")
    .select("*")
    .eq("service_id", serviceId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as ServicePrice[];
}

// ── Products ────────────────────────────────────────────────────────

const SHOP_CHEAT_PUBLIC_SELECT =
  "id, slug, name, description, game, platform, status, image, requires_spoofer, requires_chat, is_active, created_at, updated_at";

const SHOP_SERVICE_PUBLIC_SELECT =
  "id, slug, name, description, image, platform, game, is_active, delivery_type, estimated_delivery_minutes, requires_chat, created_at, updated_at";

const SHOP_ACCOUNT_PUBLIC_SELECT =
  "id, slug, name, description, image, games, region, level, is_ranked, two_fa, last_activity, price, currency, requires_chat, is_active, created_at, updated_at";

/** Catalogue public API : pas de colonnes sensibles (paiements, création, identifiants). */
export async function getPublicShopCheatsForApi(): Promise<ShopCheatPublic[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_cheats")
    .select(SHOP_CHEAT_PUBLIC_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  const cheats = (data ?? []) as ShopCheatPublic[];
  for (const cheat of cheats) {
    cheat.prices = await getCheatPrices(cheat.id);
  }
  return cheats;
}

export async function getPublicShopServicesForApi(): Promise<ShopServicePublic[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_services")
    .select(SHOP_SERVICE_PUBLIC_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  const services = (data ?? []) as ShopServicePublic[];
  for (const service of services) {
    service.prices = await getServicePrices(service.id);
  }
  return services;
}

export async function getPublicShopAccountsForApi(): Promise<ShopAccountPublic[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_accounts")
    .select(SHOP_ACCOUNT_PUBLIC_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ShopAccountPublic[];
}

// ── Reviews ──────────────────────────────────────────────────────────

export async function getVisibleShopReviews(): Promise<ShopReview[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_reviews")
    .select("*")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ShopReview[];
}

// ── Orders / Tickets ─────────────────────────────────────────────────

const TICKET_STATUSES: OrderStatus[] = ["paid", "in_progress", "waiting_client", "completed"];

async function resolveProduct(order: ShopOrder): Promise<ShopOrder> {
  if (order.product_type === "support") {
    const now = order.created_at;
    const synthetic: ShopCheatPublic = {
      id: order.product_id,
      slug: "general-support",
      name: "Support général",
      description: null,
      game: null,
      platform: null,
      status: null,
      image: null,
      requires_spoofer: false,
      requires_chat: true,
      is_active: true,
      created_at: now,
      updated_at: order.updated_at ?? now,
    };
    order.product = synthetic;
    return order;
  }

  const supabase = createAdminClient();
  const table =
    order.product_type === "cheat"
      ? "shop_cheats"
      : order.product_type === "service"
        ? "shop_services"
        : "shop_accounts";
  const { data } = await supabase.from(table).select("*").eq("id", order.product_id).maybeSingle();
  if (data) order.product = data as ShopOrder["product"];
  return order;
}

export async function getOrderById(orderId: string): Promise<ShopOrder | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return resolveProduct(data as ShopOrder);
}

const TICKET_LIST_PARALLEL_CHUNK = 12;

async function mapInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

export async function getUserTickets(
  userId: string,
  isAdminOrPartner: boolean,
  archived = false,
): Promise<Ticket[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("shop_orders")
    .select("*")
    .in("status", TICKET_STATUSES)
    .eq("archived", archived)
    .order("created_at", { ascending: false });

  if (!isAdminOrPartner) {
    query = query.eq("user_id", userId);
  }

  const { data: orders, error } = await query;
  if (error || !orders) return [];

  const orderRows = orders as ShopOrder[];
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);
  const discordIds = [...new Set(orderRows.map((o) => o.user_id))];

  const [discordDisplayById, readsResult] = await Promise.all([
    getDiscordDisplayNamesForUserIds(discordIds).catch(() => new Map<string, string>()),
    supabase
      .from("shop_ticket_reads")
      .select("order_id, last_read_at")
      .in("order_id", orderIds)
      .eq("user_id", userId),
  ]);

  const readMap = new Map<string, string>(
    (readsResult.data ?? []).map((r) => [r.order_id, r.last_read_at]),
  );

  const tickets = await mapInChunks(orderRows, TICKET_LIST_PARALLEL_CHUNK, async (raw) => {
    const order = raw as ShopOrder;
    const lastReadAt = readMap.get(order.id) ?? null;

    const unreadCountPromise = (async (): Promise<number> => {
      if (lastReadAt) {
        let countQuery = supabase
          .from("shop_ticket_messages")
          .select("id", { count: "exact", head: true })
          .eq("order_id", order.id)
          .gt("created_at", lastReadAt);
        if (isAdminOrPartner) {
          countQuery = countQuery.eq("type", "client");
        } else {
          countQuery = countQuery.in("type", ["admin", "staff"]);
        }
        const { count } = await countQuery;
        return count ?? 0;
      }
      let countQuery = supabase
        .from("shop_ticket_messages")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id);
      if (isAdminOrPartner) {
        countQuery = countQuery.eq("type", "client");
      } else {
        countQuery = countQuery.in("type", ["admin", "staff"]);
      }
      const { count } = await countQuery;
      return count ?? 0;
    })();

    const [{ data: lastMsgArr }, unread_count, resolvedOrder] = await Promise.all([
      supabase
        .from("shop_ticket_messages")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1),
      unreadCountPromise,
      resolveProduct(order),
    ]);

    const last_message = (lastMsgArr?.[0] as TicketMessage | undefined) ?? null;

    return {
      order: resolvedOrder,
      last_message,
      unread_count,
      client_discord_display: discordDisplayById.get(resolvedOrder.user_id) ?? null,
    };
  });

  return tickets;
}

export async function getTicketMessages(orderId: string): Promise<TicketMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_ticket_messages")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as TicketMessage[];
}

export async function createTicketMessage(
  orderId: string,
  type: MessageType,
  content: string,
  sentBy?: string,
): Promise<TicketMessage | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_ticket_messages")
    .insert({ order_id: orderId, type, content, sent_by: sentBy ?? null })
    .select("*")
    .single();
  if (error) return null;
  return data as TicketMessage;
}

export async function updateOrderLanguage(
  orderId: string,
  language: string,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("shop_orders")
    .update({
      language,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

export async function markTicketAsRead(
  orderId: string,
  userId: string,
  isAdminOrPartner = false,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  await supabase.from("shop_ticket_reads").upsert(
    {
      order_id: orderId,
      user_id: userId,
      last_read_at: now,
      is_admin_or_partner: isAdminOrPartner,
      updated_at: now,
    },
    { onConflict: "order_id,user_id" },
  );
}

export async function archiveTicket(orderId: string, archived: boolean): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("shop_orders").update({ archived }).eq("id", orderId);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "completed") update.paid_at = update.paid_at ?? new Date().toISOString();
  await supabase.from("shop_orders").update(update).eq("id", orderId);
}

export async function deleteTicket(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("shop_ticket_reads").delete().eq("order_id", orderId);
  await supabase.from("shop_ticket_messages").delete().eq("order_id", orderId);
  await supabase.from("shop_orders").delete().eq("id", orderId);
}

// ── Sales ────────────────────────────────────────────────────────────

export async function createSale(input: {
  title: string;
  price: number;
  og_price?: number | null;
  selled_by?: string | null;
  /** FK uuid vers `users.id` — pas l’ID Discord (snowflake). */
  buy_by?: string | null;
  type: string;
  notes?: string | null;
}): Promise<Sale | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sale")
    .insert({
      title: input.title,
      price: input.price,
      og_price: input.og_price ?? null,
      selled_by: input.selled_by ?? null,
      buy_by: input.buy_by ?? null,
      date: now,
      type: input.type,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[createSale]", error);
    return null;
  }
  return data as Sale;
}

export async function createSaleAccount(
  saleId: string,
  account: Omit<SaleAccount, "id" | "sale_id" | "created_at" | "updated_at">,
): Promise<SaleAccount | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sale_account")
    .insert({
      sale_id: saleId,
      ...account,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[createSaleAccount]", error);
    return null;
  }
  return data as SaleAccount;
}

export async function createSaleCheat(
  saleId: string,
  cheat: Omit<SaleCheat, "id" | "sale_id" | "created_at" | "updated_at">,
): Promise<SaleCheat | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sale_cheat")
    .insert({
      sale_id: saleId,
      ...cheat,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[createSaleCheat]", error);
    return null;
  }
  return data as SaleCheat;
}

export async function mergeShopOrderPreOrderData(
  orderId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("shop_orders")
    .select("pre_order_data")
    .eq("id", orderId)
    .maybeSingle();
  const cur =
    data?.pre_order_data && typeof data.pre_order_data === "object" && data.pre_order_data !== null
      ? (data.pre_order_data as Record<string, unknown>)
      : {};
  const now = new Date().toISOString();
  await supabase
    .from("shop_orders")
    .update({
      pre_order_data: { ...cur, ...patch },
      updated_at: now,
    })
    .eq("id", orderId);
}

export async function createShopOrder(input: {
  userId: string;
  productId: string;
  productType: string;
  price: number;
  notes?: string | null;
  paymentMethod: string;
  senderFirstName: string;
  senderLastName: string;
  senderAccount: string;
  language?: string | null;
}): Promise<ShopOrder | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("shop_orders")
    .insert({
      user_id: input.userId,
      product_id: input.productId,
      product_type: input.productType,
      status: "paid" as OrderStatus,
      price: input.price,
      pre_order_data: {
        payment_method: input.paymentMethod,
        sender_first_name: input.senderFirstName,
        sender_last_name: input.senderLastName,
        sender_account: input.senderAccount,
        notes: input.notes ?? null,
      },
      user_first_name: input.senderFirstName,
      user_last_name: input.senderLastName,
      language: input.language ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[createShopOrder]", error);
    return null;
  }
  return data as ShopOrder;
}

const GENERAL_SUPPORT_SYSTEM_COPY: Record<OrderWelcomeLocale, string> = {
  fr: "Demande de support général ouverte depuis le tableau de bord. Décris ta situation ci-dessous — l’équipe te répondra ici.",
  en: "General support request opened from the dashboard. Describe your issue below — the team will reply here.",
};

/** Ticket hors achat : une ligne `shop_orders` + message système + premier message client. */
export async function createGeneralSupportTicket(input: {
  userId: string;
  initialMessage: string;
  welcomeLocale: OrderWelcomeLocale;
}): Promise<ShopOrder | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const lang = input.welcomeLocale;
  const { data, error } = await supabase
    .from("shop_orders")
    .insert({
      user_id: input.userId,
      product_id: SHOP_GENERAL_SUPPORT_PRODUCT_ID,
      product_type: "support",
      status: "in_progress",
      price: 0,
      pre_order_data: { source: "general_support" },
      payment_intent_id: null,
      paid_at: null,
      user_email: null,
      user_first_name: null,
      user_last_name: null,
      user_phone: null,
      ticket_number: null,
      archived: false,
      language: lang,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createGeneralSupportTicket]", error);
    return null;
  }

  const order = data as ShopOrder;
  await createTicketMessage(order.id, "system", GENERAL_SUPPORT_SYSTEM_COPY[lang]);
  const msg = await createTicketMessage(
    order.id,
    "client",
    input.initialMessage.trim(),
    input.userId,
  );
  if (!msg) {
    console.error("[createGeneralSupportTicket] client message insert failed");
    return null;
  }

  return resolveProduct(order);
}

// ── Signed image URL ────────────────────────────────────────────────

const MODS_BUCKET = "mods";

export async function getShopSignedImageUrl(
  imagePath: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MODS_BUCKET)
    .createSignedUrl(imagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
