"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  ShoppingBag01Icon,
  Video01Icon,
  Controller,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

// Fake stats
const STATS = [
  { label: "Available cheats", value: "247", change: "+18%", trend: "up", desc: "This month" },
  { label: "Catalogued games", value: "42", change: "+5", trend: "up", desc: "New additions" },
  { label: "Downloads", value: "12.4k", change: "+24%", trend: "up", desc: "Last 30 days" },
  { label: "Videos viewed", value: "8.2k", change: "-3%", trend: "down", desc: "This month" },
]

// Fake activity data (7 days)
const ACTIVITY_DATA = [
  { day: "Mon", downloads: 420, visits: 1250 },
  { day: "Tue", downloads: 380, visits: 1180 },
  { day: "Wed", downloads: 510, visits: 1420 },
  { day: "Thu", downloads: 290, visits: 980 },
  { day: "Fri", downloads: 620, visits: 1680 },
  { day: "Sat", downloads: 480, visits: 1320 },
  { day: "Sun", downloads: 350, visits: 1050 },
]

// Fake top games
const TOP_GAMES_DATA = [
  { game: "Black Ops 3", downloads: 3420 },
  { game: "Black Ops 2", downloads: 2180 },
  { game: "Modern Warfare", downloads: 1890 },
  { game: "Cold War", downloads: 1560 },
  { game: "Infinite Warfare", downloads: 1240 },
]

const activityChartConfig = {
  downloads: { label: "Downloads", color: "hsl(var(--primary))" },
  visits: { label: "Visits", color: "hsl(var(--primary) / 0.6)" },
} satisfies ChartConfig

const topGamesChartConfig = {
  downloads: { label: "Downloads", color: "hsl(var(--primary))" },
} satisfies ChartConfig

const TOP_GAMES_COLORS = [
  "hsl(0 0% 15%)",   // noir
  "hsl(0 0% 30%)",
  "hsl(0 0% 45%)",
  "hsl(0 0% 60%)",
  "hsl(0 0% 75%)",   // gris clair
]

const SECTIONS = [
  {
    id: "cheats",
    title: "Cheats",
    description: "Browse our cheats for Call of Duty and other games.",
    icon: ShoppingBag01Icon,
  },
  {
    id: "games",
    title: "Games",
    description: "Game catalogue. Steam links, downloads and clients.",
    icon: Controller,
  },
  {
    id: "videos",
    title: "Videos",
    description: "Tutorials and video content to master our tools.",
    icon: Video01Icon,
  },
]

interface DefaultPageProps {
  onSelectPage?: (pageId: string) => void
}

export function DefaultPage({ onSelectPage }: DefaultPageProps) {
  const activityId = React.useId().replace(/:/g, "")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Activity overview and quick access to sections
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <Badge
                variant={stat.trend === "up" ? "default" : "secondary"}
                className="gap-0.5 text-xs"
              >
                {stat.trend === "up" ? (
                  <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" strokeWidth={2} />
                ) : (
                  <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" strokeWidth={2} />
                )}
                {stat.change}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Activity chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity (7 days)</CardTitle>
            <CardDescription>Downloads and visits per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="h-[280px] w-full">
              <AreaChart data={ACTIVITY_DATA} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id={`fillDownloads-${activityId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-downloads)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-downloads)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id={`fillVisits-${activityId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  type="monotone"
                  dataKey="downloads"
                  stroke="var(--color-downloads)"
                  fill={`url(#fillDownloads-${activityId})`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="var(--color-visits)"
                  fill={`url(#fillVisits-${activityId})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top games bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top games (downloads)</CardTitle>
            <CardDescription>The 5 most popular games</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={topGamesChartConfig} className="h-[280px] w-full">
              <BarChart data={TOP_GAMES_DATA} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="game"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="downloads" radius={[0, 12, 12, 0]}>
                  {TOP_GAMES_DATA.map((_, index) => (
                    <Cell key={index} fill={TOP_GAMES_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Section cards */}
      <div>
        <h2 className="mb-4 text-lg font-medium">Quick access</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SECTIONS.map((section) => (
            <Card
              key={section.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onSelectPage?.(section.id)}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <HugeiconsIcon
                      icon={section.icon}
                      className="size-5 text-primary"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription className="mt-1">{section.description}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
