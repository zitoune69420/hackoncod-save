import { betterAuth } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { sendLoginDiscordNotification } from "@/lib/discord/login-notify"

export const auth = betterAuth({
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path ?? ""
      if (!path.includes("/callback/")) {
        return
      }
      const newSession = ctx.context.newSession
      if (!newSession?.user) {
        return
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
