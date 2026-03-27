import { betterAuth } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { sendLoginDiscordNotification } from "@/lib/discord/login-notify"

/**
 * Origines autorisées pour la vérification CSRF / Origin (Better Auth).
 * Ex. : `https://hackoncod.com,https://www.hackoncod.com`
 * Laisser non défini en local sauf besoin (cross-origin).
 */
function trustedOriginsFromEnv(): string[] | undefined {
  const raw = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim()
  if (!raw) return undefined
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean)
  return list.length ? list : undefined
}

const _trustedOrigins = trustedOriginsFromEnv()

export const auth = betterAuth({
  ...(_trustedOrigins ? { trustedOrigins: _trustedOrigins } : {}),
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
        const { syncUserProfileAfterLogin } = await import(
          "@/lib/auth/sync-app-user"
        )
        await syncUserProfileAfterLogin(
          newSession.user as {
            id: string
            name?: string | null
            email?: string | null
            image?: string | null
          },
        )
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
