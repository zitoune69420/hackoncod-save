import { createAdminClient } from "./admin"
import type { CheatWithGame } from "./types"
import type { Game } from "./types"
import type { Video } from "./types"

export async function getCheatsByGameTitle(gameTitle: string): Promise<CheatWithGame[]> {
  const supabase = createAdminClient()
  console.log("[queries] getCheatsByGameTitle", { gameTitle })

  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("id")
    .eq("title", gameTitle)
    .single()

  console.log("[queries] game lookup:", { game, gameError })

  if (!game) {
    console.log("[queries] no game found for title:", gameTitle)
    return []
  }

  const { data, error } = await supabase
    .from("cheat")
    .select(`
      id, name, game_id, mode, platform, crack, client, extension, link, statut, vip, semi_vip, created_at, updated_at,
      game(title)
    `)
    .eq("game_id", game.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[queries] getCheatsByGameTitle error:", error)
    return []
  }

  console.log("[queries] getCheatsByGameTitle result count:", data?.length ?? 0)
  return (data ?? []) as unknown as CheatWithGame[]
}

export async function getDisplayedGames(): Promise<Game[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("game")
    .select("id, title, description, steam, link, client")
    .eq("displayed", true)
    .order("title")

  if (error) {
    console.error("[queries] getDisplayedGames error:", error)
    return []
  }

  return (data ?? []) as Game[]
}

export async function getVideos(): Promise<Video[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("video")
    .select("id, title, description, image, link, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[queries] getVideos error:", error)
    return []
  }

  return (data ?? []) as Video[]
}
