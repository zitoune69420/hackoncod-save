import type {
  PerfDevice,
  PerfEnv,
  PerformanceViewModel,
  ScoreBucket,
} from "./types";

function bucket(score: number): ScoreBucket {
  if (score < 50) return "poor";
  if (score < 90) return "needs_improvement";
  return "great";
}

/** Données de démo (remplacer par une vraie source CrUX / RUM plus tard). */
export function getPerformanceViewModel(
  device: PerfDevice,
  env: PerfEnv,
  days: 7 | 30,
): PerformanceViewModel {
  const mobileNudge = device === "mobile" ? -4 : 0;
  const stagingNudge = env === "staging" ? -6 : 0;
  const res = Math.min(
    100,
    Math.max(40, 92 + mobileNudge + stagingNudge + (days === 30 ? -1 : 0)),
  );

  const chartLabels =
    days === 30
      ? ["Feb 26", "Mar 1", "Mar 4", "Mar 8", "Mar 12", "Mar 18", "Mar 26"]
      : ["Mar 20", "Mar 21", "Mar 22", "Mar 23", "Mar 24", "Mar 25", "Mar 26"];

  const base = res - 8;
  const p75 = chartLabels.map((_, i) =>
    Math.min(100, Math.round(base + i * 1.2 + (i % 3) * 2)),
  );
  const p90 = p75.map((v, i) => Math.min(100, v + 4 + (i % 3)));
  const p95 = p90.map((v) => Math.min(100, v + 5));
  const p99 = p95.map((v) => Math.min(100, v + 6));

  const cwv: PerformanceViewModel["cwv"] = [
    {
      id: "fcp",
      title: "First Contentful Paint",
      valueDisplay: `${(1.8 + mobileNudge * 0.02).toFixed(2)} s`,
      scorePosition: Math.min(95, 78 + mobileNudge),
      bucket: bucket(78 + mobileNudge),
    },
    {
      id: "lcp",
      title: "Largest Contentful Paint",
      valueDisplay: `${(2.13 + mobileNudge * 0.03).toFixed(2)} s`,
      scorePosition: Math.min(95, 72 + mobileNudge),
      bucket: bucket(72 + mobileNudge),
    },
    {
      id: "inp",
      title: "Interaction to Next Paint",
      valueDisplay: `${56 + mobileNudge * 2} ms`,
      scorePosition: Math.min(95, 88 + mobileNudge),
      bucket: "great",
    },
    {
      id: "cls",
      title: "Cumulative Layout Shift",
      valueDisplay: (0.04 + mobileNudge * 0.002).toFixed(2),
      scorePosition: Math.min(95, 85 + mobileNudge),
      bucket: "great",
    },
    {
      id: "fid",
      title: "First Input Delay",
      valueDisplay: `${42 + mobileNudge * 2} ms`,
      scorePosition: Math.min(95, 90 + mobileNudge),
      bucket: "great",
    },
    {
      id: "ttfb",
      title: "Time to First Byte",
      valueDisplay: `${320 + mobileNudge * 10} ms`,
      scorePosition: Math.min(95, 68 + mobileNudge),
      bucket: bucket(68 + mobileNudge),
    },
  ];

  return {
    device,
    env,
    days,
    realExperienceScore: res,
    scoreHeadline: res >= 90 ? "Great" : res >= 50 ? "Needs improvement" : "Poor",
    scoreSub: res >= 90 ? "Above 90" : res >= 50 ? "Between 50 and 90" : "Below 50",
    scoreDescription:
      res >= 90
        ? "More than 75% of visits had a great experience."
        : "A significant share of visits can be improved. Focus on LCP and CLS.",
    dataPoints: days === 30 ? 12420 : 2998,
    cwv,
    chart: {
      labels: chartLabels,
      p75,
      p90,
      p95,
      p99,
    },
    routes: {
      poor: [],
      needsImprovement: [
        { path: "/", visits: 1400, score: 72 },
        { path: "/pricing", visits: 620, score: 68 },
      ],
      great: [
        { path: "/dashboard", visits: 2100, score: 100 },
        { path: "/404", visits: 890, score: 96 },
        { path: "/docs", visits: 450, score: 94 },
      ],
    },
    countries: [
      { code: "US", name: "United States", visits: 1200, score: 76, lat: 37.09, lng: -95.71 },
      { code: "KW", name: "Kuwait", visits: 210, score: 62, lat: 29.31, lng: 47.48 },
      { code: "AU", name: "Australia", visits: 340, score: 81, lat: -25.27, lng: 133.78 },
      { code: "DE", name: "Germany", visits: 280, score: 92, lat: 51.16, lng: 10.45 },
      { code: "FR", name: "France", visits: 410, score: 95, lat: 46.23, lng: 2.21 },
      { code: "BR", name: "Brazil", visits: 190, score: 71, lat: -14.24, lng: -51.93 },
      { code: "GB", name: "United Kingdom", visits: 520, score: 88, lat: 55.38, lng: -3.44 },
    ],
  };
}
