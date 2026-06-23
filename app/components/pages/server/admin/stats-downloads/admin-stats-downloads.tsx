import { Suspense } from "react";
import { redirectUnlessFounder } from "@/lib/dashboard-access-guard";
import { getCachedDashboardUserAccess } from "@/lib/dashboard-request-access";
import { buildDownloadStatsModel } from "@/lib/analytics/build-download-stats-model";
import { formatEnInt } from "@/lib/format/numbers";
import { cn } from "@/lib/utils";
import { StatsDownloadsChart } from "@/app/components/pages/client/admin/stats-downloads/stats-downloads-chart";
import { StatsDownloadsPanels } from "@/app/components/pages/client/admin/stats-downloads/stats-downloads-panels";
import { StatsDownloadsRange } from "@/app/components/pages/client/admin/stats-downloads/stats-downloads-range";
import { AdminStatsUsersBodyFallback } from "@/app/components/pages/common/admin-stats-fallbacks";

function DeltaBadge({ pct }: { pct: number }) {
  const neutral = Math.abs(pct) < 0.05;
  if (neutral) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        0%
      </span>
    );
  }
  const positive = pct >= 0;
  const cls = positive
    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
    : "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ring-current/15",
        cls,
      )}
    >
      {pct > 0 ? "+" : ""}
      {pct}%
    </span>
  );
}

function StatTile({
  title,
  valueDisplay,
  delta,
}: {
  title: string;
  valueDisplay: string;
  delta?: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        {delta != null ? <DeltaBadge pct={delta} /> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-card-foreground md:text-[2rem]">
        {valueDisplay}
      </p>
    </div>
  );
}

type DaysProp = { days: 7 | 30 };

async function AdminStatsDownloadsData({ days }: DaysProp) {
  const data = await buildDownloadStatsModel(days);
  const cur = data.current;
  const deltas = data.deltas;

  return (
    <>
      {data.hint ? (
        <div
          role="status"
          className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
        >
          {data.hint}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatTile
          title="Downloads"
          valueDisplay={formatEnInt(cur.summary.downloads)}
          delta={deltas.downloadsPct}
        />
        <StatTile
          title="Cheats downloaded"
          valueDisplay={formatEnInt(cur.summary.uniqueCheats)}
          delta={deltas.uniqueCheatsPct}
        />
        <StatTile
          title="Games downloaded"
          valueDisplay={formatEnInt(cur.summary.uniqueGames)}
          delta={deltas.uniqueGamesPct}
        />
      </section>

      <StatsDownloadsChart series={cur.series} />
      <StatsDownloadsPanels current={cur} />
    </>
  );
}

export async function AdminStatsDownloadsServer({ days }: DaysProp) {
  const access = await getCachedDashboardUserAccess("db");
  redirectUnlessFounder(access);

  return (
    <div className="mx-auto w-full max-w-[min(100%,88rem)] space-y-8 px-1 sm:px-2">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            Download analytics
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Most downloaded cheats and games, popular game modes and channels —
            compared to the previous period of equal length.
          </p>
        </div>
        <StatsDownloadsRange days={days} />
      </header>

      <Suspense fallback={<AdminStatsUsersBodyFallback />}>
        <AdminStatsDownloadsData days={days} />
      </Suspense>
    </div>
  );
}
