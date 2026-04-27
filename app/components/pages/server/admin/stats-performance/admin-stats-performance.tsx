import { Suspense } from "react";
import { redirectUnlessFounder } from "@/lib/dashboard-access-guard";
import { getCachedDashboardUserAccess } from "@/lib/dashboard-request-access";
import { resolvePerformanceModel } from "@/lib/performance/resolve-performance-model";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsPerformanceToolbar } from "@/app/components/pages/client/admin/stats-performance/stats-performance-toolbar";
import { StatsPerformanceScoreChart } from "@/app/components/pages/client/admin/stats-performance/stats-performance-score-chart";
import { StatsPerformanceRoutes } from "@/app/components/pages/client/admin/stats-performance/stats-performance-routes";
import { StatsPerformanceCountries } from "@/app/components/pages/client/admin/stats-performance/stats-performance-countries";
import { AdminStatsPerformanceBodyFallback } from "@/app/components/pages/common/admin-stats-fallbacks";
import type {
  PerfDevice,
  PerfEnv,
  PerformanceViewModel,
} from "@/lib/performance/types";

function ScoreRing({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          className="text-muted/30"
          stroke="currentColor"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
        {score}
      </span>
    </div>
  );
}

function CwvThresholdBar({ position }: { position: number }) {
  const pct = Math.min(100, Math.max(0, position));
  return (
    <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "linear-gradient(90deg, #ef444433 0%, #ef444433 50%, #f59e0b44 50%, #f59e0b44 90%, #22c55e55 90%, #22c55e55 100%)",
        }}
      />
      <div
        className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

function PerformanceSidebar({ model }: { model: PerformanceViewModel }) {
  return (
    <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
      <Card className="rounded-xl border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Real Experience Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pb-6">
          <ScoreRing score={model.realExperienceScore} className="size-32" />
        </CardContent>
      </Card>
      {model.cwv.map((m) => (
        <Card key={m.id} className="rounded-xl border-border/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {m.title}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {m.valueDisplay}
            </p>
            <CwvThresholdBar position={m.scorePosition} />
          </CardContent>
        </Card>
      ))}
    </aside>
  );
}

type Props = {
  device: PerfDevice;
  env: PerfEnv;
  days: 7 | 30;
};

async function AdminStatsPerformanceData({ device, env, days }: Props) {
  const model = await resolvePerformanceModel(device, env, days);

  return (
    <>
      {model.sourceNote ? (
        <div
          role="status"
          className="rounded-lg border border-border/60 bg-muted/35 px-4 py-3 text-xs leading-relaxed text-foreground"
        >
          {model.sourceNote}
          {model.pagespeedAnalyzedUrl ? (
            <span className="text-muted-foreground mt-1 block">
              URL analysée :{" "}
              <span className="text-foreground font-mono text-[11px]">
                {model.pagespeedAnalyzedUrl}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <PerformanceSidebar model={model} />
        <div className="min-w-0 flex-1 space-y-8">
          <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
            <CardHeader className="border-border/50 space-y-4 border-b">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-medium capitalize">
                    {model.device}
                  </p>
                  <CardTitle className="text-base font-semibold">
                    Real Experience Score
                  </CardTitle>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      model.realExperienceScore >= 90 &&
                        "text-emerald-600 dark:text-emerald-400",
                      model.realExperienceScore >= 50 &&
                        model.realExperienceScore < 90 &&
                        "text-amber-600 dark:text-amber-400",
                      model.realExperienceScore < 50 &&
                        "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {model.scoreHeadline}
                  </p>
                  <CardDescription>
                    {model.scoreSub} — {model.scoreDescription}
                  </CardDescription>
                </div>
                <ScoreRing
                  score={model.realExperienceScore}
                  className="size-24 shrink-0 max-sm:mx-auto"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
              <StatsPerformanceScoreChart chart={model.chart} />
            </CardContent>
          </Card>

          <StatsPerformanceRoutes routes={model.routes} />
          <StatsPerformanceCountries
            countries={model.countries}
            dataPoints={model.dataPoints}
          />
        </div>
      </div>
    </>
  );
}

export async function AdminStatsPerformanceServer({
  device,
  env,
  days,
}: Props) {
  const access = await getCachedDashboardUserAccess("db");
  redirectUnlessFounder(access);

  return (
    <div className="mx-auto w-full max-w-[min(100%,92rem)] space-y-8 px-1 sm:px-2">
      <header className="space-y-1 border-b border-border/40 pb-6">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Performance stats
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Core Web Vitals et score Lighthouse — données live via l’API PageSpeed
          Insights quand la clé et l’URL cible sont configurées ; cartes et
          tendances d’exemple en complément.
        </p>
      </header>

      <StatsPerformanceToolbar device={device} env={env} days={days} />

      <Suspense fallback={<AdminStatsPerformanceBodyFallback />}>
        <AdminStatsPerformanceData device={device} env={env} days={days} />
      </Suspense>
    </div>
  );
}
