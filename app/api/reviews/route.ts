import { getReviews } from "@/lib/supabase/queries"
import { insertReviewDb } from "@/lib/supabase/review-insert"
import { getDiscordUserIdForAuthUser } from "@/lib/permissions-server"
import {
  getDiscordDisplayNamesForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display"
import { getDiscordDisplayNameFromOAuthAccount } from "@/lib/discord/oauth-self-profile"
import { auth } from "@/app/auth"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)))

    const reviews = await getReviews(offset, limit)
    const discordIds = reviews
      .map((r) => r.user_id)
      .filter((id): id is string => Boolean(id && String(id).trim()))
    const missingNames = reviews.filter(
      (r) => !r.author_name?.trim() && r.user_id?.trim(),
    )
    const idsForDiscord = missingNames.map((r) => r.user_id)
    const displayNames = await getDiscordDisplayNamesForUserIds(idsForDiscord)
    const enriched = reviews.map((r) => {
      const fromDb = r.author_name?.trim() || null
      if (fromDb) return { ...r, author_name: fromDb }
      const key = normalizeDiscordUserIdForLookup(r.user_id)
      const fromApi = key ? displayNames.get(key) ?? null : null
      return { ...r, author_name: fromApi }
    })
    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[api/reviews] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const user = session?.user
    const authUserId = user?.id
    if (!authUserId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { message?: unknown; note?: unknown }
    const message =
      typeof body.message === "string" ? body.message.trim() : ""
    const noteRaw = body.note
    const note =
      typeof noteRaw === "number"
        ? noteRaw
        : typeof noteRaw === "string"
          ? Number.parseInt(noteRaw, 10)
          : NaN

    if (message.length < 3) {
      return NextResponse.json(
        { error: "Message too short (min 3 characters)" },
        { status: 400 },
      )
    }
    if (message.length > 4000) {
      return NextResponse.json(
        { error: "Message too long" },
        { status: 400 },
      )
    }
    if (!Number.isInteger(note) || note < 1 || note > 5) {
      return NextResponse.json(
        { error: "Note must be an integer between 1 and 5" },
        { status: 400 },
      )
    }

    const discordUserId = await getDiscordUserIdForAuthUser(
      authUserId,
      user.image,
    )
    if (!discordUserId) {
      return NextResponse.json(
        {
          error:
            "Could not resolve Discord user id. Ensure you signed in with Discord.",
        },
        { status: 400 },
      )
    }

    let authorDisplayName = user.name?.trim() || null
    if (!authorDisplayName) {
      authorDisplayName = await getDiscordDisplayNameFromOAuthAccount(authUserId)
    }

    const review = await insertReviewDb(
      discordUserId,
      message,
      note,
      authorDisplayName,
    )
    const author_name = review.author_name?.trim() || authorDisplayName
    return NextResponse.json({ ...review, author_name }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[api/reviews] POST error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
