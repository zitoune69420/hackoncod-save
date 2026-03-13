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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
