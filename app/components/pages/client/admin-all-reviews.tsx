"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommonTable } from "@/components/commons/table/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { showPendingDeleteConfirmToast } from "@/components/commons/pending-delete-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { AdminReviewFormDialog } from "@/app/components/pages/client/admin-review-form-dialog";
import type { AdminReviewRow } from "@/app/components/pages/client/admin-reviews-types";
import type { Review } from "@/lib/supabase/types";
import { truncateText } from "@/lib/truncate-text";

const MESSAGE_PREVIEW_CHARS = 100;

export type { AdminReviewRow } from "@/app/components/pages/client/admin-reviews-types";

function reviewToRow(r: Review): AdminReviewRow {
  return {
    id: r.id,
    user_id: r.user_id ?? "",
    author_name: r.author_name?.trim() ?? "",
    message: r.message ?? "",
    note: typeof r.note === "number" ? r.note : 0,
    created_at: r.created_at ?? "",
  };
}

function NoteStars({ note }: { note: number }) {
  const full = Math.min(5, Math.max(0, Math.round(note)));
  return (
    <div className="flex gap-0.5 text-amber-500" aria-label={`${note}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <HugeiconsIcon
          key={i}
          icon={StarIcon}
          className={`size-4 ${i <= full ? "fill-amber-500 [&_path]:fill-amber-500" : "opacity-30 [&_path]:fill-transparent"}`}
          strokeWidth={i <= full ? 0 : 2}
        />
      ))}
    </div>
  );
}

async function fetchAdminReviews(): Promise<AdminReviewRow[]> {
  const res = await fetch("/api/admin/reviews");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  if (!Array.isArray(data)) return [];
  return (data as Review[]).map(reviewToRow);
}

function formatReviewDate(iso: string, locale: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function getAdminReviewsColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  locale: string,
  onEdit: (row: AdminReviewRow) => void,
  onDelete: (row: AdminReviewRow) => void,
) {
  return [
    {
      key: "author_name" as const,
      label: t("dashboard.admin.allReviews.table.author"),
      render: (row: AdminReviewRow) => (
        <span className="font-medium" title={row.user_id || undefined}>
          {row.author_name.trim()
            ? row.author_name
            : t("reviews.anonymous")}
        </span>
      ),
    },
    {
      key: "user_id" as const,
      label: t("dashboard.admin.allReviews.table.userId"),
      render: (row: AdminReviewRow) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.user_id.length > 14
            ? `${row.user_id.slice(0, 10)}…`
            : row.user_id || "—"}
        </span>
      ),
    },
    {
      key: "message" as const,
      label: t("dashboard.admin.allReviews.table.message"),
      cellClassName:
        "min-w-0 max-w-[11rem] sm:max-w-[15rem] md:max-w-[18rem] whitespace-normal align-top",
      render: (row: AdminReviewRow) => (
        <span
          className="block w-full min-w-0 wrap-break-word text-muted-foreground"
          title={row.message || undefined}
        >
          {row.message
            ? truncateText(row.message, MESSAGE_PREVIEW_CHARS)
            : "—"}
        </span>
      ),
    },
    {
      key: "note" as const,
      label: t("dashboard.admin.allReviews.table.note"),
      render: (row: AdminReviewRow) => <NoteStars note={row.note} />,
    },
    {
      key: "created_at" as const,
      label: t("dashboard.admin.allReviews.table.date"),
      render: (row: AdminReviewRow) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatReviewDate(row.created_at, locale)}
        </span>
      ),
    },
    {
      key: "action" as const,
      label: t("dashboard.admin.allReviews.table.action"),
      render: (row: AdminReviewRow) => (
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

function AdminReviewsTable({
  data = [],
  onEdit,
  onDelete,
}: {
  data?: AdminReviewRow[];
  onEdit: (row: AdminReviewRow) => void;
  onDelete: (row: AdminReviewRow) => void;
}) {
  const { t, locale } = useTranslations();
  const columns = useMemo(
    () => getAdminReviewsColumns(t, locale, onEdit, onDelete),
    [t, locale, onEdit, onDelete],
  );
  return <CommonTable columns={columns} data={data} pageSize={12} />;
}

export type AdminAllReviewsScope = "server" | "shop";

export function AdminAllReviewsPage({ scope }: { scope: AdminAllReviewsScope }) {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const isFounder = role === "founder";

  const [data, setData] = useState<AdminReviewRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdminReviewRow | null>(null);

  const titleKey =
    scope === "server"
      ? "dashboard.admin.allReviews.serverTitle"
      : "dashboard.admin.allReviews.shopTitle";

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.message.toLowerCase().includes(q) ||
        row.author_name.toLowerCase().includes(q) ||
        row.user_id.toLowerCase().includes(q),
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

    const key = cacheKey("admin-all-reviews");

    (async () => {
      if (!isRefresh) {
        const cached = getCached<AdminReviewRow[]>(key);
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
        const json = await fetchAdminReviews();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("dashboard.admin.allReviews.errorLoading"),
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

  const onEdit = useCallback((row: AdminReviewRow) => {
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const onDeleteReview = useCallback(
    (row: AdminReviewRow) => {
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? t("common.pendingDeleteCountdown", { seconds: sec })
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.allReviews.deleteSuccess"),
        errorFallback: t("dashboard.admin.allReviews.deleteError"),
        runDelete: async () => {
          const res = await fetch(`/api/admin/reviews/${row.id}`, {
            method: "DELETE",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.allReviews.deleteError"),
            );
          }
          invalidateCache(cacheKey("admin-all-reviews"));
          invalidateCache(cacheKey("reviews"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const handleSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-all-reviews"));
    invalidateCache(cacheKey("reviews"));
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
        {t("dashboard.admin.allReviews.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminReviewFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingRow(null);
        }}
        editingRow={editingRow}
        onSaved={handleSaved}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 shrink">
          <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allReviews.description")}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:max-w-xl lg:max-w-2xl">
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="shrink-0 gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("dashboard.admin.allReviews.refresh")}
          </Button>
          <div className="min-w-0 w-full sm:flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("dashboard.admin.allReviews.searchPlaceholder")}
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
        <AdminReviewsTable
          data={filteredData}
          onEdit={onEdit}
          onDelete={onDeleteReview}
        />
      )}
    </div>
  );
}
