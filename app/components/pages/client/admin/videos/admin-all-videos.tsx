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
import { AdminVideoFormDialog } from "@/app/components/pages/client/admin/videos/admin-video-form-dialog";
import type { AdminVideoRow } from "@/app/components/pages/client/admin/videos/admin-videos-types";
import type { Video } from "@/lib/supabase/types";
import { truncateText } from "@/lib/truncate-text";

const DESCRIPTION_MAX_CHARS = 100;

export type { AdminVideoRow } from "@/app/components/pages/client/admin/videos/admin-videos-types";

function videoToRow(v: Video): AdminVideoRow {
  return {
    id: v.id,
    title: v.title,
    description: v.description ?? "",
    image: v.image ?? "",
    link: v.link ?? "",
  };
}

async function fetchAdminVideos(): Promise<AdminVideoRow[]> {
  const res = await fetch("/api/admin/videos");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  if (!Array.isArray(data)) return [];
  return (data as Video[]).map(videoToRow);
}

function getAdminVideosColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  onEdit: (row: AdminVideoRow) => void,
  onDelete: (row: AdminVideoRow) => void,
) {
  return [
    { key: "title" as const, label: t("dashboard.admin.allVideos.table.title") },
    {
      key: "description" as const,
      label: t("dashboard.admin.allVideos.table.description"),
      cellClassName:
        "min-w-0 max-w-[11rem] sm:max-w-[15rem] md:max-w-[18rem] whitespace-normal align-top",
      render: (row: AdminVideoRow) => (
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
      label: t("dashboard.admin.allVideos.table.image"),
      render: (row: AdminVideoRow) =>
        row.image ? (
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={row.image} target="_blank" rel="noopener noreferrer">
              {t("dashboard.admin.allVideos.table.openLink")}
            </a>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "link" as const,
      label: t("dashboard.admin.allVideos.table.link"),
      render: (row: AdminVideoRow) =>
        row.link ? (
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={row.link} target="_blank" rel="noopener noreferrer">
              {t("dashboard.admin.allVideos.table.openLink")}
            </a>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      key: "action" as const,
      label: t("dashboard.admin.allVideos.table.action"),
      render: (row: AdminVideoRow) => (
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

function AdminVideosTable({
  data = [],
  onEdit,
  onDelete,
}: {
  data?: AdminVideoRow[];
  onEdit: (row: AdminVideoRow) => void;
  onDelete: (row: AdminVideoRow) => void;
}) {
  const { t } = useTranslations();
  const columns = useMemo(
    () => getAdminVideosColumns(t, onEdit, onDelete),
    [t, onEdit, onDelete],
  );
  return <CommonTable columns={columns} data={data} pageSize={12} />;
}

export function AdminAllVideosPage() {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const isFounder = role === "founder";

  const [data, setData] = useState<AdminVideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdminVideoRow | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.link.toLowerCase().includes(q) ||
        row.image.toLowerCase().includes(q),
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

    const key = cacheKey("admin-all-videos");

    (async () => {
      if (!isRefresh) {
        const cached = getCached<AdminVideoRow[]>(key);
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
        const json = await fetchAdminVideos();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("dashboard.admin.allVideos.errorLoading"),
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

  const onEdit = useCallback((row: AdminVideoRow) => {
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const onDeleteVideo = useCallback(
    (row: AdminVideoRow) => {
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? t("common.pendingDeleteCountdown", { seconds: sec })
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.allVideos.deleteSuccess"),
        errorFallback: t("dashboard.admin.allVideos.deleteError"),
        runDelete: async () => {
          const res = await fetch(`/api/admin/videos/${row.id}`, {
            method: "DELETE",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.allVideos.deleteError"),
            );
          }
          invalidateCache(cacheKey("admin-all-videos"));
          invalidateCache(cacheKey("videos"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const handleSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-all-videos"));
    invalidateCache(cacheKey("videos"));
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
        {t("dashboard.admin.allVideos.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminVideoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRow={editingRow}
        onSaved={handleSaved}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 shrink">
          <h1 className="text-2xl font-semibold">
            {t("dashboard.admin.allVideos.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allVideos.description")}
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
            {t("dashboard.admin.allVideos.addVideo")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="shrink-0 gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("dashboard.admin.allVideos.refresh")}
          </Button>
          <div className="min-w-0 w-full sm:flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("dashboard.admin.allVideos.searchPlaceholder")}
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
        <AdminVideosTable
          data={filteredData}
          onEdit={onEdit}
          onDelete={onDeleteVideo}
        />
      )}
    </div>
  );
}
