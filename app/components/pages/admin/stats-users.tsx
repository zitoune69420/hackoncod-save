"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Payload = {
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

type StatsJson = {
  ok: boolean;
  hint?: string;
  current: Payload;
  deltas: {
    visitorsPct: number;
    pageviewsPct: number;
    bounceRatePct: number;
  };
  range: { days: number };
};

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function flagEmoji(code: string) {
  if (!code || code.length !== 2 || code === "XX") {
    return "🌐";
  }
  const u = code.toUpperCase();
  return String.fromCodePoint(
    ...[...u].map((c) => 127397 + c.charCodeAt(0)),
  );
}

function DeltaBadge({
  pct,
  invert,
}: {
  pct: number;
  invert?: boolean;
}) {
  const neutral = Math.abs(pct) < 0.05;
  const positive = invert ? pct <= 0 : pct >= 0;
  if (neutral) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        0%
      </span>
    );
  }
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

function aggregateRoutes(
  paths: Array<{ path: string; visitors: number }>,
): Array<{ path: string; visitors: number }> {
  const map = new Map<string, number>();
  for (const { path, visitors } of paths) {
    const parts = path.split("/").filter(Boolean);
    const route =
      parts.length === 0 ? "/" : `/${parts.slice(0, 2).join("/")}`;
    map.set(route, (map.get(route) ?? 0) + visitors);
  }
  return [...map.entries()]
    .map(([path, visitors]) => ({ path, visitors }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 25);
}

function SegmentTabs({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap gap-0.5 rounded-lg bg-muted/70 p-0.5 ring-1 ring-border/60"
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const barListScrollClass =
  "max-h-[min(28rem,55vh)] flex flex-col gap-1 overflow-y-auto overscroll-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border";

const barListScrollClassCompact =
  "max-h-[min(24rem,50vh)] flex flex-col gap-1 overflow-y-auto overscroll-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border";

function BarRow({
  label,
  value,
  max,
  pctLabel,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  pctLabel?: React.ReactNode;
}) {
  const pct =
    max > 0
      ? Math.min(100, Math.max(3, (value / max) * 100))
      : 0;
  return (
    <div className="group relative flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2">
      <div
        className="pointer-events-none absolute inset-y-2 left-2 right-2 overflow-hidden rounded-md bg-muted/50 dark:bg-muted/35"
        aria-hidden
      >
        <div
          className="absolute inset-y-0 left-0 rounded-md bg-primary/20 transition-[width] group-hover:bg-primary/26 dark:bg-primary/24 dark:group-hover:bg-primary/30"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="relative z-1 min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-foreground">
        {label}
      </div>
      {pctLabel != null ? (
        <div className="relative z-1 w-11 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {pctLabel}
        </div>
      ) : null}
      <div className="relative z-1 min-w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
        {formatInt(value)}
      </div>
    </div>
  );
}

function CountryName({ code }: { code: string }) {
  const label = React.useMemo(() => {
    if (code === "XX") {
      return "Unknown";
    }
    try {
      return (
        new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
      );
    } catch {
      return code;
    }
  }, [code]);
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex size-7 items-center justify-center rounded-md bg-muted/80 text-base leading-none ring-1 ring-border/50"
        aria-hidden
      >
        {flagEmoji(code)}
      </span>
      <span className="text-[13px] font-medium">{label}</span>
    </span>
  );
}

const chartConfig = {
  pageviews: {
    label: "Page views",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function StatTile({
  title,
  valueDisplay,
  delta,
  invertDelta,
}: {
  title: string;
  valueDisplay: string;
  delta?: number;
  invertDelta?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        {delta != null ? <DeltaBadge pct={delta} invert={invertDelta} /> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-card-foreground md:text-[2rem]">
        {valueDisplay}
      </p>
    </div>
  );
}

function DataPanel({
  title,
  tabs,
  tabValue,
  onTabChange,
  children,
  headerExtra,
}: {
  title?: string;
  tabs?: { id: string; label: string }[];
  tabValue?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {title ? (
            <CardTitle className="text-sm font-semibold text-foreground">
              {title}
            </CardTitle>
          ) : null}
          {tabs && tabValue != null && onTabChange ? (
            <SegmentTabs
              options={tabs}
              value={tabValue}
              onChange={onTabChange}
            />
          ) : null}
        </div>
        {headerExtra}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 p-3 pt-2 sm:p-4 sm:pt-3">
        {children}
      </CardContent>
    </Card>
  );
}

function TableColumnHeader({
  showPct,
}: {
  showPct?: boolean;
}) {
  return (
    <div className="mb-1 flex items-center justify-end gap-6 border-b border-border/50 px-1 pb-2">
      {showPct ? (
        <span className="w-11 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          %
        </span>
      ) : null}
      <span className="min-w-12 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Visitors
      </span>
    </div>
  );
}

function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-muted/70" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-muted/80" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-muted/60"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted/50" />
    </div>
  );
}

export function AdminStatsUsersPage() {
  const { role, status } = useUserRole();
  const [days, setDays] = React.useState(7);
  const [data, setData] = React.useState<StatsJson | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [pagesTab, setPagesTab] = React.useState<
    "pages" | "routes" | "hostnames"
  >("pages");
  const [refTab, setRefTab] = React.useState<"referrers" | "utm">("referrers");
  const [deviceTab, setDeviceTab] = React.useState<"devices" | "browsers">(
    "devices",
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/analytics/stats?days=${days}`, {
          credentials: "include",
        });
        if (res.status === 403) {
          setLoadError("You do not have access to this page.");
          setData(null);
          return;
        }
        if (!res.ok) {
          setLoadError(`Error ${res.status}`);
          setData(null);
          return;
        }
        const json = (await res.json()) as StatsJson;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Network error");
          setData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (status === "resolved" && role !== "founder") {
    return (
      <div className="rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        Access denied. Founder role required.
      </div>
    );
  }

  const cur = data?.current;
  const deltas = data?.deltas;

  const chartData = React.useMemo(() => {
    if (!cur?.series?.length) {
      return [];
    }
    return cur.series.map((d) => ({
      ...d,
      labelShort: d.label,
    }));
  }, [cur?.series]);

  const pathRows =
    pagesTab === "pages"
      ? (cur?.paths ?? [])
      : pagesTab === "routes"
        ? aggregateRoutes(cur?.paths ?? [])
        : (cur?.hostnames ?? []).map((h) => ({
            path: h.host,
            visitors: h.visitors,
          }));

  const refRows =
    refTab === "referrers"
      ? (cur?.referrers ?? []).map((r) => ({
          key: r.host,
          label: r.host,
          visitors: r.visitors,
        }))
      : (cur?.utm ?? []).map((u) => ({
          key: u.label,
          label: u.label,
          visitors: u.visitors,
        }));

  const pathMax = Math.max(1, ...pathRows.map((r) => r.visitors));
  const refMax = Math.max(1, ...refRows.map((r) => r.visitors));
  const countryMax = Math.max(1, ...((cur?.countries ?? []).map((c) => c.visitors)));
  const devRows =
    deviceTab === "devices"
      ? (cur?.devices ?? []).map((d) => ({
          key: d.device,
          label: d.device,
          visitors: d.visitors,
          pct: d.pct,
        }))
      : (cur?.browsers ?? []).map((b) => ({
          key: b.browser,
          label: b.browser,
          visitors: b.visitors,
          pct: b.pct,
        }));
  const devMax = Math.max(1, ...devRows.map((r) => r.visitors));
  const osMax = Math.max(
    1,
    ...((cur?.operatingSystems ?? []).map((o) => o.visitors)),
  );

  return (
    <div className="mx-auto w-full max-w-[min(100%,88rem)] space-y-8 px-1 sm:px-2">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            User analytics
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Traffic and engagement for your product — compared to the previous
            period of equal length.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
            Range
          </span>
          <SegmentTabs
            options={[
              { id: "7", label: "7 days" },
              { id: "30", label: "30 days" },
            ]}
            value={String(days)}
            onChange={(id) => setDays(Number(id) as 7 | 30)}
          />
        </div>
      </header>

      {!data && !loadError ? <AnalyticsLoading /> : null}

      {loadError ? (
        <div className="rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {data && (
        <div className="space-y-8">
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
              title="Visitors"
              valueDisplay={formatInt(cur?.summary.visitors ?? 0)}
              delta={deltas?.visitorsPct}
            />
            <StatTile
              title="Page views"
              valueDisplay={formatInt(cur?.summary.pageviews ?? 0)}
              delta={deltas?.pageviewsPct}
            />
            <StatTile
              title="Bounce rate"
              valueDisplay={`${(cur?.summary.bounceRate ?? 0).toFixed(0)}%`}
              delta={deltas?.bounceRatePct}
              invertDelta
            />
          </section>

          <Card className="overflow-hidden rounded-xl border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-semibold">
                Page views over time
              </CardTitle>
              <CardDescription>
                Daily totals across the selected window
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 pb-2">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <AreaChart data={chartData} margin={{ left: 4, right: 12 }}>
                  <defs>
                    <linearGradient id="pvFillAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-pageviews)"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-pageviews)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    className="stroke-border/40"
                    strokeDasharray="3 6"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-[11px] fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] fill-muted-foreground"
                    width={36}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="pageviews"
                    stroke="var(--color-pageviews)"
                    strokeWidth={2}
                    fill="url(#pvFillAnalytics)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <section className="grid gap-5 lg:grid-cols-2">
            <DataPanel
              tabs={[
                { id: "pages", label: "Pages" },
                { id: "routes", label: "Routes" },
                { id: "hostnames", label: "Hostnames" },
              ]}
              tabValue={pagesTab}
              onTabChange={(id) =>
                setPagesTab(id as "pages" | "routes" | "hostnames")
              }
            >
              <TableColumnHeader />
              <div className={barListScrollClass}>
                {pathRows.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No data for this period
                  </p>
                ) : (
                  pathRows.map((r) => (
                    <BarRow
                      key={r.path}
                      label={
                        <span className="font-mono text-[12px] text-foreground/90">
                          {r.path}
                        </span>
                      }
                      value={r.visitors}
                      max={pathMax}
                    />
                  ))
                )}
              </div>
            </DataPanel>

            <DataPanel
              tabs={[
                { id: "referrers", label: "Referrers" },
                { id: "utm", label: "UTM" },
              ]}
              tabValue={refTab}
              onTabChange={(id) => setRefTab(id as "referrers" | "utm")}
            >
              <TableColumnHeader />
              <div className={barListScrollClass}>
                {refRows.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No data for this period
                  </p>
                ) : (
                  refRows.map((r) => (
                    <BarRow
                      key={r.key}
                      label={
                        <span className="flex items-center gap-2.5">
                          {refTab === "referrers" &&
                          r.label !== "Direct Link" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.label)}&sz=32`}
                              alt=""
                              className="size-5 shrink-0 rounded-md bg-background ring-1 ring-border/60"
                              width={20}
                              height={20}
                            />
                          ) : null}
                          <span className="text-[13px]">{r.label}</span>
                        </span>
                      }
                      value={r.visitors}
                      max={refMax}
                    />
                  ))
                )}
              </div>
            </DataPanel>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <DataPanel title="Countries">
              <TableColumnHeader showPct />
              <div className={barListScrollClassCompact}>
                {(cur?.countries ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No data
                  </p>
                ) : (
                  (cur?.countries ?? []).map((c) => (
                    <BarRow
                      key={c.code}
                      label={<CountryName code={c.code} />}
                      value={c.visitors}
                      max={countryMax}
                      pctLabel={`${c.pct.toFixed(0)}%`}
                    />
                  ))
                )}
              </div>
            </DataPanel>

            <DataPanel
              tabs={[
                { id: "devices", label: "Devices" },
                { id: "browsers", label: "Browsers" },
              ]}
              tabValue={deviceTab}
              onTabChange={(id) =>
                setDeviceTab(id as "devices" | "browsers")
              }
            >
              <TableColumnHeader showPct />
              <div className={barListScrollClassCompact}>
                {devRows.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No data
                  </p>
                ) : (
                  devRows.map((r) => (
                    <BarRow
                      key={r.key}
                      label={r.label}
                      value={r.visitors}
                      max={devMax}
                      pctLabel={`${r.pct.toFixed(0)}%`}
                    />
                  ))
                )}
              </div>
            </DataPanel>

            <DataPanel title="Operating systems">
              <TableColumnHeader showPct />
              <div className={barListScrollClassCompact}>
                {(cur?.operatingSystems ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No data
                  </p>
                ) : (
                  (cur?.operatingSystems ?? []).map((o) => (
                    <BarRow
                      key={o.os}
                      label={o.os}
                      value={o.visitors}
                      max={osMax}
                      pctLabel={
                        o.pct < 1 && o.pct > 0
                          ? "<1%"
                          : `${o.pct.toFixed(0)}%`
                      }
                    />
                  ))
                )}
              </div>
            </DataPanel>
          </section>
        </div>
      )}
    </div>
  );
}
