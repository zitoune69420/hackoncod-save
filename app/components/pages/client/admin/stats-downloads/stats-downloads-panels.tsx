"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEnInt } from "@/lib/format/numbers";
import { countryFlagSrc } from "@/lib/flags/country-flag-src";
import type { DownloadStatsPayload } from "@/lib/supabase/download-events";

const scrollClass =
  "max-h-[min(28rem,55vh)] flex flex-col gap-1 overflow-y-auto overscroll-contain px-1.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border";

const scrollClassCompact =
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
  const pct = max > 0 ? Math.min(100, Math.max(3, (value / max) * 100)) : 0;
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

function DataPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border/50 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 p-3 pt-2 sm:p-4 sm:pt-3">
        <div className="mb-1 flex items-center justify-end gap-6 px-1.5 pb-1">
          <span className="min-w-12 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Downloads
          </span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CountryName({ code }: { code: string }) {
  const label = React.useMemo(() => {
    if (code === "XX") return "Unknown";
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
    } catch {
      return code;
    }
  }, [code]);
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- assets statiques locaux */}
      <img
        src={countryFlagSrc(code)}
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

const CHANNEL_LABELS: Record<string, string> = {
  public: "Public",
  vip: "VIP",
  semivip: "Semi-VIP",
};

function EmptyRow() {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      No data for this period
    </p>
  );
}

type Props = { current: DownloadStatsPayload };

export function StatsDownloadsPanels({ current: cur }: Props) {
  const cheatMax = Math.max(1, ...cur.topCheats.map((c) => c.downloads));
  const gameMax = Math.max(1, ...cur.topGames.map((g) => g.downloads));
  const modeMax = Math.max(1, ...cur.topModes.map((m) => m.downloads));
  const channelMax = Math.max(1, ...cur.byChannel.map((c) => c.downloads));
  const countryMax = Math.max(1, ...cur.countries.map((c) => c.downloads));

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-2">
        <DataPanel title="Most downloaded cheats">
          <div className={scrollClass}>
            {cur.topCheats.length === 0 ? (
              <EmptyRow />
            ) : (
              cur.topCheats.map((c) => (
                <BarRow
                  key={c.cheatId || c.name}
                  label={
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{c.name}</span>
                      {c.gameTitle ? (
                        <span className="truncate text-[11px] font-normal text-muted-foreground">
                          {c.gameTitle}
                        </span>
                      ) : null}
                    </span>
                  }
                  value={c.downloads}
                  max={cheatMax}
                />
              ))
            )}
          </div>
        </DataPanel>

        <DataPanel title="Most downloaded games">
          <div className={scrollClass}>
            {cur.topGames.length === 0 ? (
              <EmptyRow />
            ) : (
              cur.topGames.map((g) => (
                <BarRow
                  key={g.gameId || g.title}
                  label={g.title}
                  value={g.downloads}
                  max={gameMax}
                />
              ))
            )}
          </div>
        </DataPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <DataPanel title="Popular game modes">
          <div className={scrollClassCompact}>
            {cur.topModes.length === 0 ? (
              <EmptyRow />
            ) : (
              cur.topModes.map((m) => (
                <BarRow
                  key={m.mode}
                  label={m.mode}
                  value={m.downloads}
                  max={modeMax}
                />
              ))
            )}
          </div>
        </DataPanel>

        <DataPanel title="By channel">
          <div className={scrollClassCompact}>
            {cur.byChannel.length === 0 ? (
              <EmptyRow />
            ) : (
              cur.byChannel.map((c) => (
                <BarRow
                  key={c.channel}
                  label={CHANNEL_LABELS[c.channel] ?? c.channel}
                  value={c.downloads}
                  max={channelMax}
                  pctLabel={`${c.pct.toFixed(0)}%`}
                />
              ))
            )}
          </div>
        </DataPanel>

        <DataPanel title="Countries">
          <div className={scrollClassCompact}>
            {cur.countries.length === 0 ? (
              <EmptyRow />
            ) : (
              cur.countries.map((c) => (
                <BarRow
                  key={c.code}
                  label={<CountryName code={c.code} />}
                  value={c.downloads}
                  max={countryMax}
                  pctLabel={`${c.pct.toFixed(0)}%`}
                />
              ))
            )}
          </div>
        </DataPanel>
      </section>
    </>
  );
}
