import { getReviews } from "@/lib/supabase/queries"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)))

    const reviews = await getReviews(offset, limit)
    return NextResponse.json(reviews, {
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
