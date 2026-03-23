import { decryptOAuthToken } from "better-auth/oauth2"
import type { AuthContext } from "@better-auth/core"
import { DISCORD_API_BASE } from "./discord-rest"
import { buildLoginConnectionEmbed, type LoginEmbedDiscordExtras } from "./login-embed"
import { executeDiscordWebhook } from "./webhook"

function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("true-client-ip") ??
    "unknown"
  )
}

type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  emailVerified?: boolean | null
}

/**
 * Récupère le profil Discord via le token OAuth stocké sur le compte lié.
 */
async function fetchDiscordProfileForUser(
  authContext: AuthContext,
  userId: string,
  sessionUser: SessionUser,
): Promise<LoginEmbedDiscordExtras> {
  const base: LoginEmbedDiscordExtras = {
    discordUserId: null,
    emailVerified: sessionUser.emailVerified ?? null,
  }

  try {
    const accounts = await authContext.internalAdapter.findAccounts(userId)
    const discordAcc = accounts.find((a) => a.providerId === "discord")
    if (!discordAcc?.accessToken) {
      return {
        ...base,
        discordUserId: discordAcc?.accountId ?? null,
      }
    }

    const accessToken = await decryptOAuthToken(discordAcc.accessToken, authContext)
    if (!accessToken) {
      return { ...base, discordUserId: discordAcc.accountId }
    }

    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return { ...base, discordUserId: discordAcc.accountId }
    }

    const d = (await res.json()) as {
      id: string
      username: string
      global_name?: string | null
      discriminator?: string
      avatar?: string | null
      verified?: boolean
      mfa_enabled?: boolean
      locale?: string
      email?: string
      flags?: number
      premium_type?: number | null
      public_flags?: number
      banner?: string | null
    }

    return {
      discordUserId: d.id,
      locale: d.locale ?? null,
      verified: d.verified ?? null,
      mfaEnabled: d.mfa_enabled ?? null,
      twoFactor: d.mfa_enabled ?? null,
      emailVerified: d.verified ?? sessionUser.emailVerified ?? null,
      premiumType: d.premium_type ?? null,
      premiumSince: null,
      guildPremiumSince: null,
      flags: d.flags ?? d.public_flags ?? null,
      globalName: d.global_name ?? d.username ?? null,
      displayName: d.global_name ?? null,
      pronouns: null,
      theme: null,
      phone: null,
      nsfwAllowed: null,
      contentFilter: null,
      hasBanner: Boolean(d.banner),
      guildCount: null,
      ownedGuildCount: null,
    }
  } catch {
    return base
  }
}

/**
 * Envoie le webhook « nouvelle connexion » (config DISCORD_WEBHOOK_LOGIN_URL).
 */
export async function sendLoginDiscordNotification(options: {
  user: SessionUser
  headers: Headers
  authContext: AuthContext
}): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_LOGIN_URL
  if (!webhookUrl?.trim()) {
    return
  }

  const ip = getClientIp(options.headers)
  const ua = options.headers.get("user-agent") ?? "unknown"
  const connectedAt = new Date()

  const discord = await fetchDiscordProfileForUser(
    options.authContext,
    options.user.id,
    options.user,
  )

  const bannerUrl = process.env.DISCORD_LOGIN_EMBED_BANNER_URL?.trim() || null

  const embed = buildLoginConnectionEmbed(
    {
      id: options.user.id,
      name: options.user.name,
      email: options.user.email,
      image: options.user.image,
    },
    { ip, userAgent: ua, connectedAt },
    discord,
    { bannerImageUrl: bannerUrl },
  )

  await executeDiscordWebhook(webhookUrl, { embeds: [embed] })
}
