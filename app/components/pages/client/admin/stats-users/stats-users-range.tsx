"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

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

type Props = { days: 7 | 30 };

export function StatsUsersRange({ days }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setDays = React.useCallback(
    (next: 7 | 30) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 7) {
        params.delete("statsDays");
      } else {
        params.set("statsDays", String(next));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
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
  );
}
