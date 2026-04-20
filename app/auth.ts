import { betterAuth } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { sendLoginDiscordNotification } from "@/lib/discord/login-notify"

/**
 * Origines autorisées pour la vérification CSRF / Origin (Better Auth).
 * Ex. : `https://hackoncod.com,https://www.hackoncod.com`
 * En plus : `NEXT_PUBLIC_APP_URL` et l’hôte Vercel (`VERCEL_URL`) pour préprod / previews.
 */
function trustedOriginsFromEnv(): string[] | undefined {
  const seen = new Set<string>()
  const add = (value: string | undefined) => {
    const v = value?.trim().replace(/\/$/, "")
    if (v) seen.add(v)
  }
  const raw = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim()
  if (raw) {
    for (const part of raw.split(",")) {
      add(part)
    }
  }
  add(process.env.NEXT_PUBLIC_APP_URL)
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    add(`https://${vercel.replace(/^https?:\/\//, "")}`)
  }
  return seen.size ? [...seen] : undefined
}

const _trustedOrigins = trustedOriginsFromEnv()

function authSecret(): string | undefined {
  const s = process.env.BETTER_AUTH_SECRET?.trim()
  return s || undefined
}

function authBaseURL(): string | undefined {
  const u =
    process.env.BETTER_AUTH_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  const v = u?.replace(/\/$/, "")
  return v || undefined
}

const _authSecret = authSecret()
const _authBaseURL = authBaseURL()

export const auth = betterAuth({
  ...(_authSecret ? { secret: _authSecret } : {}),
  ...(_authBaseURL ? { baseURL: _authBaseURL } : {}),
  ...(_trustedOrigins ? { trustedOrigins: _trustedOrigins } : {}),
  plugins: [nextCookies()],
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path ?? ""
      /* Discord OAuth : chemins type /api/auth/callback/discord */
      if (!path.toLowerCase().includes("callback")) {
        return
      }
      const newSession = ctx.context.newSession
      if (!newSession?.user) {
        return
      }
      try {
        let discordAccountId: string | undefined
        try {
          const accounts = await ctx.context.internalAdapter.findAccounts(
            newSession.user.id,
          )
          const discord = accounts.find(
            (a: { providerId?: string }) => a.providerId === "discord",
          )
          if (discord?.accountId)
            discordAccountId = String(discord.accountId).trim()
        } catch {
          /* ignore */
        }
        const { syncUserProfileAfterLogin } = await import(
          "@/lib/auth/sync-app-user"
        )
        const sync = await syncUserProfileAfterLogin(
          newSession.user as {
            id: string
            name?: string | null
            email?: string | null
            image?: string | null
          },
          {
            discordAccountId:
              discordAccountId && discordAccountId.length > 0
                ? discordAccountId
                : undefined,
          },
        )
        if (sync.ok === false && sync.siteBanned) {
          const { buildSiteBanOAuthResponse } = await import(
            "@/lib/auth/revoke-site-ban-session"
          )
          const response = await buildSiteBanOAuthResponse(
            ctx,
            newSession.user.id,
            sync.reason,
          )
          return { response }
        }
      } catch (err) {
        console.error("[auth] sync-app-user", err)
      }
      void sendLoginDiscordNotification({
        user: newSession.user,
        headers: ctx.headers as Headers,
        authContext: ctx.context,
      }).catch((err) => {
        console.error("[login-notify]", err)
      })
    }),
  },
})
