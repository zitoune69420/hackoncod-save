"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import type { AdminBlacklistRow } from "@/app/components/pages/client/admin/blacklist/admin-blacklist-types";
import type { BlacklistEntryWithDisplay } from "@/lib/supabase/types";
import { truncateText } from "@/lib/truncate-text";

const REASON_MAX_CHARS = 80;

export type { AdminBlacklistRow } from "@/app/components/pages/client/admin/blacklist/admin-blacklist-types";

/** Assure les champs string (lignes API ou cache localStorage plus ancien). */
function normalizeBlacklistRow(row: AdminBlacklistRow): AdminBlacklistRow {
  return {
    id: row.id,
    db_row_id: row.db_row_id ?? "",
    discord_ban: row.discord_ban ?? false,
    user_id: row.user_id ?? "",
    discord: row.discord ?? "",
    discord_display: row.discord_display ?? "",
    discord_avatar_url: row.discord_avatar_url ?? "",
    reason: row.reason ?? "",
    added_by: row.added_by ?? "",
    added_by_display: row.added_by_display ?? "",
    added_by_avatar_url: row.added_by_avatar_url ?? "",
    created_at: row.created_at ?? "",
  };
}

function entryToRow(e: BlacklistEntryWithDisplay): AdminBlacklistRow {
  return normalizeBlacklistRow({
    id: e.id,
    db_row_id: e.db_row_id ?? "",
    discord_ban: e.discord_ban ?? false,
    user_id: e.user_id ?? "",
    discord: e.discord ?? "",
    discord_display: e.discord_display ?? "",
    discord_avatar_url: e.discord_avatar_url ?? "",
    reason: e.reason ?? "",
    added_by: e.added_by ?? "",
    added_by_display: e.added_by_display ?? "",
    added_by_avatar_url: e.added_by_avatar_url ?? "",
    created_at: e.created_at ?? "",
  });
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || "—";
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Avatar Discord par défaut (couleur) à partir du snowflake, sans appel API. */
function discordDefaultEmbedAvatarUrl(userId: string): string | null {
  const t = userId.trim();
  if (!/^\d{5,24}$/.test(t)) return null;
  try {
    const idx = Number((BigInt(t) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return null;
  }
}

function BlacklistAvatarImg({ src }: { src: string | undefined }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
      loading="lazy"
      decoding="async"
    />
  );
}

type FetchBlacklistResult = {
  rows: AdminBlacklistRow[];
  discordBansError?: string;
};

async function fetchAdminBlacklist(): Promise<FetchBlacklistResult> {
  const res = await fetch("/api/admin/blacklist");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  if (data?.entries && Array.isArray(data.entries)) {
    return {
      rows: (data.entries as BlacklistEntryWithDisplay[]).map(entryToRow),
      discordBansError:
        typeof data.discordBansError === "string"
          ? data.discordBansError
          : undefined,
    };
  }
  if (Array.isArray(data)) {
    return {
      rows: (data as BlacklistEntryWithDisplay[]).map((e) =>
        entryToRow({
          ...e,
          db_row_id:
            e.db_row_id ??
            (typeof e.id === "string" && !e.id.startsWith("discord-ban-")
              ? e.id
              : null),
          discord_ban: e.discord_ban ?? false,
        }),
      ),
    };
  }
  return { rows: [] };
}

function getAdminBlacklistColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  onEdit: (row: AdminBlacklistRow) => void,
  onDelete: (row: AdminBlacklistRow) => void,
  onRemove: (row: AdminBlacklistRow) => void,
) {
  return [
    {
      key: "discord_display" as const,
      label: t("dashboard.admin.allBlacklist.table.discordName"),
      cellClassName:
        "min-w-0 max-w-[12rem] sm:max-w-[16rem] whitespace-normal align-top",
      render: (row: AdminBlacklistRow) => {
        const r = normalizeBlacklistRow(row);
        const label =
          r.discord_display.trim() || r.discord.trim() || "";
        const avatarSrc =
          r.discord_avatar_url.trim() ||
          discordDefaultEmbedAvatarUrl(r.user_id) ||
          undefined;

        if (!label) {
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <BlacklistAvatarImg src={avatarSrc} />
              <span className="text-muted-foreground">—</span>
            </div>
          );
        }

        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <BlacklistAvatarImg src={avatarSrc} />
            <span className="min-w-0 wrap-break-word">{label}</span>
          </div>
        );
      },
    },
    {
      key: "user_id" as const,
      label: t("dashboard.admin.allBlacklist.table.userId"),
      cellClassName:
        "min-w-0 max-w-[9rem] sm:max-w-[11rem] whitespace-normal align-top",
      render: (row: AdminBlacklistRow) => {
        const uid = normalizeBlacklistRow(row).user_id.trim();
        if (!uid) return "—";
        return (
          <span className="block wrap-break-word font-mono text-xs" title={uid}>
            {uid}
          </span>
        );
      },
    },
    {
      key: "reason" as const,
      label: t("dashboard.admin.allBlacklist.table.reason"),
      cellClassName:
        "min-w-0 max-w-[11rem] sm:max-w-[14rem] whitespace-normal align-top",
      render: (row: AdminBlacklistRow) => {
        const r = normalizeBlacklistRow(row);
        return (
          <span
            className="block w-full min-w-0 wrap-break-word text-muted-foreground"
            title={r.reason || undefined}
          >
            {r.reason
              ? truncateText(r.reason, REASON_MAX_CHARS)
              : "—"}
          </span>
        );
      },
    },
    {
      key: "added_by" as const,
      label: t("dashboard.admin.allBlacklist.table.addedBy"),
      render: (row: AdminBlacklistRow) => {
        const r = normalizeBlacklistRow(row);
        const fromApi = r.added_by_display.trim();
        const raw = r.added_by.trim();
        const text = fromApi || raw;
        if (!text) return "—";
        const avatarSrc =
          r.added_by_avatar_url.trim() ||
          discordDefaultEmbedAvatarUrl(r.added_by) ||
          undefined;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <BlacklistAvatarImg src={avatarSrc} />
            <span className="min-w-0 wrap-break-word">{text}</span>
          </div>
        );
      },
    },
    {
      key: "created_at" as const,
      label: t("dashboard.admin.allBlacklist.table.date"),
      render: (row: AdminBlacklistRow) =>
        formatDate(normalizeBlacklistRow(row).created_at),
    },
    {
      key: "action" as const,
      label: t("dashboard.admin.allBlacklist.table.action"),
      render: (row: AdminBlacklistRow) => {
        const r = normalizeBlacklistRow(row);
        const canDelete = Boolean(r.db_row_id.trim());
        const hasSnowflake = /^\d{5,24}$/.test(r.user_id.trim());
        const canRemove = canDelete || hasSnowflake;
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(row)}
            >
              {t("common.edit")}
            </Button>
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(row)}
              >
                {t("common.delete")}
              </Button>
            ) : null}
            {canRemove ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onRemove(row)}
              >
                {t("dashboard.admin.allBlacklist.remove")}
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];
}

function AdminBlacklistTable({
  data = [],
  onEdit,
  onDelete,
  onRemove,
}: {
  data?: AdminBlacklistRow[];
  onEdit: (row: AdminBlacklistRow) => void;
  onDelete: (row: AdminBlacklistRow) => void;
  onRemove: (row: AdminBlacklistRow) => void;
}) {
  const { t } = useTranslations();
  const columns = useMemo(
    () => getAdminBlacklistColumns(t, onEdit, onDelete, onRemove),
    [t, onEdit, onDelete, onRemove],
  );
  return <CommonTable columns={columns} data={data} pageSize={12} />;
}

export function AdminAllBlacklistPage() {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const isFounder = role === "founder";

  const [data, setData] = useState<AdminBlacklistRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdminBlacklistRow | null>(null);
  const [discordBansError, setDiscordBansError] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) => {
      const r = normalizeBlacklistRow(row);
      return (
        r.user_id.toLowerCase().includes(q) ||
        r.discord.toLowerCase().includes(q) ||
        r.discord_display.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.added_by.toLowerCase().includes(q) ||
        r.added_by_display.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery]);

  useEffect(() => {
    if (!isFounder) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;

    const key = cacheKey("admin-all-blacklist");

    (async () => {
      if (!isRefresh) {
        const cached = getCached<AdminBlacklistRow[]>(key);
        if (cached) {
          if (!cancelled) {
            setData(cached.map(normalizeBlacklistRow));
            setDiscordBansError(null);
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
        const { rows, discordBansError: bansErr } =
          await fetchAdminBlacklist();
        if (!cancelled) {
          setCached(key, rows);
          setData(rows);
          setDiscordBansError(
            bansErr == null
              ? null
              : bansErr === "discord_bans_unavailable"
                ? t("dashboard.admin.allBlacklist.discordBansLoadErrorGeneric")
                : bansErr,
          );
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          setDiscordBansError(null);
          showToast({
            text: t("dashboard.admin.allBlacklist.errorLoading"),
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
    setEditingRow(null);
    setFormOpen(true);
  }, []);

  const onEdit = useCallback((row: AdminBlacklistRow) => {
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const onDeleteRow = useCallback(
    (row: AdminBlacklistRow) => {
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? t("common.pendingDeleteCountdown", { seconds: sec })
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.allBlacklist.deleteSuccess"),
        errorFallback: t("dashboard.admin.allBlacklist.deleteError"),
        runDelete: async () => {
          const dbId = normalizeBlacklistRow(row).db_row_id.trim();
          if (!dbId) {
            throw new Error(t("dashboard.admin.allBlacklist.deleteNeedsDbRow"));
          }
          const res = await fetch(`/api/admin/blacklist/${dbId}`, {
            method: "DELETE",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.allBlacklist.deleteError"),
            );
          }
          invalidateCache(cacheKey("admin-all-blacklist"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const onRemoveRow = useCallback(
    (row: AdminBlacklistRow) => {
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? t("common.pendingDeleteCountdown", { seconds: sec })
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.allBlacklist.removeSuccess"),
        errorFallback: t("dashboard.admin.allBlacklist.removeError"),
        runDelete: async () => {
          const r = normalizeBlacklistRow(row);
          const res = await fetch("/api/admin/blacklist/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              db_row_id: r.db_row_id.trim() || undefined,
              user_id: r.user_id.trim() || undefined,
              discord: r.discord.trim() || undefined,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.allBlacklist.removeError"),
            );
          }
          invalidateCache(cacheKey("admin-all-blacklist"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const handleSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-all-blacklist"));
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
        {t("dashboard.admin.allBlacklist.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBlacklistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRow={editingRow}
        onSaved={handleSaved}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 shrink">
          <h1 className="text-2xl font-semibold">
            {t("dashboard.admin.allBlacklist.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allBlacklist.description")}
          </p>
          {discordBansError ? (
            <p
              className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              role="alert"
            >
              {discordBansError}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:max-w-xl lg:max-w-2xl">
          <Button
            size="lg"
            variant="default"
            onClick={openCreate}
            className="shrink-0 gap-2 px-3"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            {t("dashboard.admin.allBlacklist.addEntry")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="shrink-0 gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("dashboard.admin.allBlacklist.refresh")}
          </Button>
          <div className="min-w-0 w-full sm:flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t(
                "dashboard.admin.allBlacklist.searchPlaceholder",
              )}
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
        <AdminBlacklistTable
          data={filteredData}
          onEdit={onEdit}
          onDelete={onDeleteRow}
          onRemove={onRemoveRow}
        />
      )}
    </div>
  );
}
