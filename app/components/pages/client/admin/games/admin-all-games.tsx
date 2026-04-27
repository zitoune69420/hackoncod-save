"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommonTable } from "@/components/commons/table/table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  Refresh01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { showPendingDeleteConfirmToast } from "@/components/commons/pending-delete-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { AdminGameFormDialog } from "@/app/components/pages/client/admin/games/admin-game-form-dialog";
import type { AdminGameRow } from "@/app/components/pages/client/admin/games/admin-games-types";
import type { Game } from "@/lib/supabase/types";
import { truncateText } from "@/lib/truncate-text";

const DESCRIPTION_MAX_CHARS = 100;

export type { AdminGameRow } from "@/app/components/pages/client/admin/games/admin-games-types";

function gameToRow(g: Game): AdminGameRow {
  return {
    id: g.id,
    title: g.title,
    description: g.description ?? "",
    image: g.image ?? "",
    steam: g.steam ?? "",
    link: g.link ?? "",
    client: g.client ?? "",
    displayed: Boolean(g.displayed),
  };
}

async function fetchAdminGames(): Promise<AdminGameRow[]> {
  const res = await fetch("/api/admin/games");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  if (!Array.isArray(data)) return [];
  return (data as Game[]).map(gameToRow);
}

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-5 text-green-600" />
  ) : (
    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5 text-red-600" />
  );
}

function getAdminGamesColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  onEdit: (row: AdminGameRow) => void,
  onDelete: (row: AdminGameRow) => void,
) {
  return [
    { key: "title" as const, label: t("dashboard.admin.allGames.table.title") },
    {
      key: "description" as const,
      label: t("dashboard.admin.allGames.table.description"),
      cellClassName:
        "min-w-0 max-w-[11rem] sm:max-w-[15rem] md:max-w-[18rem] whitespace-normal align-top",
      render: (row: AdminGameRow) => (
        <span
          className="block w-full min-w-0 wrap-break-word text-muted-foreground"
          title={row.description || undefined}
        >
          {row.description
            ? truncateText(row.description, DESCRIPTION_MAX_CHARS)
            : "—"}
        </span>
      ),
    },
    {
      key: "image" as const,
      label: t("dashboard.admin.allGames.table.image"),
      render: (row: AdminGameRow) =>
        row.image ? (
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={row.image} target="_blank" rel="noopener noreferrer">
              {t("dashboard.admin.allGames.table.openLink")}
            </a>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "steam" as const,
      label: t("dashboard.admin.allGames.table.steam"),
      render: (row: AdminGameRow) =>
        row.steam ? (
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={row.steam} target="_blank" rel="noopener noreferrer">
              {t("dashboard.admin.allGames.table.openSteam")}
            </a>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "link" as const,
      label: t("dashboard.admin.allGames.table.link"),
      render: (row: AdminGameRow) =>
        row.link ? (
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={row.link} target="_blank" rel="noopener noreferrer">
              {t("dashboard.admin.allGames.table.openLink")}
            </a>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "client" as const,
      label: t("dashboard.admin.allGames.table.client"),
      render: (row: AdminGameRow) =>
        row.client ? (
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={row.client} target="_blank" rel="noopener noreferrer">
              {t("dashboard.admin.allGames.table.openLink")}
            </a>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "displayed" as const,
      label: t("dashboard.admin.allGames.table.displayed"),
      render: (row: AdminGameRow) => <BoolCell value={row.displayed} />,
    },
    {
      key: "action" as const,
      label: t("dashboard.admin.allGames.table.action"),
      render: (row: AdminGameRow) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(row)}
          >
            {t("common.edit")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDelete(row)}
          >
            {t("common.delete")}
          </Button>
        </div>
      ),
    },
  ];
}

function AdminGamesTable({
  data = [],
  onEdit,
  onDelete,
}: {
  data?: AdminGameRow[];
  onEdit: (row: AdminGameRow) => void;
  onDelete: (row: AdminGameRow) => void;
}) {
  const { t } = useTranslations();
  const columns = useMemo(
    () => getAdminGamesColumns(t, onEdit, onDelete),
    [t, onEdit, onDelete],
  );
  return <CommonTable columns={columns} data={data} pageSize={12} />;
}

export type AdminAllGamesScope = "server" | "shop";

export function AdminAllGamesPage({ scope }: { scope: AdminAllGamesScope }) {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const isFounder = role === "founder";

  const [data, setData] = useState<AdminGameRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdminGameRow | null>(null);

  const titleKey =
    scope === "server"
      ? "dashboard.admin.allGames.serverTitle"
      : "dashboard.admin.allGames.shopTitle";

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.client.toLowerCase().includes(q) ||
        row.steam.toLowerCase().includes(q) ||
        row.link.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  useEffect(() => {
    if (!isFounder) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;

    const key = cacheKey("admin-all-games");

    (async () => {
      if (!isRefresh) {
        const cached = getCached<AdminGameRow[]>(key);
        if (cached) {
          if (!cancelled) {
            setData(cached);
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
        const json = await fetchAdminGames();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("dashboard.admin.allGames.errorLoading"),
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

  const onEdit = useCallback((row: AdminGameRow) => {
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const onDeleteGame = useCallback(
    (row: AdminGameRow) => {
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? t("common.pendingDeleteCountdown", { seconds: sec })
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.allGames.deleteSuccess"),
        errorFallback: t("dashboard.admin.allGames.deleteError"),
        runDelete: async () => {
          const res = await fetch(`/api/admin/games/${row.id}`, {
            method: "DELETE",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.allGames.deleteError"),
            );
          }
          invalidateCache(cacheKey("admin-all-games"));
          invalidateCache(cacheKey("games"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const handleSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-all-games"));
    invalidateCache(cacheKey("games"));
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
        {t("dashboard.admin.allGames.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminGameFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRow={editingRow}
        onSaved={handleSaved}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 shrink">
          <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allGames.description")}
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
            {t("dashboard.admin.allGames.addGame")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="shrink-0 gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("dashboard.admin.allGames.refresh")}
          </Button>
          <div className="min-w-0 w-full sm:w-auto sm:max-w-xl">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("dashboard.admin.allGames.searchPlaceholder")}
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
        <AdminGamesTable
          data={filteredData}
          onEdit={onEdit}
          onDelete={onDeleteGame}
        />
      )}
    </div>
  );
}
