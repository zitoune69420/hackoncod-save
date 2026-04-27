"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactCount } from "@/lib/format/numbers";
import type {
  SecurityChartRow,
  SecuritySeriesKey,
} from "@/lib/security/types";

const chartConfig = {
  allowed: { label: "Allowed", color: "#3b82f6" },
  denied: { label: "Denied", color: "#ec4899" },
  challenged: { label: "Challenged", color: "#eab308" },
  logged: { label: "Logged", color: "#a855f7" },
  rateLimited: { label: "Rate limited", color: "#06b6d4" },
} satisfies ChartConfig;

type Props = {
  chart: SecurityChartRow[];
  legendTotals: Record<SecuritySeriesKey, number | null>;
};

export function StatsSecurityActivityChart({ chart, legendTotals }: Props) {
  const data = React.useMemo(() => chart, [chart]);

  const legendItems = (
    [
      "allowed",
      "denied",
      "challenged",
      "logged",
      "rateLimited",
    ] as SecuritySeriesKey[]
  ).map((k) => ({
    key: k,
    label: chartConfig[k].label!,
    color: chartConfig[k].color as string,
    total: legendTotals[k],
  }));

  return (
    <Card className="rounded-xl border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="text-base font-semibold">Activity</CardTitle>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
          {legendItems.map(({ key, label, color, total }) => (
            <li key={key} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-muted-foreground tabular-nums">
                {total != null ? formatCompactCount(total) : "—"}
              </span>
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent className="pt-5 pb-3">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
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
              tickLine={false}
              axisLine={false}
              width={36}
              className="text-[11px]"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="allowed"
              stroke="var(--color-allowed)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="denied"
              stroke="var(--color-denied)"
              strokeWidth={1.75}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="challenged"
              stroke="var(--color-challenged)"
              strokeWidth={1.75}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="logged"
              stroke="var(--color-logged)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="rateLimited"
              stroke="var(--color-rateLimited)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
