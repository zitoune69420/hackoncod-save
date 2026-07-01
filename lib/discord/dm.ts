import "server-only"

import { getDiscordBotToken } from "@/lib/env"
import { DISCORD_API_BASE } from "./discord-rest"
import type { DiscordApiEmbed } from "./webhook"

/**
 * Envoie un message (embeds) en MP à un utilisateur Discord via le bot.
 * Nécessite `DISCORD_BOT_TOKEN` et que le bot partage un serveur avec l’utilisateur
 * (ou politique DM ouverte selon Discord).
 */
export async function sendDirectMessageEmbed(
  recipientDiscordUserId: string,
  embeds: DiscordApiEmbed[],
): Promise<void> {
  const token = getDiscordBotToken()
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set")
  }

  const open = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: recipientDiscordUserId }),
  })

  if (!open.ok) {
    const text = await open.text()
    throw new Error(`Discord open DM ${open.status}: ${text}`)
  }

  const channel = (await open.json()) as { id: string }

  const msg = await fetch(`${DISCORD_API_BASE}/channels/${channel.id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds }),
  })

  if (!msg.ok) {
    const text = await msg.text()
    throw new Error(`Discord send message ${msg.status}: ${text}`)
  }
}
