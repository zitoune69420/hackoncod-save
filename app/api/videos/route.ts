import { getVideos } from "@/lib/supabase/queries"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const videos = await getVideos()

    const data = videos.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description ?? "",
      image: v.image,
      link: v.link,
    }))

    return NextResponse.json(data)
  } catch (err) {
    console.error("[api/videos] error", err)
    const message = err instanceof Error ? err.message : String(err)
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
