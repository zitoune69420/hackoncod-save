export type PerfDevice = "desktop" | "mobile";

export type PerfEnv = "production" | "staging";

export type ScoreBucket = "poor" | "needs_improvement" | "great";

export type CwvMetric = {
  id: string;
  title: string;
  valueDisplay: string;
  /** 0–100 sur l’échelle du rapport (position sur la barre). */
  scorePosition: number;
  bucket: ScoreBucket;
};

export type RoutePerfRow = {
  path: string;
  visits: number;
  score: number;
};

export type CountryPerfRow = {
  code: string;
  name: string;
  visits: number;
  score: number;
  lat: number;
  lng: number;
};

export type PerformanceViewModel = {
  device: PerfDevice;
  env: PerfEnv;
  days: 7 | 30;
  /** Message court sur la provenance des données (clé manquante, erreur API, etc.). */
  sourceNote?: string;
  /** URL réellement passée à PageSpeed quand les scores live sont utilisés. */
  pagespeedAnalyzedUrl?: string;
  realExperienceScore: number;
  scoreHeadline: string;
  scoreSub: string;
  scoreDescription: string;
  dataPoints: number;
  cwv: CwvMetric[];
  chart: {
    labels: string[];
    p75: number[];
    p90: number[];
    p95: number[];
    p99: number[];
  };
  routes: {
    poor: RoutePerfRow[];
    needsImprovement: RoutePerfRow[];
    great: RoutePerfRow[];
  };
  countries: CountryPerfRow[];
};
