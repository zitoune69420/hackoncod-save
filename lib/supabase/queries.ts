import { createAdminClient } from "./admin";
import type { CheatWithGame } from "./types";
import type { Game } from "./types";
import type { Video } from "./types";
import type { Review } from "./types";

export async function getSemiVipCheats(): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();
  console.log("[queries] getSemiVipCheats");

  const { data, error } = await supabase
    .from("cheat")
    .select(
      `
      id, name, game_id, mode, platform, crack, client, extension, link, statut, vip, semi_vip, created_at, updated_at,
      game(title)
    `,
    )
    .eq("semi_vip", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getSemiVipCheats error:", error);
    return [];
  }

  console.log("[queries] getSemiVipCheats result count:", data?.length ?? 0);
  return (data ?? []) as unknown as CheatWithGame[];
}

export async function getVipCheats(): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();
  console.log("[queries] getVipCheats");

  const { data, error } = await supabase
    .from("cheat")
    .select(
      `
      id, name, game_id, mode, platform, crack, client, extension, link, statut, vip, semi_vip, created_at, updated_at,
      game(title)
    `,
    )
    .eq("vip", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getVipCheats error:", error);
    return [];
  }

  console.log("[queries] getVipCheats result count:", data?.length ?? 0);
  return (data ?? []) as unknown as CheatWithGame[];
}

export async function getCheatsByGameTitle(
  gameTitle: string,
): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();
  console.log("[queries] getCheatsByGameTitle", { gameTitle });

  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("id")
    .eq("title", gameTitle)
    .single();

  console.log("[queries] game lookup:", { game, gameError });

  if (!game) {
    console.log("[queries] no game found for title:", gameTitle);
    return [];
  }

  const { data, error } = await supabase
    .from("cheat")
    .select(
      `
      id, name, game_id, mode, platform, crack, client, extension, link, statut, vip, semi_vip, created_at, updated_at,
      game(title)
    `,
    )
    .eq("game_id", game.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getCheatsByGameTitle error:", error);
    return [];
  }

  console.log(
    "[queries] getCheatsByGameTitle result count:",
    data?.length ?? 0,
  );
  return (data ?? []) as unknown as CheatWithGame[];
}

/** Tous les cheats (admin) — avec titre du jeu lié. */
export async function getAllCheats(): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cheat")
    .select(
      `
      id, name, game_id, mode, platform, crack, client, extension, link, statut, vip, semi_vip, created_at, updated_at,
      game(title)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getAllCheats error:", error.message, error.code);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as unknown as CheatWithGame[];
}

/** Tous les jeux (admin) — pour listes déroulantes sans filtre `displayed`. */
export async function getAllGamesForAdmin(): Promise<
  Pick<Game, "id" | "title">[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game")
    .select("id, title")
    .order("title");

  if (error) {
    console.error("[queries] getAllGamesForAdmin error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as Pick<Game, "id" | "title">[];
}

export type CheatInsertRow = {
  game_id: string;
  name: string;
  mode: string;
  platform: string;
  extension: string;
  crack: boolean;
  client: string;
  link: string;
  statut: string;
  vip: boolean;
  semi_vip: boolean;
};

export async function insertCheat(row: CheatInsertRow): Promise<{ id: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cheat")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[queries] insertCheat error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return { id: (data as { id: string }).id };
}

export async function updateCheat(
  id: string,
  row: Partial<CheatInsertRow>,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("cheat").update(row).eq("id", id);

  if (error) {
    console.error("[queries] updateCheat error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

export async function getDisplayedGames(): Promise<Game[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game")
    .select("id, title, description, steam, link, client")
    .eq("displayed", true)
    .order("title");

  if (error) {
    console.error("[queries] getDisplayedGames error:", error);
    return [];
  }

  return (data ?? []) as Game[];
}

export async function getVideos(): Promise<Video[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("video")
    .select("id, title, description, image, link, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getVideos error:", error);
    return [];
  }

  return (data ?? []) as Video[];
}

const REVIEWS_PAGE_SIZE = 12;

export async function getReviews(
  offset = 0,
  limit = REVIEWS_PAGE_SIZE,
): Promise<Review[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("review")
    .select("id, user_id, message, note, author_name, created_at, updated_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(
      "[queries] getReviews error:",
      error.message,
      error.code,
      error.details,
    );
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as Review[];
}
