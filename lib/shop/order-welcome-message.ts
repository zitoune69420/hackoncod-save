import type { ProductType, ShopAccount, ShopCheat, ShopService } from "@/lib/supabase/shop-types";

export type OrderWelcomeLocale = "fr" | "en";

export function resolveOrderWelcomeLocale(
  acceptLanguage: string | null,
): OrderWelcomeLocale {
  if (!acceptLanguage?.trim()) return "fr";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("en")) return "en";
  return "fr";
}

function gamePlatformForProduct(
  productType: ProductType,
  row: ShopCheat | ShopService | ShopAccount,
): { game: string; platform: string } {
  if (productType === "cheat") {
    const c = row as ShopCheat;
    return {
      game: c.game?.trim() || "—",
      platform: c.platform?.trim() || "—",
    };
  }
  if (productType === "service") {
    const s = row as ShopService;
    return {
      game: s.game?.trim() || "—",
      platform: s.platform?.trim() || "—",
    };
  }
  const a = row as ShopAccount;
  return {
    game: a.games?.trim() || "—",
    platform: a.region?.trim() || "—",
  };
}

export function buildOrderWelcomeSystemMessage(input: {
  locale: OrderWelcomeLocale;
  productType: ProductType;
  productRow: ShopCheat | ShopService | ShopAccount;
  finalPrice: number;
  currency: string;
  paymentMethod: string;
}): string {
  const name = input.productRow.name.trim() || "—";
  const { game, platform } = gamePlatformForProduct(
    input.productType,
    input.productRow,
  );
  const price =
    input.currency === "EUR"
      ? `${input.finalPrice} EUR`
      : `${input.finalPrice} ${input.currency}`;

  if (input.locale === "en") {
    return `## Order received — Processing in progress

Hello,

Your order has been received and is currently being processed by our team.

---

**Your order information:**

- **Product:** ${name}
- **Price:** ${price}
- **Status:** Pending processing

---

**Order details:**

- **Game requested:** ${game}
- **Platform:** ${platform}
- **Payment method:** ${input.paymentMethod}

Please wait — our team will process your order and reply as soon as possible.

You will receive a notification as soon as a team member replies.

Thank you for your trust!

---

**Important reminder:** For respectful communication, please include polite words in your messages: hello, please, thank you, goodbye. Thank you for your understanding!`;
  }

  return `## Commande reçue - Traitement en cours

Bonjour,

Votre commande a été reçue et est actuellement en cours de traitement par notre équipe.

---

**Informations de votre commande :**

- **Produit :** ${name}
- **Prix :** ${price}
- **Statut :** En attente de traitement

---

**Détails de votre commande :**

- **Jeu demandé :** ${game}
- **Plateforme :** ${platform}
- **Méthode de paiement :** ${input.paymentMethod}

Veuillez patienter, notre équipe va traiter votre commande et vous répondre dans les plus brefs délais.

Vous recevrez une notification dès qu'un membre de notre équipe vous répondra.

Merci de votre confiance !

---

**Rappel important :** Pour une communication respectueuse, veuillez inclure les mots de politesse suivants dans vos messages : bonjour, svp, merci, au revoir. Merci de votre compréhension !`;
}
