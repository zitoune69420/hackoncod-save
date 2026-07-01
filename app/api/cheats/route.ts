import { getCheatsByGameTitle } from "@/lib/supabase/queries"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const game = new URL(request.url).searchParams.get("game")
  if (!game) return NextResponse.json([], { status: 400 })

  const cheats = await getCheatsByGameTitle(game)

  const tableData = cheats.map((c) => ({
    id: c.id,
    name: c.name,
    mode: c.mode,
    extension: c.extension,
    crack: c.crack,
    client: c.client,
    hasFile: Boolean(String(c.link ?? "").trim()),
  }))

  return NextResponse.json(tableData)
}
