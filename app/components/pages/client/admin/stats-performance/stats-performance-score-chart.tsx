"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { PerformanceViewModel } from "@/lib/performance/types";

const chartConfig = {
  p75: { label: "P75", color: "#3b82f6" },
  p90: { label: "P90", color: "#94a3b8" },
  p95: { label: "P95", color: "#f59e0b" },
  p99: { label: "P99", color: "#ef4444" },
} satisfies ChartConfig;

type Props = { chart: PerformanceViewModel["chart"] };

export function StatsPerformanceScoreChart({ chart }: Props) {
  const data = React.useMemo(
    () =>
      chart.labels.map((label, i) => ({
        label,
        p75: chart.p75[i] ?? 0,
        p90: chart.p90[i] ?? 0,
        p95: chart.p95[i] ?? 0,
        p99: chart.p99[i] ?? 0,
      })),
    [chart],
  );

  const [active, setActive] = React.useState({
    p75: true,
    p90: true,
    p95: true,
    p99: true,
  });

  const toggle = (key: keyof typeof active) => {
    setActive((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
        <LineChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid
            vertical={false}
            className="stroke-border/40"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[11px]"
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            width={32}
            className="text-[11px]"
          />
          <ReferenceLine
            y={90}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine
            y={50}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {active.p75 ? (
            <Line
              type="monotone"
              dataKey="p75"
              name="P75"
              stroke="var(--color-p75)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : null}
          {active.p90 ? (
            <Line
              type="monotone"
              dataKey="p90"
              name="P90"
              stroke="var(--color-p90)"
              strokeWidth={2}
              dot={false}
            />
          ) : null}
          {active.p95 ? (
            <Line
              type="monotone"
              dataKey="p95"
              name="P95"
              stroke="var(--color-p95)"
              strokeWidth={2}
              dot={false}
            />
          ) : null}
          {active.p99 ? (
            <Line
              type="monotone"
              dataKey="p99"
              name="P99"
              stroke="var(--color-p99)"
              strokeWidth={2}
              dot={false}
            />
          ) : null}
          <Legend
            verticalAlign="top"
            align="right"
            content={() => (
              <ul className="flex flex-wrap justify-end gap-4 pb-2">
                {(
                  [
                    ["p75", "P75"],
                    ["p90", "P90"],
                    ["p95", "P95"],
                    ["p99", "P99"],
                  ] as const
                ).map(([k, label]) => (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => toggle(k)}
                      className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        !active[k] && "text-muted-foreground line-through opacity-60",
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: chartConfig[k].color,
                        }}
                      />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
