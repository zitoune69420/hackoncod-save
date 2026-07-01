import "server-only";

import { fetchPageSpeedInsightsJson } from "@/lib/pagespeed/insights";
import { getPerformanceViewModel } from "@/lib/performance/demo-model";
import type {
  CwvMetric,
  PerfDevice,
  PerfEnv,
  PerformanceViewModel,
  ScoreBucket,
} from "@/lib/performance/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function categoryToBucket(
  cat: string | undefined,
): ScoreBucket | null {
  if (!cat) return null;
  const u = cat.toUpperCase();
  if (u === "FAST") return "great";
  if (u === "AVERAGE") return "needs_improvement";
  if (u === "SLOW") return "poor";
  return null;
}

function categoryToPosition(cat: string | undefined): number | null {
  const b = categoryToBucket(cat);
  if (b === "great") return 88;
  if (b === "needs_improvement") return 62;
  if (b === "poor") return 32;
  return null;
}

function bucketFromScore(score: number): ScoreBucket {
  if (score < 50) return "poor";
  if (score < 90) return "needs_improvement";
  return "great";
}

function formatTimeMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

/** CrUX stocke souvent le CLS × 100 (entier). */
function formatClsPercentile(p: number): string {
  if (!Number.isFinite(p)) return "—";
  const v = p > 25 ? p / 100 : p;
  return v.toFixed(2);
}

const CRUX_FCP = "FIRST_CONTENTFUL_PAINT_MS";
const CRUX_LCP = "LARGEST_CONTENTFUL_PAINT_MS";
const CRUX_INP = "INTERACTION_TO_NEXT_PAINT";
const CRUX_CLS = "CUMULATIVE_LAYOUT_SHIFT_SCORE";
const CRUX_FID = "FIRST_INPUT_DELAY_MS";
const CRUX_TTFB = "EXPERIMENTAL_TIME_TO_FIRST_BYTE";

const AUDITS: Record<string, string> = {
  fcp: "first-contentful-paint",
  lcp: "largest-contentful-paint",
  inp: "interaction-to-next-paint",
  cls: "cumulative-layout-shift",
  fid: "first-input-delay",
  ttfb: "server-response-time",
};

function readCruxMetric(
  metrics: Record<string, unknown> | undefined,
  apiKey: string,
): { percentile?: number; category?: string } | null {
  if (!metrics || !isRecord(metrics[apiKey])) return null;
  const m = metrics[apiKey] as Record<string, unknown>;
  const percentile =
    typeof m.percentile === "number" ? m.percentile : undefined;
  const category = typeof m.category === "string" ? m.category : undefined;
  return { percentile, category };
}

function readAudit(
  audits: Record<string, unknown> | undefined,
  id: string,
): {
  displayValue?: string;
  numericValue?: number;
  score?: number | null;
} | null {
  if (!audits || !isRecord(audits[id])) return null;
  const a = audits[id] as Record<string, unknown>;
  return {
    displayValue: typeof a.displayValue === "string" ? a.displayValue : undefined,
    numericValue:
      typeof a.numericValue === "number" ? a.numericValue : undefined,
    score: typeof a.score === "number" || a.score === null ? (a.score as number | null) : undefined,
  };
}

function buildCwvFromPsi(psi: Record<string, unknown>): CwvMetric[] {
  const lh = isRecord(psi.lighthouseResult) ? psi.lighthouseResult : undefined;
  const audits = lh && isRecord(lh.audits)
    ? (lh.audits as Record<string, unknown>)
    : undefined;
  const loading = isRecord(psi.loadingExperience)
    ? psi.loadingExperience
    : undefined;
  const metrics =
    loading && isRecord(loading.metrics)
      ? (loading.metrics as Record<string, unknown>)
      : undefined;

  const rows: CwvMetric[] = [];

  const addRow = (
    id: string,
    title: string,
    cruxApiKey: string,
    auditId: string,
    kind: "time" | "cls" | "delay",
  ) => {
    const cr = readCruxMetric(metrics, cruxApiKey);
    let valueDisplay = "—";
    let scorePosition = 55;
    let bucket: ScoreBucket = "needs_improvement";

    if (cr?.percentile != null) {
      if (kind === "time" || kind === "delay") {
        valueDisplay = formatTimeMs(cr.percentile);
      } else {
        valueDisplay = formatClsPercentile(cr.percentile);
      }
      if (cr.category) {
        const pos = categoryToPosition(cr.category);
        const b = categoryToBucket(cr.category);
        if (pos != null) scorePosition = pos;
        if (b != null) bucket = b;
      }
    }
    if (valueDisplay === "—" || cr?.percentile == null) {
      const audit = readAudit(audits, auditId);
      if (audit?.displayValue) {
        valueDisplay = audit.displayValue;
      } else if (audit?.numericValue != null && kind !== "cls") {
        valueDisplay =
          kind === "time"
            ? formatTimeMs(audit.numericValue)
            : `${Math.round(audit.numericValue)} ms`;
      } else if (audit?.numericValue != null && kind === "cls") {
        valueDisplay = audit.numericValue.toFixed(2);
      }
      if (typeof audit?.score === "number") {
        scorePosition = Math.round(Math.min(100, Math.max(0, audit.score * 100)));
        bucket = bucketFromScore(scorePosition);
      }
    }

    rows.push({
      id,
      title,
      valueDisplay,
      scorePosition,
      bucket,
    });
  };

  addRow("fcp", "First Contentful Paint", CRUX_FCP, AUDITS.fcp, "time");
  addRow("lcp", "Largest Contentful Paint", CRUX_LCP, AUDITS.lcp, "time");
  addRow(
    "inp",
    "Interaction to Next Paint",
    CRUX_INP,
    AUDITS.inp,
    "delay",
  );

  const clsCr = readCruxMetric(metrics, CRUX_CLS);
  const clsAudit = readAudit(audits, AUDITS.cls);
  {
    const id = "cls";
    const title = "Cumulative Layout Shift";
    let valueDisplay = "—";
    let scorePosition = 55;
    let bucket: ScoreBucket = "needs_improvement";
    if (clsCr?.percentile != null) {
      valueDisplay = formatClsPercentile(clsCr.percentile);
      if (clsCr.category) {
        const pos = categoryToPosition(clsCr.category);
        const b = categoryToBucket(clsCr.category);
        if (pos != null) scorePosition = pos;
        if (b != null) bucket = b;
      }
    }
    if (valueDisplay === "—" && clsAudit?.displayValue) {
      valueDisplay = clsAudit.displayValue;
    }
    if (typeof clsAudit?.score === "number" && !clsCr?.category) {
      scorePosition = Math.round(clsAudit.score * 100);
      bucket = bucketFromScore(scorePosition);
    }
    rows.push({ id, title, valueDisplay, scorePosition, bucket });
  }

  const fidAuditId =
    audits && isRecord(audits["first-input-delay"])
      ? "first-input-delay"
      : "max-potential-fid";
  addRow("fid", "First Input Delay", CRUX_FID, fidAuditId, "delay");

  addRow(
    "ttfb",
    "Time to First Byte",
    CRUX_TTFB,
    AUDITS.ttfb,
    "delay",
  );

  return rows;
}

function lighthousePerformanceScore(psi: Record<string, unknown>): number | null {
  const lh = isRecord(psi.lighthouseResult) ? psi.lighthouseResult : undefined;
  const cat =
    lh && isRecord(lh.categories) && isRecord(lh.categories.performance)
      ? (lh.categories.performance as Record<string, unknown>)
      : undefined;
  const s = cat && typeof cat.score === "number" ? cat.score : null;
  if (s == null) return null;
  return Math.round(Math.min(100, Math.max(0, s * 100)));
}

function headlineFromScore(score: number) {
  return {
    scoreHeadline:
      score >= 90 ? "Great" : score >= 50 ? "Needs improvement" : "Poor",
    scoreSub:
      score >= 90 ? "Above 90" : score >= 50 ? "Between 50 and 90" : "Below 50",
    scoreDescription:
      score >= 90
        ? "More than 75% of visits had a great experience (field data) or strong Lighthouse performance (lab)."
        : "Several signals suggest room for improvement on this URL.",
  };
}

function resolveTargetUrl(env: PerfEnv): string | null {
  const explicit =
    env === "staging"
      ? process.env.PAGESPEED_STAGING_URL?.trim()
      : process.env.PAGESPEED_TARGET_URL?.trim();
  const base =
    explicit && explicit.length > 0
      ? explicit
      : process.env.PAGESPEED_TARGET_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.VERCEL_URL?.trim();

  if (!base) return null;
  if (base.startsWith("http://") || base.startsWith("https://")) return base;
  return `https://${base}`;
}

export async function resolvePerformanceModel(
  device: PerfDevice,
  env: PerfEnv,
  days: 7 | 30,
): Promise<PerformanceViewModel> {
  const demo = getPerformanceViewModel(device, env, days);
  const apiKey = process.env.GOOGLE_SPEED_INSIGHTS_KEY?.trim();
  const targetUrl = resolveTargetUrl(env);

  if (!apiKey) {
    return {
      ...demo,
      sourceNote:
        "Ajoutez GOOGLE_SPEED_INSIGHTS_KEY dans .env.local pour charger les scores PageSpeed / Lighthouse.",
    };
  }

  if (!targetUrl) {
    return {
      ...demo,
      sourceNote:
        "Définissez PAGESPEED_TARGET_URL (ou NEXT_PUBLIC_APP_URL / VERCEL_URL) pour analyser une URL réelle.",
    };
  }

  const strategy: "mobile" | "desktop" =
    device === "mobile" ? "mobile" : "desktop";
  const raw = await fetchPageSpeedInsightsJson(targetUrl, strategy, apiKey);

  if (!raw || !isRecord(raw)) {
    return {
      ...demo,
      sourceNote:
        "La requête PageSpeed Insights a échoué. Vérifiez la clé, les quotas et l’URL. Données de démo conservées pour cartes et tendances.",
      pagespeedAnalyzedUrl: targetUrl,
    };
  }

  const perf = lighthousePerformanceScore(raw);
  const res = perf ?? demo.realExperienceScore;
  const { scoreHeadline, scoreSub, scoreDescription } = headlineFromScore(res);

  const cwv = buildCwvFromPsi(raw);
  const hasField = isRecord(raw.loadingExperience);

  return {
    ...demo,
    pagespeedAnalyzedUrl: targetUrl,
    realExperienceScore: res,
    scoreHeadline,
    scoreSub,
    scoreDescription,
    cwv: cwv.length ? cwv : demo.cwv,
    sourceNote: hasField
      ? "Scores Lighthouse + données terrain CrUX (quand disponibles pour cette URL)."
      : "Scores Lighthouse (lab). Peu ou pas de données terrain CrUX pour cette URL — métriques lab utilisées.",
    dataPoints: hasField ? demo.dataPoints : Math.max(0, Math.round(demo.dataPoints * 0.4)),
  };
}
