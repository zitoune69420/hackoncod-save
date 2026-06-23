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

  if (!cur.payload) {
    return {
      ok: false,
      hint:
        `RPC cheat_download_stats unavailable — ${cur.error ?? "unknown error"}. ` +
        "Check the migration ran on this database and reload the PostgREST schema cache (NOTIFY pgrst, 'reload schema').",
      range,
      current: emptyDownloadStatsPayload(),
      deltas: { downloadsPct: 0, uniqueCheatsPct: 0, uniqueGamesPct: 0 },
    };
  }

  const curSafe = cur.payload;
  const prevSafe = prev.payload ?? emptyDownloadStatsPayload();
  return {
    ok: true,
    range,
    current: curSafe,
    deltas: {
      downloadsPct: pctDelta(
        curSafe.summary.downloads,
        prevSafe.summary.downloads,
      ),
      uniqueCheatsPct: pctDelta(
        curSafe.summary.uniqueCheats,
        prevSafe.summary.uniqueCheats,
      ),
      uniqueGamesPct: pctDelta(
        curSafe.summary.uniqueGames,
        prevSafe.summary.uniqueGames,
      ),
    },
  };
}
