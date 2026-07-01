"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SecurityRange } from "@/lib/security/types";

function SegmentTabs({
  options,
  value,
  onChange,
}: {
  options: { id: SecurityRange; label: string }[];
  value: SecurityRange;
  onChange: (id: SecurityRange) => void;
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

type Props = { range: SecurityRange };

export function StatsSecurityToolbar({ range }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setRange = React.useCallback(
    (next: SecurityRange) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "1d") {
        params.delete("securityRange");
      } else {
        params.set("securityRange", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentTabs
            options={[
              { id: "1d", label: "Past day" },
              { id: "7d", label: "7 days" },
              { id: "30d", label: "30 days" },
            ]}
            value={range}
            onChange={setRange}
          />
          <span className="text-muted-foreground text-sm font-medium">
            Overview
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 gap-1.5"
          >
            <Shield className="size-4" aria-hidden />
            Bot Management
          </Button>
          <Button type="button" variant="ghost" size="sm">
            Add new…
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="More"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
