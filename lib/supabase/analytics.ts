import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_PAGE_VIEWS_TABLE } from "@/lib/analytics/table";

export type AnalyticsPageViewInsert = {
  path: string;
  hostname: string | null;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  device_type: string;
  browser: string;
  os: string;
  visitor_id: string;
  session_id: string;
};

export async function insertAnalyticsPageView(
  row: AnalyticsPageViewInsert,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(ANALYTICS_PAGE_VIEWS_TABLE).insert({
      path: row.path,
      hostname: row.hostname,
      referrer: row.referrer,
      referrer_host: row.referrer_host,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      country_code: row.country_code,
      device_type: row.device_type,
      browser: row.browser,
      os: row.os,
      visitor_id: row.visitor_id,
      session_id: row.session_id,
    });
    if (error) {
      console.error("[analytics] insert", error.message);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analytics] insert", e);
    return { ok: false, message: msg };
  }
}

export type AnalyticsDashboardPayload = {
  summary: { pageviews: number; visitors: number; bounceRate: number };
  series: Array<{
    sortKey: number;
    label: string;
    pageviews: number;
    visitors: number;
  }>;
  paths: Array<{ path: string; visitors: number }>;
  referrers: Array<{ host: string; visitors: number }>;
  hostnames: Array<{ host: string; visitors: number }>;
  countries: Array<{ code: string; visitors: number; pct: number }>;
  devices: Array<{ device: string; visitors: number; pct: number }>;
  browsers: Array<{ browser: string; visitors: number; pct: number }>;
  operatingSystems: Array<{ os: string; visitors: number; pct: number }>;
  utm: Array<{ label: string; visitors: number }>;
};

export async function fetchAnalyticsDashboardStats(
  pStart: string,
  pEnd: string,
): Promise<AnalyticsDashboardPayload | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("analytics_dashboard_stats", {
      p_start: pStart,
      p_end: pEnd,
    });
    if (error) {
      console.error("[analytics] rpc", error.message);
      return null;
    }
    if (data == null) {
      return null;
    }
    const d = data as Record<string, unknown>;
    return {
      summary: (d.summary ?? {}) as AnalyticsDashboardPayload["summary"],
      series: (d.series ?? []) as AnalyticsDashboardPayload["series"],
      paths: (d.paths ?? []) as AnalyticsDashboardPayload["paths"],
      referrers: (d.referrers ?? []) as AnalyticsDashboardPayload["referrers"],
      hostnames: (d.hostnames ?? []) as AnalyticsDashboardPayload["hostnames"],
      countries: (d.countries ?? []) as AnalyticsDashboardPayload["countries"],
      devices: (d.devices ?? []) as AnalyticsDashboardPayload["devices"],
      browsers: (d.browsers ?? []) as AnalyticsDashboardPayload["browsers"],
      operatingSystems: (d.operatingSystems ??
        []) as AnalyticsDashboardPayload["operatingSystems"],
      utm: (d.utm ?? []) as AnalyticsDashboardPayload["utm"],
    };
  } catch (e) {
    console.error("[analytics] fetchAnalyticsDashboardStats", e);
    return null;
  }
}
