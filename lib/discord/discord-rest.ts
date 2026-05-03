import "server-only"

import { getDiscordBotToken } from "@/lib/env"

/**
 * Point d’entrée serveur pour les appels à l’API REST Discord.
 * Les routes sous `app/api/discord/**` peuvent importer ces helpers.
 *
 * Docs : https://discord.com/developers/docs/reference
 */
export const DISCORD_API_VERSION = "10" as const

export const DISCORD_API_BASE = `https://discord.com/api/v${DISCORD_API_VERSION}`

export function discordBotHeaders(): HeadersInit {
  const token = getDiscordBotToken()
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set")
  }
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  }
}

/** GET JSON depuis l’API Discord (bot). */
export async function discordFetchBot<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${DISCORD_API_BASE}${path.startsWith("/") ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      ...discordBotHeaders(),
      ...init?.headers,
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

/** PUT sans corps (ex. ajout de rôle membre) ; succès typique = 204 No Content. */
export async function discordPutBotNoContent(path: string): Promise<void> {
  const url = path.startsWith("http")
    ? path
    : `${DISCORD_API_BASE}${path.startsWith("/") ? path : `/${path}`}`
  const res = await fetch(url, {
    method: "PUT",
    headers: discordBotHeaders(),
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord API ${res.status}: ${text}`)
  }
}
