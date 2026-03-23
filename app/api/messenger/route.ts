import { NextResponse } from "next/server"
import type { DiscordApiEmbed } from "@/lib/discord/webhook"
import { executeDiscordWebhook } from "@/lib/discord/webhook"
import { sendDirectMessageEmbed } from "@/lib/discord/dm"
import { buildLoginConnectionEmbed } from "@/lib/discord/login-embed"

export const runtime = "nodejs"

type MessengerBody =
  | {
      type: "webhook"
      webhookUrl?: string
      embeds: DiscordApiEmbed[]
      content?: string
    }
  | {
      type: "webhook"
      template: "login"
      payload: {
        user: {
          id: string
          name?: string | null
          email?: string | null
          image?: string | null
        }
        request: {
          ip: string
          userAgent: string
          connectedAt: string
        }
        discord?: Record<string, unknown>
      }
    }
  | {
      type: "dm"
      recipientId: string
      embeds: DiscordApiEmbed[]
    }

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function POST(req: Request) {
  const secret = process.env.MESSENGER_API_SECRET
  if (!secret) {
    return NextResponse.json({ error: "MESSENGER_API_SECRET not configured" }, { status: 503 })
  }

  const auth = req.headers.get("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (token !== secret) {
    return unauthorized()
  }

  let body: MessengerBody
  try {
    body = (await req.json()) as MessengerBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    if (body.type === "webhook") {
      if ("template" in body && body.template === "login") {
        const url = process.env.DISCORD_WEBHOOK_LOGIN_URL
        if (!url) {
          return NextResponse.json({ error: "DISCORD_WEBHOOK_LOGIN_URL not set" }, { status: 503 })
        }
        const connectedAt = new Date(body.payload.request.connectedAt)
        const embed = buildLoginConnectionEmbed(
          body.payload.user,
          {
            ip: body.payload.request.ip,
            userAgent: body.payload.request.userAgent,
            connectedAt: Number.isNaN(connectedAt.getTime()) ? new Date() : connectedAt,
          },
          (body.payload.discord ?? {}) as Parameters<typeof buildLoginConnectionEmbed>[2],
          { bannerImageUrl: process.env.DISCORD_LOGIN_EMBED_BANNER_URL ?? null },
        )
        await executeDiscordWebhook(url, { embeds: [embed] })
        return NextResponse.json({ ok: true })
      }

      const raw = body as Extract<MessengerBody, { type: "webhook"; embeds: DiscordApiEmbed[] }>
      const webhookUrl = raw.webhookUrl
      if (!webhookUrl?.trim()) {
        return NextResponse.json({ error: "webhookUrl required" }, { status: 400 })
      }
      if (!raw.embeds?.length) {
        return NextResponse.json({ error: "embeds required" }, { status: 400 })
      }
      await executeDiscordWebhook(webhookUrl, {
        content: raw.content,
        embeds: raw.embeds,
      })
      return NextResponse.json({ ok: true })
    }

    if (body.type === "dm") {
      if (!body.recipientId?.trim()) {
        return NextResponse.json({ error: "recipientId required" }, { status: 400 })
      }
      if (!body.embeds?.length) {
        return NextResponse.json({ error: "embeds required" }, { status: 400 })
      }
      await sendDirectMessageEmbed(body.recipientId, body.embeds)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error("[messenger]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
