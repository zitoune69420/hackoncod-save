"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEnInt } from "@/lib/format/numbers";
import { countryFlagSrc } from "@/lib/flags/country-flag-src";
import type { AdminAnalyticsStatsPayload } from "@/lib/analytics/admin-stats-types";

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
  "max-h-[min(28rem,55vh)] flex flex-col gap-1 overflow-y-auto overscroll-contain px-1.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border";

const barListScrollClassCompact =
  "max-h-[min(24rem,50vh)] flex flex-col gap-1 overflow-y-auto overscroll-contain px-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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
    max > 0 ? Math.min(100, Math.max(3, (value / max) * 100)) : 0;
  return (
    <div className="group relative flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2">
      <div
        className="pointer-events-none absolute inset-y-1.5 left-0 right-0 overflow-hidden rounded-md bg-muted/50 dark:bg-muted/35"
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
        {formatEnInt(value)}
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
  const flagSrc = countryFlagSrc(code);
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- assets statiques locaux */}
      <img
        src={flagSrc}
        alt=""
        width={28}
        height={28}
        loading="lazy"
        decoding="async"
        className="size-7 shrink-0 object-cover"
        aria-hidden
      />
      <span className="text-[13px] font-medium">{label}</span>
    </span>
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

function TableColumnHeader({ showPct }: { showPct?: boolean }) {
  return (
    <div className="mb-1 flex items-center justify-end gap-6 px-1.5 pb-1">
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

type Props = { current: AdminAnalyticsStatsPayload };

export function StatsUsersPanels({ current: cur }: Props) {
  const [pagesTab, setPagesTab] = React.useState<
    "pages" | "routes" | "hostnames"
  >("pages");
  const [refTab, setRefTab] = React.useState<"referrers" | "utm">(
    "referrers",
  );
  const [deviceTab, setDeviceTab] = React.useState<"devices" | "browsers">(
    "devices",
  );

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
  const countryMax = Math.max(
    1,
    ...((cur?.countries ?? []).map((c) => c.visitors)),
  );
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
    <>
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
                      {refTab === "referrers" && r.label !== "Direct Link" ? (
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
                    o.pct < 1 && o.pct > 0 ? "<1%" : `${o.pct.toFixed(0)}%`
                  }
                />
              ))
            )}
          </div>
        </DataPanel>
      </section>
    </>
  );
}
