"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCompactCount } from "@/lib/format/numbers";
import type { PerformanceViewModel, RoutePerfRow } from "@/lib/performance/types";

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

function RouteCol({
  title,
  subtitle,
  accent,
  rows,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  accent: "red" | "amber" | "emerald";
  rows: RoutePerfRow[];
  emptyLabel: string;
}) {
  const ring =
    accent === "red"
      ? "text-rose-500"
      : accent === "amber"
        ? "text-amber-500"
        : "text-emerald-500";

  return (
    <Card className="flex flex-col overflow-hidden rounded-xl border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 size-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
              accent === "red" && "bg-rose-500 ring-rose-500/40",
              accent === "amber" && "bg-amber-500 ring-amber-500/40",
              accent === "emerald" && "bg-emerald-500 ring-emerald-500/40",
            )}
          />
          <div>
            <CardTitle className={cn("text-sm font-semibold", ring)}>
              {title}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-[11px]">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 p-3 pt-3">
        {rows.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm">
            <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="size-5" />
            </span>
            {emptyLabel}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const max = Math.max(...rows.map((x) => x.visits), 1);
              const w = Math.min(100, Math.max(8, (r.visits / max) * 100));
              return (
                <li
                  key={r.path}
                  className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[12px] font-medium">
                      {r.path}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {formatCompactCount(r.visits)} visits
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        r.score >= 90 && "text-emerald-600 dark:text-emerald-400",
                        r.score >= 50 &&
                          r.score < 90 &&
                          "text-amber-600 dark:text-amber-400",
                        r.score < 50 && "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {r.score}
                    </span>
                  </div>
                  <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        accent === "red" && "bg-rose-500/80",
                        accent === "amber" && "bg-amber-500/80",
                        accent === "emerald" && "bg-emerald-500/80",
                      )}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mt-auto pt-2 text-center text-xs font-medium transition-colors"
        >
          View all
        </button>
      </CardContent>
    </Card>
  );
}

type Props = Pick<PerformanceViewModel, "routes">;

export function StatsPerformanceRoutes({ routes }: Props) {
  const [tab, setTab] = React.useState<"routes" | "paths">("routes");
  const data =
    tab === "routes"
      ? routes
      : {
          poor: routes.poor,
          needsImprovement: routes.needsImprovement,
          great: routes.great,
        };

  return (
    <Card className="rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border/50 pb-4">
        <CardTitle className="text-base font-semibold">
          Experience by route
        </CardTitle>
        <SegmentTabs
          options={[
            { id: "routes", label: "Routes" },
            { id: "paths", label: "Paths" },
          ]}
          value={tab}
          onChange={(id) => setTab(id as "routes" | "paths")}
        />
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <RouteCol
            title="Poor"
            subtitle="Under 50"
            accent="red"
            rows={data.poor}
            emptyLabel="No poor scores"
          />
          <RouteCol
            title="Needs improvement"
            subtitle="50 – 90"
            accent="amber"
            rows={data.needsImprovement}
            emptyLabel="No routes in this band"
          />
          <RouteCol
            title="Great"
            subtitle="Above 90"
            accent="emerald"
            rows={data.great}
            emptyLabel="No great scores yet"
          />
        </div>
      </CardContent>
    </Card>
  );
}
