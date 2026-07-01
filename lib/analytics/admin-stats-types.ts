/** JSON shape returned by `/api/analytics/stats` and built server-side for RSC. */

export type AdminAnalyticsStatsPayload = {
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

export type AdminStatsModel = {
  ok: boolean;
  hint?: string;
  current: AdminAnalyticsStatsPayload;
  previous: AdminAnalyticsStatsPayload;
  deltas: {
    visitorsPct: number;
    pageviewsPct: number;
    bounceRatePct: number;
  };
  range: { start: string; end: string; days: number };
};
