/**
 * Envoi de messages via webhook Discord (embeds, contenu, pièces jointes).
 * @see https://discord.com/developers/docs/resources/webhook#execute-webhook
 */

export type DiscordWebhookBody = {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: DiscordApiEmbed[]
  /** @deprecated use embeds */
  embed?: DiscordApiEmbed
}

/** Sous-ensemble utile pour nos embeds (Discord accepte plus de champs). */
export type DiscordApiEmbed = {
  title?: string
  description?: string
  author?: { name: string; url?: string; icon_url?: string }
  color?: number
  thumbnail?: { url: string }
  image?: { url: string }
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: { text: string; icon_url?: string }
  timestamp?: string
}

export async function executeDiscordWebhook(
  webhookUrl: string,
  body: DiscordWebhookBody,
): Promise<void> {
  const res = await fetch(`${webhookUrl}${webhookUrl.includes("?") ? "&" : "?"}wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord webhook ${res.status}: ${text}`)
  }
}
