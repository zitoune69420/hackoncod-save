import "server-only";

import { fetchAnalyticsDashboardStats } from "@/lib/supabase/analytics";
import type { AdminAnalyticsStatsPayload, AdminStatsModel } from "./admin-stats-types";

export function pctDelta(cur: number, prev: number): number {
  if (prev === 0) {
    return cur === 0 ? 0 : 100;
  }
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export function emptyAnalyticsPayload(): AdminAnalyticsStatsPayload {
  return {
    summary: { pageviews: 0, visitors: 0, bounceRate: 0 },
    series: [],
    paths: [],
    referrers: [],
    hostnames: [],
    countries: [],
    devices: [],
    browsers: [],
    operatingSystems: [],
    utm: [],
  };
}

export async function buildAdminStatsModel(days: number): Promise<AdminStatsModel> {
  const bounded = Math.min(90, Math.max(1, Math.floor(days) || 7));

  const end = new Date();
  const start = new Date(end.getTime() - bounded * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - bounded * 24 * 60 * 60 * 1000);

  const [cur, prev] = await Promise.all([
    fetchAnalyticsDashboardStats(start.toISOString(), end.toISOString()),
    fetchAnalyticsDashboardStats(prevStart.toISOString(), prevEnd.toISOString()),
  ]);

  if (!cur) {
    return {
      ok: false,
      hint: "Run sql/analytics_page_views.sql in Supabase (RPC analytics_dashboard_stats).",
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: bounded,
      },
      current: emptyAnalyticsPayload(),
      previous: emptyAnalyticsPayload(),
      deltas: {
        visitorsPct: 0,
        pageviewsPct: 0,
        bounceRatePct: 0,
      },
    };
  }

  const empty = emptyAnalyticsPayload();
  const prevSafe = prev ?? empty;

  const deltas = {
    visitorsPct: pctDelta(cur.summary.visitors, prevSafe.summary.visitors),
    pageviewsPct: pctDelta(cur.summary.pageviews, prevSafe.summary.pageviews),
    bounceRatePct: pctDelta(cur.summary.bounceRate, prevSafe.summary.bounceRate),
  };

  return {
    ok: true,
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      days: bounded,
    },
    current: cur,
    previous: prevSafe,
    deltas,
  };
}
