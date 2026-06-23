import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CheatDownloadChannel = "public" | "vip" | "semivip";

export type RecordCheatDownloadInput = {
  cheatId: string;
  channel: CheatDownloadChannel;
  countryCode?: string | null;
  deviceType?: string | null;
};

/**
 * Enregistre un téléchargement de cheat (stats admin). Best-effort : ne jette jamais,
 * les erreurs (table absente en dev, etc.) sont avalées pour ne pas casser le download.
 * On capture des snapshots (nom du cheat, jeu, mode, plateforme) pour garder des stats
 * exactes même si le cheat/jeu est ensuite modifié ou supprimé.
 */
export async function recordCheatDownloadEvent(
  input: RecordCheatDownloadInput,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: cheat } = await supabase
      .from("cheat")
      .select("name, game_id, mode, platform")
      .eq("id", input.cheatId)
      .maybeSingle();

    if (!cheat) return;

    const gameId = (cheat as { game_id?: unknown }).game_id;
    let gameTitle: string | null = null;
    if (typeof gameId === "string" && gameId) {
      const { data: game } = await supabase
        .from("game")
        .select("title")
        .eq("id", gameId)
        .maybeSingle();
      gameTitle = (game as { title?: string } | null)?.title ?? null;
    }

    const { error } = await supabase.from("cheat_download_events").insert({
      cheat_id: input.cheatId,
      channel: input.channel,
      cheat_name: (cheat as { name?: string }).name ?? null,
      game_id: typeof gameId === "string" && gameId ? gameId : null,
      game_title: gameTitle,
      mode: (cheat as { mode?: string }).mode ?? null,
      platform: (cheat as { platform?: string }).platform ?? null,
      country_code: input.countryCode ?? null,
      device_type: input.deviceType ?? null,
    });

    if (error) {
      console.error("[download-events] insert", error.message);
    }
  } catch (e) {
    console.error("[download-events] record", e);
  }
}

export type DownloadStatsPayload = {
  summary: { downloads: number; uniqueCheats: number; uniqueGames: number };
  byChannel: Array<{ channel: string; downloads: number; pct: number }>;
  series: Array<{ sortKey: number; label: string; downloads: number }>;
  topCheats: Array<{
    cheatId: string;
    name: string;
    gameTitle: string;
    downloads: number;
  }>;
  topGames: Array<{ gameId: string; title: string; downloads: number }>;
  topModes: Array<{ mode: string; downloads: number }>;
  countries: Array<{ code: string; downloads: number; pct: number }>;
};

export function emptyDownloadStatsPayload(): DownloadStatsPayload {
  return {
    summary: { downloads: 0, uniqueCheats: 0, uniqueGames: 0 },
    byChannel: [],
    series: [],
    topCheats: [],
    topGames: [],
    topModes: [],
    countries: [],
  };
}

export async function fetchCheatDownloadStats(
  pStart: string,
  pEnd: string,
  limit = 25,
): Promise<{ payload: DownloadStatsPayload | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("cheat_download_stats", {
      p_start: pStart,
      p_end: pEnd,
      p_limit: limit,
    });
    if (error) {
      console.error("[download-events] rpc", error.message);
      return { payload: null, error: error.message };
    }
    if (data == null) {
      return { payload: null, error: "RPC returned no data" };
    }
    const d = data as Record<string, unknown>;
    const empty = emptyDownloadStatsPayload();
    return {
      payload: {
        summary: (d.summary ?? empty.summary) as DownloadStatsPayload["summary"],
        byChannel: (d.byChannel ?? []) as DownloadStatsPayload["byChannel"],
        series: (d.series ?? []) as DownloadStatsPayload["series"],
        topCheats: (d.topCheats ?? []) as DownloadStatsPayload["topCheats"],
        topGames: (d.topGames ?? []) as DownloadStatsPayload["topGames"],
        topModes: (d.topModes ?? []) as DownloadStatsPayload["topModes"],
        countries: (d.countries ?? []) as DownloadStatsPayload["countries"],
      },
      error: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[download-events] fetchCheatDownloadStats", e);
    return { payload: null, error: msg };
  }
}
