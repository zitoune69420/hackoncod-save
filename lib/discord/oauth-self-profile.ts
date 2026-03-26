import "server-only"

import type { AuthContext } from "@better-auth/core"
import { decryptOAuthToken } from "better-auth/oauth2"
import { auth } from "@/app/auth"
import { DISCORD_API_BASE } from "./discord-rest"

/**
 * Pseudo affiché Discord pour l’utilisateur connecté (token OAuth), sans API bot.
 */
export async function getDiscordDisplayNameFromOAuthAccount(
  authUserId: string,
): Promise<string | null> {
  try {
    const context = await auth.$context
    const accounts = await context.internalAdapter.findAccounts(authUserId)
    const discord = accounts.find((a) => a.providerId === "discord")
    if (!discord?.accessToken) return null

    const token = await decryptOAuthToken(
      discord.accessToken,
      context as AuthContext,
    )
    if (!token) return null

    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null

    const d = (await res.json()) as {
      global_name?: string | null
      username?: string
      discriminator?: string
    }
    const global = d.global_name?.trim()
    if (global) return global
    const un = d.username?.trim()
    if (!un) return null
    const disc = d.discriminator
    if (disc && disc !== "0") return `${un}#${disc}`
    return un
  } catch {
    return null
  }
}
