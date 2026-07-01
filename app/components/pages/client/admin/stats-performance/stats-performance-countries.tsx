"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/components/ui/map";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatCompactCount } from "@/lib/format/numbers";
import { countryFlagSrc } from "@/lib/flags/country-flag-src";
import type { CountryPerfRow, PerformanceViewModel } from "@/lib/performance/types";

function markerColor(score: number) {
  if (score < 50) return "#ef4444";
  if (score < 90) return "#f59e0b";
  return "#22c55e";
}

function CountryList({ rows }: { rows: CountryPerfRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">No data</p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((c) => {
        const src = countryFlagSrc(c.code);
        return (
          <li
            key={c.code}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0 object-cover"
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {c.name}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {formatCompactCount(c.visits)}
            </span>
            <span
              className={cn(
                "w-8 shrink-0 text-right text-sm font-semibold tabular-nums",
                c.score >= 90 && "text-emerald-600 dark:text-emerald-400",
                c.score >= 50 &&
                  c.score < 90 &&
                  "text-amber-600 dark:text-amber-400",
                c.score < 50 && "text-rose-600 dark:text-rose-400",
              )}
            >
              {c.score}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  countries: CountryPerfRow[];
  dataPoints: number;
};

export function StatsPerformanceCountries({ countries, dataPoints }: Props) {
  return (
    <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="text-base font-semibold">Countries</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative h-[min(22rem,50vh)] min-h-[200px] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            <Map
              className="min-h-[200px]"
              center={[20, 25]}
              zoom={1.35}
              scrollZoom={false}
            >
              <MapControls showZoom position="bottom-right" />
              {countries.map((c) => (
                <MapMarker key={c.code} longitude={c.lng} latitude={c.lat}>
                  <MarkerContent>
                    <div
                      className="rounded-full border-2 border-white shadow-md dark:border-zinc-900"
                      style={{
                        width: 14,
                        height: 14,
                        backgroundColor: markerColor(c.score),
                      }}
                    />
                  </MarkerContent>
                  <MarkerTooltip
                    offset={16}
                    className="bg-popover text-popover-foreground border"
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Score {c.score} · {formatCompactCount(c.visits)} visits
                    </p>
                  </MarkerTooltip>
                </MapMarker>
              ))}
            </Map>
          </div>

          <div className="flex flex-col gap-2 px-1">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="group border-border/60 text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border bg-muted/25 px-3 py-2 text-left text-sm font-medium transition-colors">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Poor (under 50)
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    ({countries.filter((c) => c.score < 50).length})
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-in mt-2 rounded-lg border border-border/40 bg-card px-2 py-1">
                <CountryList rows={countries.filter((c) => c.score < 50)} />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="group border-border/60 text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border bg-muted/25 px-3 py-2 text-left text-sm font-medium transition-colors">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Needs improvement (50 – 90)
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    ({countries.filter((c) => c.score >= 50 && c.score < 90).length})
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-in mt-2 max-h-[min(24rem,45vh)] overflow-y-auto rounded-lg border border-border/40 bg-card px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <CountryList rows={countries.filter((c) => c.score >= 50 && c.score < 90)} />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="group border-border/60 text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border bg-muted/25 px-3 py-2 text-left text-sm font-medium transition-colors">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Great (above 90)
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    ({countries.filter((c) => c.score >= 90).length})
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-in mt-2 rounded-lg border border-border/40 bg-card px-2 py-1">
                <CountryList rows={countries.filter((c) => c.score >= 90)} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <p className="text-muted-foreground mt-6 border-t border-border/40 pt-4 text-center text-[11px]">
          This report is based on{" "}
          <span className="text-foreground font-medium tabular-nums">
            {dataPoints.toLocaleString("en-US")}
          </span>{" "}
          data points · Updated just now
        </p>
      </CardContent>
    </Card>
  );
}
