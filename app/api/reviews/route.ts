import { grantSemivipRoleAfterHighRatingReview } from "@/lib/discord/grant-semivip-after-review"
import { getEnrichedPublicReviews } from "@/lib/reviews/enriched-public-reviews"
import { insertReviewDb } from "@/lib/supabase/review-insert"
import { getUserReviewExists } from "@/lib/supabase/queries"
import { getDiscordUserIdForAuthUser } from "@/lib/permissions-server"
import { getDiscordDisplayNameFromOAuthAccount } from "@/lib/discord/oauth-self-profile"
import { auth } from "@/app/auth"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)))

    const enriched = await getEnrichedPublicReviews(offset, limit)
    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[api/reviews] error:", message)
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message
    return NextResponse.json({ error: safeMessage }, { status: 500 })
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

    const alreadyReviewed = await getUserReviewExists(discordUserId)
    if (alreadyReviewed) {
      return NextResponse.json(
        { error: "You have already submitted a review" },
        { status: 409 },
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
    if (note >= 4) {
      await grantSemivipRoleAfterHighRatingReview(discordUserId)
    }
    const author_name = review.author_name?.trim() || authorDisplayName
    return NextResponse.json({ ...review, author_name }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[api/reviews] POST error:", message)
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
