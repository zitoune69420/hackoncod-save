import { getCurrentUserAccess } from "@/lib/permissions-server";
import { getSecurityViewModel } from "@/lib/security/demo-model";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsSecurityToolbar } from "@/app/components/pages/admin/stats-security-toolbar";
import { StatsSecurityActivityChart } from "@/app/components/pages/admin/stats-security-activity-chart";
import { countryFlagSrc } from "@/lib/flags/country-flag-src";
import { formatCompactCount } from "@/lib/format/numbers";
import { MoreHorizontal, ShieldCheck } from "lucide-react";
import type { SecurityRange } from "@/lib/security/types";

type Props = { range: SecurityRange };

export async function AdminStatsSecurityServer({ range }: Props) {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated || access.role !== "founder") {
    return (
      <div className="rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        Access denied. Founder role required.
      </div>
    );
  }

  const model = getSecurityViewModel(range);

  return (
    <div className="mx-auto w-full max-w-[min(100%,92rem)] space-y-8 px-1 sm:px-2">
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Security
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Bot management et pare-feu — même principe que les autres stats
          admin (RSC + graphique client). Données de démo en attendant vos
          logs WAF.
        </p>
      </header>

      <StatsSecurityToolbar range={model.range} />

      {model.sourceNote ? (
        <div
          role="status"
          className="rounded-lg border border-border/60 bg-muted/35 px-4 py-3 text-xs leading-relaxed text-foreground"
        >
          {model.sourceNote}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr] lg:items-start">
        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardContent className="flex flex-col gap-5 p-5">
            <div className="flex items-start gap-4">
              <div className="bg-primary flex size-14 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm">
                <ShieldCheck className="size-8" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-foreground text-lg font-semibold leading-tight">
                  {model.firewallHeadline}
                </p>
                <p className="text-muted-foreground text-sm">
                  {model.firewallSub}
                </p>
              </div>
            </div>
            <div className="border-border/60 space-y-3 border-t pt-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {model.botProtectionLabel}
                </span>
                <span className="text-emerald-600 font-medium dark:text-emerald-400">
                  {model.botProtectionStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Custom rules</span>
                <span className="font-medium tabular-nums">
                  {model.customRulesCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <StatsSecurityActivityChart
          chart={model.chart}
          legendTotals={model.legendTotals}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Upgrade to Pro
            </Button>
            <CardDescription className="mt-4">
              Les alertes en temps réel nécessiteront une intégration avec ton
              fournisseur WAF.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border/60 px-0 pb-0">
            {model.rules.map((r) => (
              <div
                key={r.id}
                className="text-foreground flex items-center justify-between gap-3 px-6 py-3 text-sm"
              >
                <span className="font-medium">{r.label}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  {formatCompactCount(r.count)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-8"
                    aria-label={`Options for ${r.label}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold">Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                    Action
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                    Hostname
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                    IP address
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                    Start
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">
                    Requests
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {model.events.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-12 text-center text-sm"
                    >
                      No events for this window.
                    </TableCell>
                  </TableRow>
                ) : (
                  model.events.map((e, i) => (
                    <TableRow key={`${e.ip}-${i}`}>
                      <TableCell className="font-medium">{e.action}</TableCell>
                      <TableCell>{e.hostname}</TableCell>
                      <TableCell className="font-mono text-xs">{e.ip}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {e.start}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {e.requests}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold">
              Denied IPs
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[min(24rem,50vh)] space-y-0 divide-y divide-border/50 overflow-y-auto px-0 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {model.deniedIps.map((row) => {
              const src = countryFlagSrc(row.countryCode);
              return (
                <div
                  key={row.ip}
                  className="text-foreground flex items-center gap-3 px-4 py-3 text-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 shrink-0 object-cover"
                  />
                  <span className="min-w-0 flex-1 font-mono text-[13px]">
                    {row.ip}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {row.count}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-8 shrink-0"
                    aria-label={`Actions for ${row.ip}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
