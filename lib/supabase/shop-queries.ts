import { getDiscordDisplayNamesForUserIds } from "@/lib/discord/guild-member-display";
import { createAdminClient } from "./admin";
import type {
  ShopCheat,
  ShopService,
  ShopAccount,
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

export async function getActiveShopCheats(): Promise<ShopCheat[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_cheats")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  const cheats = (data ?? []) as ShopCheat[];
  for (const cheat of cheats) {
    cheat.prices = await getCheatPrices(cheat.id);
  }
  return cheats;
}

export async function getActiveShopServices(): Promise<ShopService[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_services")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  const services = (data ?? []) as ShopService[];
  for (const service of services) {
    service.prices = await getServicePrices(service.id);
  }
  return services;
}

export async function getActiveShopAccounts(): Promise<ShopAccount[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ShopAccount[];
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
  const discordIds = [...new Set(orderRows.map((o) => o.user_id))];
  let discordDisplayById: Map<string, string>;
  try {
    discordDisplayById = await getDiscordDisplayNamesForUserIds(discordIds);
  } catch {
    discordDisplayById = new Map();
  }

  const tickets: Ticket[] = [];
  for (const raw of orders) {
    const order = raw as ShopOrder;

    const { data: lastMsgArr } = await supabase
      .from("shop_ticket_messages")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const last_message = (lastMsgArr?.[0] as TicketMessage | undefined) ?? null;

    const { data: readRow } = await supabase
      .from("shop_ticket_reads")
      .select("last_read_at")
      .eq("order_id", order.id)
      .eq("user_id", userId)
      .maybeSingle();
    const lastReadAt = readRow?.last_read_at ?? null;

    let unread_count = 0;
    if (lastReadAt) {
      const senderFilter = isAdminOrPartner ? "client" : undefined;
      let countQuery = supabase
        .from("shop_ticket_messages")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id)
        .gt("created_at", lastReadAt);
      if (senderFilter) {
        countQuery = countQuery.eq("type", senderFilter);
      } else {
        countQuery = countQuery.in("type", ["admin", "staff"]);
      }
      const { count } = await countQuery;
      unread_count = count ?? 0;
    } else {
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
      unread_count = count ?? 0;
    }

    await resolveProduct(order);
    tickets.push({
      order,
      last_message,
      unread_count,
      client_discord_display: discordDisplayById.get(order.user_id) ?? null,
    });
  }

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
