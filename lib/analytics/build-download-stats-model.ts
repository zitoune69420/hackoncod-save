import "server-only";

import {
  emptyDownloadStatsPayload,
  fetchCheatDownloadStats,
  type DownloadStatsPayload,
} from "@/lib/supabase/download-events";
import { pctDelta } from "@/lib/analytics/build-admin-stats-model";

export type DownloadStatsModel = {
  ok: boolean;
  hint?: string;
  current: DownloadStatsPayload;
  deltas: { downloadsPct: number; uniqueCheatsPct: number; uniqueGamesPct: number };
  range: { start: string; end: string; days: number };
};

export async function buildDownloadStatsModel(
  days: number,
): Promise<DownloadStatsModel> {
  const bounded = Math.min(90, Math.max(1, Math.floor(days) || 7));

  const end = new Date();
  const start = new Date(end.getTime() - bounded * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - bounded * 24 * 60 * 60 * 1000);

  const [cur, prev] = await Promise.all([
    fetchCheatDownloadStats(start.toISOString(), end.toISOString()),
    fetchCheatDownloadStats(prevStart.toISOString(), prevEnd.toISOString()),
  ]);

  const range = { start: start.toISOString(), end: end.toISOString(), days: bounded };

  if (!cur) {
    return {
      ok: false,
      hint: "Run supabase/migrations/20260623120000_cheat_download_events.sql in Supabase (RPC cheat_download_stats).",
      range,
      current: emptyDownloadStatsPayload(),
      deltas: { downloadsPct: 0, uniqueCheatsPct: 0, uniqueGamesPct: 0 },
    };
  }

  const prevSafe = prev ?? emptyDownloadStatsPayload();
  return {
    ok: true,
    range,
    current: cur,
    deltas: {
      downloadsPct: pctDelta(cur.summary.downloads, prevSafe.summary.downloads),
      uniqueCheatsPct: pctDelta(
        cur.summary.uniqueCheats,
        prevSafe.summary.uniqueCheats,
      ),
      uniqueGamesPct: pctDelta(
        cur.summary.uniqueGames,
        prevSafe.summary.uniqueGames,
      ),
    },
  };
}
