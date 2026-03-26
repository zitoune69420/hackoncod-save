"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerfDevice, PerfEnv } from "@/lib/performance/types";

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

type Props = {
  device: PerfDevice;
  env: PerfEnv;
  days: 7 | 30;
};

export function StatsPerformanceToolbar({ device, env, days }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const replaceParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentTabs
          options={[
            { id: "desktop", label: "Desktop" },
            { id: "mobile", label: "Mobile" },
          ]}
          value={device}
          onChange={(id) =>
            replaceParams({ perfDevice: id === "desktop" ? null : id })
          }
        />
        <div className="relative">
          <select
            aria-label="Environment"
            value={env}
            onChange={(e) =>
              replaceParams({
                perfEnv:
                  e.target.value === "production" ? null : e.target.value,
              })
            }
            className="h-9 appearance-none rounded-lg border border-border/80 bg-background py-1 pr-8 pl-3 text-xs font-medium shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
        <SegmentTabs
          options={[
            { id: "7", label: "Last 7 days" },
            { id: "30", label: "Last 30 days" },
          ]}
          value={String(days)}
          onChange={(id) =>
            replaceParams({
              perfDays: id === "7" ? null : id,
            })
          }
        />
      </div>
    </div>
  );
}
