"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommonTable } from "@/components/commons/table/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { showPendingDeleteConfirmToast } from "@/components/commons/pending-delete-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { AdminBlacklistFormDialog } from "@/app/components/pages/client/admin/blacklist/admin-blacklist-form-dialog";
import type { BannedIpAdminRow } from "@/lib/banned/banned-ip-admin-row";
import { truncateText } from "@/lib/truncate-text";

const REASON_MAX_CHARS = 80;
const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

export type DiscordPresentationDto = {
  displayName: string | null;
  avatarUrl: string | null;
};

type BannedIpsApiPayload = {
  entries: BannedIpAdminRow[];
  discordPresentations: Record<string, DiscordPresentationDto>;
};

/** Ligne tableau : une IP — regroupement des entrées DB avec la même IP. */
type BannedIpGroupTableRow = {
  ip: string;
  discord: string;
  reason: string;
  created_at: string | null;
  entries: BannedIpAdminRow[];
  discordIds: string[];
  /** Colonne Actions (CommonTable). */
  action?: ReactNode;
};

function normalizeIpRow(row: BannedIpAdminRow): BannedIpAdminRow {
  return {
    id: row.id ?? "",
    ip: row.ip ?? "",
    discord_id: row.discord_id ?? null,
    reason: row.reason ?? null,
    created_at: row.created_at ?? null,
  };
}

function compareIsoDesc(a: string | null, b: string | null): number {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return tb - ta;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || "—";
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Avatar Discord par défaut à partir du snowflake, sans appel API. */
function discordDefaultEmbedAvatarUrl(userId: string): string | null {
  const t = userId.trim();
  if (!DISCORD_SNOWFLAKE_RE.test(t)) return null;
  try {
    const idx = Number((BigInt(t) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return null;
  }
}

function normalizeDiscordIdClient(raw: string | null | undefined): string | null {
  const s = raw?.trim() ?? "";
  return DISCORD_SNOWFLAKE_RE.test(s) ? s : null;
}

/** IDs distincts, ordre = première apparition dans `entries` (déjà triées du plus récent au plus ancien). */
function collectDiscordIdsInOrder(entries: BannedIpAdminRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries) {
    const id = normalizeDiscordIdClient(e.discord_id ?? undefined);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function groupRowsByIp(rows: BannedIpAdminRow[]): BannedIpGroupTableRow[] {
  const map = new Map<string, BannedIpAdminRow[]>();
  for (const row of rows) {
    const rawIp = normalizeIpRow(row).ip.trim();
    if (!rawIp) continue;
    const key = rawIp.toLowerCase();
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  const groups: BannedIpGroupTableRow[] = [];
  for (const list of map.values()) {
    list.sort((a, b) =>
      compareIsoDesc(
        normalizeIpRow(a).created_at,
        normalizeIpRow(b).created_at,
      ),
    );
    const entries = list.map(normalizeIpRow);
    const ip = entries[0]?.ip.trim() ?? "";
    const discordIds = collectDiscordIdsInOrder(entries);
    const top = entries[0];
    const reasonText = top?.reason?.trim() ?? "";
    groups.push({
      ip,
      discord: "",
      reason: reasonText,
      created_at: top?.created_at ?? null,
      entries,
      discordIds,
    });
  }
  groups.sort((a, b) => compareIsoDesc(a.created_at, b.created_at));
  return groups;
}

function DiscordMiniAvatar({ src }: { src: string | undefined }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={28}
      height={28}
      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border"
      loading="lazy"
      decoding="async"
    />
  );
}

function BannedIpDiscordCell({
  discordIds,
  presentations,
}: {
  discordIds: string[];
  presentations: Record<string, DiscordPresentationDto>;
}) {
  if (discordIds.length === 0) return <span className="text-muted-foreground">—</span>;

  const resolve = (id: string) => {
    const p = presentations[id];
    const name =
      p?.displayName?.trim() || `…${id.slice(-6)}`;
    const avatar =
      p?.avatarUrl?.trim() ||
      discordDefaultEmbedAvatarUrl(id) ||
      undefined;
    return { id, name, avatar };
  };

  const main = resolve(discordIds[0]);
  const rest = discordIds.slice(1).map(resolve);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 max-w-[11rem] items-center gap-2 sm:max-w-[14rem]">
        <DiscordMiniAvatar src={main.avatar} />
        <span className="min-w-0 truncate text-sm" title={main.id}>
          {main.name}
        </span>
      </div>
      {rest.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs tabular-nums"
            >
              +{rest.length}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-xs">
            {rest.map((r) => (
              <DropdownMenuItem
                key={r.id}
                className="cursor-default gap-2 py-2"
                onSelect={(e) => e.preventDefault()}
              >
                <DiscordMiniAvatar src={r.avatar} />
                <span className="min-w-0 flex-1 truncate" title={r.id}>
                  {r.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

async function fetchBannedIpsPayload(): Promise<BannedIpsApiPayload> {
  const res = await fetch("/api/admin/banned-ips");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  const entriesRaw = data?.entries;
  const entries = Array.isArray(entriesRaw)
    ? (entriesRaw as BannedIpAdminRow[]).map((e) => normalizeIpRow(e))
    : [];
  const presRaw = data?.discordPresentations;
  const discordPresentations: Record<string, DiscordPresentationDto> =
    presRaw != null && typeof presRaw === "object" && !Array.isArray(presRaw)
      ? (presRaw as Record<string, DiscordPresentationDto>)
      : {};
  return { entries, discordPresentations };
}

function getColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  presentations: Record<string, DiscordPresentationDto>,
  onDelete: (row: BannedIpAdminRow) => void,
) {
  return [
    {
      key: "ip" as const,
      label: t("dashboard.admin.allBannedIps.table.ip"),
      cellClassName:
        "min-w-0 max-w-[14rem] sm:max-w-[18rem] whitespace-normal align-top",
      render: (row: BannedIpGroupTableRow) => {
        const ip = row.ip.trim();
        if (!ip) return "—";
        return (
          <span className="block wrap-break-word font-mono text-xs" title={ip}>
            {ip}
          </span>
        );
      },
    },
    {
      key: "discord" as const,
      label: t("dashboard.admin.allBannedIps.table.discord"),
      cellClassName: "min-w-0 align-top",
      render: (row: BannedIpGroupTableRow) => (
        <BannedIpDiscordCell
          discordIds={row.discordIds}
          presentations={presentations}
        />
      ),
    },
    {
      key: "reason" as const,
      label: t("dashboard.admin.allBannedIps.table.reason"),
      cellClassName:
        "min-w-0 max-w-[11rem] sm:max-w-[14rem] whitespace-normal align-top",
      render: (row: BannedIpGroupTableRow) => {
        const r = row.reason?.trim();
        const extra = row.entries.length > 1;
        return (
          <span
            className="block w-full min-w-0 wrap-break-word text-muted-foreground"
            title={r || undefined}
          >
            {r
              ? truncateText(r, REASON_MAX_CHARS)
              : extra
                ? t("dashboard.admin.allBannedIps.table.noReason")
                : "—"}
            {extra ? (
              <span className="ml-1 text-xs text-muted-foreground">
                ({t("dashboard.admin.allBannedIps.table.entriesCount", {
                  count: row.entries.length,
                })})
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "created_at" as const,
      label: t("dashboard.admin.allBannedIps.table.date"),
      render: (row: BannedIpGroupTableRow) => formatDate(row.created_at),
    },
    {
      key: "action" as const,
      label: t("dashboard.admin.allBannedIps.table.action"),
      render: (row: BannedIpGroupTableRow) => {
        const entries = row.entries.filter((e) => normalizeIpRow(e).id.trim());
        if (entries.length === 0) return null;
        if (entries.length === 1) {
          return (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(entries[0])}
            >
              {t("common.delete")}
            </Button>
          );
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="destructive" size="sm">
                {t("dashboard.admin.allBannedIps.table.deleteMenu")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {entries.map((e) => {
                const r = normalizeIpRow(e);
                const did = normalizeDiscordIdClient(r.discord_id ?? undefined);
                const label =
                  (did && presentations[did]?.displayName?.trim()) ||
                  did ||
                  r.ip.trim() ||
                  r.id.slice(0, 8);
                return (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => onDelete(e)}
                    className="cursor-pointer"
                  >
                    {t("dashboard.admin.allBannedIps.table.deleteRowLabel", {
                      label: truncateText(label, 40),
                    })}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

function BannedIpsTable({
  data = [],
  presentations,
  onDelete,
}: {
  data?: BannedIpGroupTableRow[];
  presentations: Record<string, DiscordPresentationDto>;
  onDelete: (row: BannedIpAdminRow) => void;
}) {
  const { t } = useTranslations();
  const columns = useMemo(
    () => getColumns(t, presentations, onDelete),
    [t, presentations, onDelete],
  );
  return <CommonTable columns={columns} data={data} pageSize={12} />;
}

export function AdminAllBannedIpsPage() {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const isFounder = role === "founder";

  const [data, setData] = useState<BannedIpAdminRow[]>([]);
  const [presentationById, setPresentationById] = useState<
    Record<string, DiscordPresentationDto>
  >({});
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);

  const filteredFlat = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) => {
      const r = normalizeIpRow(row);
      const did = normalizeDiscordIdClient(r.discord_id ?? undefined);
      const pres = did ? presentationById[did] : undefined;
      const disp = pres?.displayName?.toLowerCase() ?? "";
      return (
        r.ip.toLowerCase().includes(q) ||
        (r.discord_id?.toLowerCase().includes(q) ?? false) ||
        (r.reason?.toLowerCase().includes(q) ?? false) ||
        disp.includes(q)
      );
    });
  }, [data, searchQuery, presentationById]);

  const groupedData = useMemo(
    () => groupRowsByIp(filteredFlat),
    [filteredFlat],
  );

  useEffect(() => {
    if (!isFounder) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;

    const key = cacheKey("admin-all-banned-ips");

    (async () => {
      if (!isRefresh) {
        const cached = getCached<BannedIpsApiPayload>(key);
        if (cached?.entries) {
          if (!cancelled) {
            setData(cached.entries.map(normalizeIpRow));
            setPresentationById(cached.discordPresentations ?? {});
            setLoading(false);
          }
          return;
        }
      } else {
        invalidateCache(key);
      }
      if (!cancelled) {
        setLoading(true);
        setProgress(0);
      }
      try {
        const payload = await fetchBannedIpsPayload();
        if (!cancelled) {
          setCached(key, payload);
          setData(payload.entries);
          setPresentationById(payload.discordPresentations);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("dashboard.admin.allBannedIps.errorLoading"),
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFounder, refreshTick, t]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10));
    }, 200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleRefresh = useCallback(() => {
    refreshRef.current = true;
    setRefreshTick((k) => k + 1);
  }, []);

  const openCreate = useCallback(() => {
    setFormOpen(true);
  }, []);

  const onDeleteRow = useCallback(
    (row: BannedIpAdminRow) => {
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? t("common.pendingDeleteCountdown", { seconds: sec })
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.allBannedIps.deleteSuccess"),
        errorFallback: t("dashboard.admin.allBannedIps.deleteError"),
        runDelete: async () => {
          const id = normalizeIpRow(row).id.trim();
          if (!id) {
            throw new Error(t("dashboard.admin.allBannedIps.deleteError"));
          }
          const res = await fetch(
            `/api/admin/banned-ips/${encodeURIComponent(id)}`,
            { method: "DELETE" },
          );
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.allBannedIps.deleteError"),
            );
          }
          invalidateCache(cacheKey("admin-all-banned-ips"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const handleSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-all-banned-ips"));
    refreshRef.current = true;
    setRefreshTick((k) => k + 1);
  }, []);

  if (roleLoading) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Progress value={60} className="h-1 w-48" />
      </div>
    );
  }

  if (!isFounder) {
    return (
      <div className="rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        {t("dashboard.admin.allBannedIps.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBlacklistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRow={null}
        onSaved={handleSaved}
        defaultCreateMode="ip"
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 shrink">
          <h1 className="text-2xl font-semibold">
            {t("dashboard.admin.allBannedIps.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allBannedIps.description")}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:max-w-xl lg:max-w-2xl">
          <Button
            size="lg"
            variant="default"
            onClick={openCreate}
            className="shrink-0 gap-2 px-3"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            {t("dashboard.admin.allBannedIps.addEntry")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="shrink-0 gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("dashboard.admin.allBannedIps.refresh")}
          </Button>
          <div className="min-w-0 w-full sm:flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("dashboard.admin.allBannedIps.searchPlaceholder")}
              className="max-w-none"
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <BannedIpsTable
          data={groupedData}
          presentations={presentationById}
          onDelete={onDeleteRow}
        />
      )}
    </div>
  );
}
