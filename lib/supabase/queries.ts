import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "./admin";
import type { Cheat, CheatWithGame } from "./types";
import type { Game } from "./types";
import type { Video } from "./types";
import type { Review } from "./types";
import type { BlacklistEntry } from "./types";

const CHEAT_COLUMNS =
  "id, name, game_id, mode, platform, crack, client, extension, link, statut, vip, semi_vip, pinned, created_at, updated_at";

/**
 * Enrichit chaque cheat avec `{ game: { title } | null }` en faisant un second
 * fetch sur la table game (au lieu de l’embed PostgREST `game(title)` qui peut
 * casser silencieusement si la FK n’est pas dans le schema cache PostgREST).
 */
async function attachGameTitles(
  supabase: SupabaseClient,
  cheats: Cheat[],
): Promise<CheatWithGame[]> {
  if (cheats.length === 0) return [];

  const ids = [...new Set(cheats.map((c) => c.game_id).filter((id) => id))];
  if (ids.length === 0) {
    return cheats.map((c) => ({ ...c, game: null }) as CheatWithGame);
  }

  const { data: games, error } = await supabase
    .from("game")
    .select("id, title")
    .in("id", ids);

  if (error) {
    console.error("[queries] attachGameTitles error:", error);
    return cheats.map((c) => ({ ...c, game: null }) as CheatWithGame);
  }

  const titles = new Map<string, string>(
    (games ?? []).map((g) => [g.id as string, (g.title as string) ?? ""]),
  );

  return cheats.map(
    (c) =>
      ({
        ...c,
        game: titles.has(c.game_id) ? { title: titles.get(c.game_id)! } : null,
      }) as CheatWithGame,
  );
}

export async function getSemiVipCheats(): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cheat")
    .select(CHEAT_COLUMNS)
    .eq("semi_vip", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getSemiVipCheats error:", error);
    return [];
  }

  return attachGameTitles(supabase, (data ?? []) as unknown as Cheat[]);
}

export async function getVipCheats(): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cheat")
    .select(CHEAT_COLUMNS)
    .eq("vip", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getVipCheats error:", error);
    return [];
  }

  return attachGameTitles(supabase, (data ?? []) as unknown as Cheat[]);
}

export async function getCheatsByGameTitle(
  gameTitle: string,
): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();

  const { data: game } = await supabase
    .from("game")
    .select("id, title")
    .eq("title", gameTitle)
    .maybeSingle();

  if (!game) return [];

  const { data, error } = await supabase
    .from("cheat")
    .select(CHEAT_COLUMNS)
    .eq("game_id", game.id)
    .eq("vip", false)
    .eq("semi_vip", false)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getCheatsByGameTitle error:", error);
    return [];
  }

  return ((data ?? []) as unknown as Cheat[]).map(
    (c) => ({ ...c, game: { title: game.title as string } }) as CheatWithGame,
  );
}

/** Tous les cheats (admin) — avec titre du jeu lié. */
export async function getAllCheats(): Promise<CheatWithGame[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cheat")
    .select(CHEAT_COLUMNS)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getAllCheats error:", error.message, error.code);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return attachGameTitles(supabase, (data ?? []) as unknown as Cheat[]);
}

/** Tous les jeux (admin) — tableau + listes (id/titre dérivables côté client). */
/** Indique si un jeu avec ce titre exact existe en base (page cheats / suggestions). */
export async function gameExistsByTitle(title: string): Promise<boolean> {
  const trimmed = title.trim();
  if (!trimmed) return false;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game")
    .select("id")
    .eq("title", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[queries] gameExistsByTitle error:", error.message);
    return false;
  }

  return data != null;
}

export async function getAllGamesForAdmin(): Promise<Game[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game")
    .select(
      "id, title, description, image, steam, link, client, displayed, created_at, updated_at",
    )
    .order("title");

  if (error) {
    console.error("[queries] getAllGamesForAdmin error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as Game[];
}

export type GameUpsertRow = {
  title: string;
  description: string | null;
  image: string | null;
  steam: string | null;
  link: string | null;
  client: string | null;
  displayed: boolean;
};

export async function insertGame(row: GameUpsertRow): Promise<{ id: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[queries] insertGame error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return { id: (data as { id: string }).id };
}

export async function updateGame(
  id: string,
  row: Partial<GameUpsertRow>,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("game").update(row).eq("id", id);

  if (error) {
    console.error("[queries] updateGame error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

export async function deleteGame(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("game").delete().eq("id", id);

  if (error) {
    console.error("[queries] deleteGame error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
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
  pinned: boolean;
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

export async function deleteCheat(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("cheat").delete().eq("id", id);

  if (error) {
    console.error("[queries] deleteCheat error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

/** Pour lien signé bucket `mods` (API download exclusive). */
export async function getCheatLinkFlagsById(
  id: string,
): Promise<{ link: string; vip: boolean; semi_vip: boolean } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cheat")
    .select("link, vip, semi_vip")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[queries] getCheatLinkFlagsById error:", error);
    return null;
  }
  if (!data) return null;

  return {
    link: String((data as { link?: unknown }).link ?? ""),
    vip: Boolean((data as { vip?: unknown }).vip),
    semi_vip: Boolean((data as { semi_vip?: unknown }).semi_vip),
  };
}

/** Cheat listé sur le dashboard public (non VIP / semi-VIP) — pour valider un signalement. */
export async function getPublicDashboardCheatForReport(
  cheatId: string,
): Promise<{ id: string; name: string; gameTitle: string } | null> {
  const id = cheatId.trim();
  if (!id) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cheat")
    .select("id, name, game_id, vip, semi_vip")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    name: string;
    game_id: string;
    vip?: boolean;
    semi_vip?: boolean;
  };

  if (row.vip || row.semi_vip) return null;

  const name = String(row.name ?? "").trim();
  if (!name || !row.game_id) return null;

  const { data: game } = await supabase
    .from("game")
    .select("title")
    .eq("id", row.game_id)
    .maybeSingle();

  const gameTitle = (game?.title as string | undefined)?.trim() ?? "";
  if (!gameTitle) return null;

  return { id: row.id, name, gameTitle };
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

/** Toutes les vidéos (admin). */
export async function getAllVideosForAdmin(): Promise<Video[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("video")
    .select("id, title, description, image, link, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getAllVideosForAdmin error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as Video[];
}

export type VideoUpsertRow = {
  title: string;
  description: string | null;
  image: string | null;
  link: string | null;
};

export async function insertVideo(row: VideoUpsertRow): Promise<{ id: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("video")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[queries] insertVideo error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return { id: (data as { id: string }).id };
}

export async function updateVideo(
  id: string,
  row: Partial<VideoUpsertRow>,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("video").update(row).eq("id", id);

  if (error) {
    console.error("[queries] updateVideo error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

export async function deleteVideo(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("video").delete().eq("id", id);

  if (error) {
    console.error("[queries] deleteVideo error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

const REVIEWS_PAGE_SIZE = 12;

export async function getUserReviewExists(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("review")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data != null;
}

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

const ADMIN_REVIEWS_LIMIT = 5000;

/** Tous les avis (admin), du plus récent au plus ancien. */
export async function getAllReviewsForAdmin(): Promise<Review[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("review")
    .select("id, user_id, message, note, author_name, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(ADMIN_REVIEWS_LIMIT);

  if (error) {
    console.error("[queries] getAllReviewsForAdmin error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as Review[];
}

export type ReviewAdminPatchRow = {
  message?: string;
  note?: number;
  author_name?: string | null;
};

export async function updateReview(
  id: string,
  row: ReviewAdminPatchRow,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("review").update(row).eq("id", id);

  if (error) {
    console.error("[queries] updateReview error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

export async function deleteReview(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("review").delete().eq("id", id);

  if (error) {
    console.error("[queries] deleteReview error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

const ADMIN_BLACKLIST_LIMIT = 5000;

/** Toutes les entrées de la table retard (admin), plus récentes en premier. */
export async function getAllBlacklistForAdmin(): Promise<BlacklistEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("retard")
    .select(
      "id, user_id, discord, reason, added_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_BLACKLIST_LIMIT);

  if (error) {
    console.error("[queries] getAllBlacklistForAdmin error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return (data ?? []) as BlacklistEntry[];
}

export type BlacklistUpsertRow = {
  user_id: string | null;
  discord: string | null;
  reason: string | null;
  added_by: string | null;
};

export async function insertBlacklist(
  row: BlacklistUpsertRow,
): Promise<{ id: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("retard")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[queries] insertBlacklist error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }

  return { id: (data as { id: string }).id };
}

export async function updateBlacklist(
  id: string,
  row: Partial<BlacklistUpsertRow>,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("retard").update(row).eq("id", id);

  if (error) {
    console.error("[queries] updateBlacklist error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}

export async function getBlacklistRowById(
  id: string,
): Promise<BlacklistEntry | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("retard")
    .select(
      "id, user_id, discord, reason, added_by, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[queries] getBlacklistRowById error:", error);
    return null;
  }

  return (data ?? null) as BlacklistEntry | null;
}

export async function deleteBlacklist(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("retard").delete().eq("id", id);

  if (error) {
    console.error("[queries] deleteBlacklist error:", error);
    throw new Error(`Supabase: ${error.message} (${error.code})`);
  }
}
