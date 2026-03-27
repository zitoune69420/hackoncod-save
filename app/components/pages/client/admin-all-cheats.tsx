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
import { useUserRole } from "@/hooks/use-user-role";
import { AdminCheatFormDialog } from "@/app/components/pages/client/admin-cheat-form-dialog";
import type { AdminCheatRow } from "@/app/components/pages/client/admin-cheats-types";

export type { AdminCheatRow } from "@/app/components/pages/client/admin-cheats-types";

async function fetchAdminCheats(): Promise<AdminCheatRow[]> {
  const res = await fetch("/api/admin/cheats");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  return Array.isArray(data) ? data : [];
}

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-5 text-green-600" />
  ) : (
    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5 text-red-600" />
  );
}

function hasClientStr(s: string): boolean {
  const t = s?.trim().toLowerCase();
  return t === "true" || t === "1" || (t !== "" && t !== "false" && t !== "0");
}

function getAdminCheatsColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  onEdit: (row: AdminCheatRow) => void,
) {
  return [
    {
      key: "game" as const,
      label: t("dashboard.admin.allCheats.table.game"),
    },
    { key: "name" as const, label: t("dashboard.admin.allCheats.table.name") },
    { key: "mode" as const, label: t("dashboard.admin.allCheats.table.mode") },
    {
      key: "platform" as const,
      label: t("dashboard.admin.allCheats.table.platform"),
    },
    {
      key: "extension" as const,
      label: t("dashboard.admin.allCheats.table.extension"),
    },
    {
      key: "crack" as const,
      label: t("dashboard.admin.allCheats.table.crack"),
      render: (row: AdminCheatRow) => <BoolCell value={row.crack} />,
    },
    {
      key: "client" as const,
      label: t("dashboard.admin.allCheats.table.client"),
      render: (row: AdminCheatRow) => <BoolCell value={hasClientStr(row.client)} />,
    },
    {
      key: "vip" as const,
      label: t("dashboard.admin.allCheats.table.vip"),
      render: (row: AdminCheatRow) => <BoolCell value={row.vip} />,
    },
    {
      key: "semi_vip" as const,
      label: t("dashboard.admin.allCheats.table.semivip"),
      render: (row: AdminCheatRow) => <BoolCell value={row.semi_vip} />,
    },
    {
      key: "statut" as const,
      label: t("dashboard.admin.allCheats.table.statut"),
    },
    {
      key: "action" as const,
      label: t("dashboard.admin.allCheats.table.action"),
      render: (row: AdminCheatRow) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(row)}
          >
            {t("common.edit")}
          </Button>
          {row.link ? (
            <Button variant="default" size="sm" asChild>
              <a
                href={row.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  showToast({
                    text: t("common.leaveReviewAfterDownload"),
                  })
                }
              >
                {t("cheats.download")}
              </a>
            </Button>
          ) : (
            <Button variant="default" size="sm" disabled>
              {t("cheats.download")}
            </Button>
          )}
        </div>
      ),
    },
  ];
}

function AdminCheatsTable({
  data = [],
  onEdit,
}: {
  data?: AdminCheatRow[];
  onEdit: (row: AdminCheatRow) => void;
}) {
  const { t } = useTranslations();
  const columns = useMemo(
    () => getAdminCheatsColumns(t, onEdit),
    [t, onEdit],
  );
  return <CommonTable columns={columns} data={data} pageSize={12} />;
}

export type AdminAllCheatsScope = "server" | "shop";

export function AdminAllCheatsPage({ scope }: { scope: AdminAllCheatsScope }) {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const isFounder = role === "founder";

  const [data, setData] = useState<AdminCheatRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdminCheatRow | null>(null);
  const [games, setGames] = useState<{ id: string; title: string }[]>([]);

  const titleKey =
    scope === "server"
      ? "dashboard.admin.allCheats.serverTitle"
      : "dashboard.admin.allCheats.shopTitle";

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.game.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.mode.toLowerCase().includes(q) ||
        row.platform.toLowerCase().includes(q) ||
        row.extension.toLowerCase().includes(q) ||
        row.statut.toLowerCase().includes(q),
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

    const key = cacheKey("admin-all-cheats");

    (async () => {
      if (!isRefresh) {
        const cached = getCached<AdminCheatRow[]>(key);
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
        const json = await fetchAdminCheats();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("dashboard.admin.allCheats.errorLoading"),
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

  const openCreateCheat = useCallback(() => {
    setEditingRow(null);
    setFormOpen(true);
  }, []);

  const onEditCheat = useCallback((row: AdminCheatRow) => {
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const handleCheatSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-all-cheats"));
    refreshRef.current = true;
    setRefreshTick((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!isFounder) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/games");
      if (!res.ok || cancelled) return;
      const json: unknown = await res.json().catch(() => null);
      if (!cancelled && Array.isArray(json)) {
        setGames(json as { id: string; title: string }[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFounder]);

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
        {t("dashboard.admin.allCheats.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminCheatFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRow={editingRow}
        games={games}
        onSaved={handleCheatSaved}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 shrink">
          <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allCheats.description")}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:max-w-xl lg:max-w-2xl">
          <Button
            size="lg"
            variant="default"
            onClick={openCreateCheat}
            className="shrink-0 gap-2 px-3"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            {t("dashboard.admin.allCheats.addCheat")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="shrink-0 gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("dashboard.admin.allCheats.refresh")}
          </Button>
          <div className="min-w-0 w-full sm:flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("dashboard.admin.allCheats.searchPlaceholder")}
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <AdminCheatsTable data={filteredData} onEdit={onEditCheat} />
      )}
    </div>
  );
}
