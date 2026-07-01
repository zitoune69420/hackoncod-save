"use server";

import {
  createSale,
  createSaleAccount,
  createSaleCheat,
  createShopOrder,
  createTicketMessage,
} from "@/lib/supabase/shop-queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUserTableIdForAuthUser } from "@/lib/supabase/app-users";
import { isUuid } from "@/lib/security/is-uuid";
import type {
  ProductType,
  ShopAccount,
  ShopCheat,
  ShopService,
} from "@/lib/supabase/shop-types";
import {
  buildOrderWelcomeSystemMessage,
  resolveOrderWelcomeLocale,
} from "@/lib/shop/order-welcome-message";
import { headers } from "next/headers";
import { getServerAuthSession } from "@/lib/auth/get-server-auth-session";
import { resolveViewerDiscordSnowflake } from "@/lib/shop/resolve-viewer-discord-snowflake";

export type CreateOrderResult =
  | { ok: true; orderId: string; saleId: string }
  | { ok: false; error: "unauthorized" | "invalid" | "product_not_found" | "server" };

interface CreateOrderInput {
  productId: string;
  productType: ProductType;
  priceId?: string | null;
  notes?: string | null;
  paymentMethod: string;
  senderFirstName: string;
  senderLastName: string;
  senderAccount: string;
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const session = await getServerAuthSession();
  const user = session?.user;
  if (!user?.id) return { ok: false, error: "unauthorized" };

  const discordId = await resolveViewerDiscordSnowflake(user);
  if (!discordId) return { ok: false, error: "unauthorized" };

  const supabase = createAdminClient();

  const { productId, productType, priceId, notes, paymentMethod, senderFirstName, senderLastName, senderAccount } = input;

  if (!productId || !productType || !paymentMethod || !senderFirstName || !senderLastName || !senderAccount) {
    return { ok: false, error: "invalid" };
  }

  const table =
    productType === "cheat"
      ? "shop_cheats"
      : productType === "service"
        ? "shop_services"
        : "shop_accounts";
  const { data: productRow } = await supabase
    .from(table)
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (!productRow) return { ok: false, error: "product_not_found" };

  let finalPrice = 0;
  let priceLabel = "";
  let currency = "EUR";

  if (productType === "account") {
    const account = productRow as ShopAccount;
    finalPrice = account.price;
    currency = account.currency ?? "EUR";
    priceLabel = `${account.price} ${currency}`;
  } else if (priceId) {
    const priceTable = productType === "cheat" ? "cheat_prices" : "service_prices";
    const fkColumn = productType === "cheat" ? "cheat_id" : "service_id";
    const { data: priceRow } = await supabase
      .from(priceTable)
      .select("*")
      .eq("id", priceId)
      .eq(fkColumn, productId)
      .maybeSingle();
    if (!priceRow) return { ok: false, error: "invalid" };
    finalPrice = (priceRow as { price: number }).price;
    currency = (priceRow as { currency: string }).currency ?? "EUR";
    priceLabel = `${(priceRow as { label?: string }).label ?? ""} – ${finalPrice} ${currency === "EUR" ? "€" : currency}`;
  }

  const saleTitle = `${(productRow as { name: string }).name}${priceLabel ? ` (${priceLabel})` : ""}`;

  const buyerUuid = await getAppUserTableIdForAuthUser(user.id);
  const createdBy = (productRow as { created_by?: string | null }).created_by ?? null;
  const selledByUuid = createdBy && isUuid(createdBy) ? createdBy : null;

  let saleNotes = notes?.trim() ?? "";
  if (!buyerUuid) {
    const tag = `Discord acheteur: ${discordId}`;
    saleNotes = saleNotes ? `${saleNotes}\n${tag}` : tag;
  }

  const sale = await createSale({
    title: saleTitle,
    price: finalPrice,
    og_price: productType === "account" ? (productRow as ShopAccount).price : null,
    buy_by: buyerUuid,
    selled_by: selledByUuid,
    type: productType,
    notes: saleNotes || null,
  });
  if (!sale) return { ok: false, error: "server" };

  if (productType === "account") {
    const acc = productRow as ShopAccount;
    await createSaleAccount(sale.id, {
      email: acc.email,
      login: acc.login,
      old_password: acc.password,
      new_password: null,
      last_activity: acc.last_activity,
      balance: null,
      register: null,
      level: acc.level,
      country: null,
      origin: null,
      zla: null,
      friends: null,
      games: null,
      skins: null,
      region: acc.region,
    });
  } else if (productType === "cheat") {
    const cheat = productRow as ShopCheat;
    await createSaleCheat(sale.id, {
      key: null,
      link: null,
      notes: `${cheat.name}${cheat.game ? ` – ${cheat.game}` : ""}`,
    });
  }

  const order = await createShopOrder({
    userId: discordId,
    productId,
    productType,
    price: finalPrice,
    notes,
    paymentMethod,
    senderFirstName,
    senderLastName,
    senderAccount,
  });
  if (!order) return { ok: false, error: "server" };

  const h = await headers();
  const welcomeLocale = resolveOrderWelcomeLocale(h.get("accept-language"));
  let systemWelcome = buildOrderWelcomeSystemMessage({
    locale: welcomeLocale,
    productType,
    productRow: productRow as ShopCheat | ShopService | ShopAccount,
    finalPrice,
    currency,
    paymentMethod,
  });
  if (notes?.trim()) {
    const noteBlock =
      welcomeLocale === "en"
        ? `\n\n**Note with your order:** ${notes.trim()}`
        : `\n\n**Note avec votre commande :** ${notes.trim()}`;
    systemWelcome += noteBlock;
  }

  await createTicketMessage(order.id, "system", systemWelcome);

  return { ok: true, orderId: order.id, saleId: sale.id };
}
