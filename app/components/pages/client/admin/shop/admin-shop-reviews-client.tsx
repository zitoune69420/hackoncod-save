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
import { canAccessAdminShopSection } from "@/lib/permissions";
import { AdminShopReviewFormDialog } from "@/app/components/pages/client/admin/shop/admin-shop-review-form-dialog";
import type { Column } from "@/components/commons/table/types";
import type { ShopReview } from "@/lib/supabase/shop-types";
import { truncateText } from "@/lib/truncate-text";
import {
  Cancel01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

const COMMENT_PREVIEW = 100;

/** Colonne « actions » : clé factice pour le typage du tableau. */
type ShopReviewTableRow = ShopReview & { actions?: string };

async function fetchShopReviewsAdmin(): Promise<ShopReview[]> {
  const res = await fetch("/api/admin/shop/reviews");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error");
  }
  return Array.isArray(data) ? data : [];
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

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-5 text-green-600" />
  ) : (
    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5 text-red-600" />
  );
}

function formatDate(iso: string, locale: string) {
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

export function AdminShopReviewsClientPage() {
  const { t, locale } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const canAccess = canAccessAdminShopSection(role);
  const isFounder = role === "founder";

  const [data, setData] = useState<ShopReview[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ShopReview | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        (row.comment ?? "").toLowerCase().includes(q) ||
        row.product_type.toLowerCase().includes(q) ||
        row.product_id.toLowerCase().includes(q) ||
        (row.user_id ?? "").toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const onEdit = useCallback((row: ShopReview) => {
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const onDelete = useCallback(
    (row: ShopReview) => {
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
          const res = await fetch(`/api/admin/shop/reviews/${row.id}`, {
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
          invalidateCache(cacheKey("admin-shop-reviews-list"));
          invalidateCache(cacheKey("shop-reviews"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const columns = useMemo<Column<ShopReviewTableRow>[]>(
    () => [
      {
        key: "product_type" as const,
        label: t("dashboard.admin.shopReviewsAdmin.table.productType"),
      },
      {
        key: "product_id" as const,
        label: t("dashboard.admin.shopReviewsAdmin.table.productId"),
        render: (row: ShopReviewTableRow) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.product_id.length > 12
              ? `${row.product_id.slice(0, 8)}…`
              : row.product_id}
          </span>
        ),
      },
      {
        key: "rating" as const,
        label: t("dashboard.admin.allReviews.table.note"),
        render: (row: ShopReviewTableRow) => <NoteStars note={row.rating} />,
      },
      {
        key: "comment" as const,
        label: t("dashboard.admin.shopReviewsAdmin.table.comment"),
        cellClassName:
          "min-w-0 max-w-[11rem] sm:max-w-[15rem] md:max-w-[18rem] whitespace-normal align-top",
        render: (row: ShopReviewTableRow) => (
          <span className="block w-full min-w-0 wrap-break-word text-muted-foreground">
            {row.comment ? truncateText(row.comment, COMMENT_PREVIEW) : "—"}
          </span>
        ),
      },
      {
        key: "is_visible" as const,
        label: t("dashboard.admin.shopReviewsAdmin.table.visible"),
        render: (row: ShopReviewTableRow) => <BoolCell value={row.is_visible} />,
      },
      {
        key: "user_id" as const,
        label: t("dashboard.admin.shopReviewsAdmin.table.userId"),
        render: (row: ShopReviewTableRow) => (
          <span className="font-mono text-xs text-muted-foreground">
            {!row.user_id
              ? "—"
              : row.user_id.length > 14
                ? `${row.user_id.slice(0, 10)}…`
                : row.user_id}
          </span>
        ),
      },
      {
        key: "created_at" as const,
        label: t("dashboard.admin.shopReviewsAdmin.table.date"),
        render: (row: ShopReviewTableRow) => formatDate(row.created_at, locale),
      },
      {
        key: "actions",
        label: t("dashboard.admin.shopReviewsAdmin.table.action"),
        render: (row: ShopReviewTableRow) => (
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
    ],
    [t, locale, onEdit, onDelete],
  );

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;
    const key = cacheKey("admin-shop-reviews-list");

    (async () => {
      if (isFounder && !isRefresh) {
        const cached = getCached<ShopReview[]>(key);
        if (cached) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
          }
          return;
        }
      } else if (isFounder && isRefresh) {
        invalidateCache(key);
      }

      if (!cancelled) {
        setLoading(true);
        setProgress(0);
      }
      try {
        const json = await fetchShopReviewsAdmin();
        if (!cancelled) {
          if (isFounder) setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
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
  }, [canAccess, isFounder, refreshTick, t]);

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

  const handleSaved = useCallback(() => {
    invalidateCache(cacheKey("admin-shop-reviews-list"));
    invalidateCache(cacheKey("shop-reviews"));
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

  if (!canAccess) {
    return (
      <div className="rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        {t("dashboard.admin.shopReviewsAdmin.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminShopReviewFormDialog
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
          <h1 className="text-2xl font-semibold">
            {t("dashboard.admin.allReviews.shopTitle")}
          </h1>
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
        <CommonTable
          columns={columns}
          data={filteredData as ShopReviewTableRow[]}
          pageSize={12}
        />
      )}
    </div>
  );
}
