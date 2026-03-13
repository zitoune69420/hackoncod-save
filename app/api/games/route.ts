import { getDisplayedGames } from "@/lib/supabase/queries"
import { NextResponse } from "next/server"

export async function GET() {
  const games = await getDisplayedGames()

  const tableData = games.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description ?? "",
    steam: g.steam,
    link: g.link,
    client: g.client,
  }))

  return NextResponse.json(tableData)
}
