export type ProductType = "cheat" | "service" | "account";

export interface CheatPrice {
  id: string;
  cheat_id: string;
  label: string;
  duration_days: number | null;
  price: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface ServicePrice {
  id: string;
  service_id: string;
  label: string;
  price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface ShopCheat {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  game: string | null;
  platform: string | null;
  status: string | null;
  image: string | null;
  requires_spoofer: boolean;
  requires_chat: boolean;
  is_active: boolean;
  revolut: string | null;
  paypal: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  prices?: CheatPrice[];
}

export interface ShopService {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  platform: string | null;
  game: string | null;
  is_active: boolean;
  delivery_type: string | null;
  estimated_delivery_minutes: number | null;
  requires_chat: boolean;
  revolut: string | null;
  paypal: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  prices?: ServicePrice[];
}

export interface ShopAccount {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  games: string | null;
  region: string | null;
  login: string | null;
  email: string | null;
  password: string | null;
  two_fa: boolean;
  level: number | null;
  is_ranked: boolean;
  /** Not present in all shop_accounts rows (column may not exist). */
  is_active?: boolean;
  last_activity: string | null;
  price: number;
  currency: string | null;
  requires_chat: boolean;
  revolut: string | null;
  paypal: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopReview {
  id: string;
  product_type: string;
  product_id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
  image: string | null;
}

// ── Orders & Tickets ─────────────────────────────────────────────────

export type OrderStatus = "waiting_payment" | "paid" | "in_progress" | "waiting_client" | "completed";
export type MessageType = "system" | "client" | "staff" | "admin";

export interface ShopOrder {
  id: string;
  user_id: string;
  product_id: string;
  product_type: string;
  status: OrderStatus;
  price: number;
  pre_order_data: Record<string, unknown> | null;
  payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string | null;
  user_email: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_phone: string | null;
  ticket_number: number | null;
  archived: boolean;
  language: string | null;
  product?: Product;
}

export interface TicketMessage {
  id: string;
  order_id: string;
  type: MessageType;
  content: string;
  sent_by: string | null;
  created_at: string;
}

/** Message ticket enrichi par l’API (avatars / pseudos Discord). */
export interface TicketMessageEnriched extends TicketMessage {
  author_avatar_url?: string | null;
  author_display_name?: string | null;
}

/** Réponse `GET /api/shop/tickets/[orderId]/messages`. */
export type TicketMessagesApiResponse = {
  messages: TicketMessageEnriched[];
  viewerDiscordId: string | null;
};

export interface TicketRead {
  id: string;
  order_id: string;
  user_id: string;
  last_read_at: string;
  is_admin_or_partner: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  order: ShopOrder;
  last_message: TicketMessage | null;
  unread_count: number;
  /** Pseudo Discord du client (`global_name` / `username`), résolu côté API. */
  client_discord_display?: string | null;
}

export type Product = ShopCheat | ShopService | ShopAccount;

/** Block d'information configurable affiche dans le dialog produit. */
export interface InfoBlock {
  key: string;
  label: string;
  value: string | number | boolean | null | undefined;
  type?: "text" | "badge" | "boolean";
}

// ── Sales ────────────────────────────────────────────────────────────

export interface Sale {
  id: string;
  title: string | null;
  price: number | null;
  og_price: number | null;
  selled_by: string | null;
  buy_by: string | null;
  date: string | null;
  type: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SaleAccount {
  id: string;
  sale_id: string | null;
  email: string | null;
  login: string | null;
  old_password: string | null;
  new_password: string | null;
  last_activity: string | null;
  balance: number | null;
  register: string | null;
  level: number | null;
  country: string | null;
  origin: string | null;
  zla: boolean | null;
  friends: number | null;
  games: number | null;
  skins: number | null;
  region: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SaleCheat {
  id: string;
  sale_id: string | null;
  key: string | null;
  link: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}
