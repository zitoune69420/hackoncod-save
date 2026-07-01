"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { canAccessAdminShopSection } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { CommonTable } from "@/components/commons/table/table";
import type { Column } from "@/components/commons/table/types";
import { showPendingDeleteConfirmToast } from "@/components/commons/pending-delete-toast";
import { AdminShopCreatorCell } from "@/app/components/pages/client/admin/shop/admin-shop-creator-cell";
import {
  AdminShopAccountEditDialog,
  type AdminShopAccountTableRow,
} from "@/app/components/pages/client/admin/shop/admin-shop-account-edit-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Refresh01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import type { ShopAccount, ShopProductCreator } from "@/lib/supabase/shop-types";

async function fetchShopAccountsAdmin(): Promise<
  Array<ShopAccount & { creator: ShopProductCreator | null }>
> {
  const res = await fetch("/api/admin/shop/accounts");
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

export function AdminShopAccountsClientPage() {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const canAccess = canAccessAdminShopSection(role);
  const isFounder = role === "founder";

  const [data, setData] = useState<AdminShopAccountTableRow[]>([]);
  const [editRow, setEditRow] = useState<AdminShopAccountTableRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshRef = useRef(false);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        (row.games ?? "").toLowerCase().includes(q) ||
        (row.region ?? "").toLowerCase().includes(q) ||
        (row.login ?? "").toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;
    const key = cacheKey("admin-shop-accounts-list");

    (async () => {
      if (isFounder && !isRefresh) {
        const cached = getCached<
          Array<ShopAccount & { creator: ShopProductCreator | null }>
        >(key);
        if (cached) {
          if (!cancelled) {
            setData(cached.map((row) => ({ ...row, actions: "" })));
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
        const json = await fetchShopAccountsAdmin();
        if (!cancelled) {
          if (isFounder) setCached(key, json);
          setData(json.map((row) => ({ ...row, actions: "" })));
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          showToast({
            text: t("shop.accounts.toastError"),
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
    const iv = setInterval(() => setProgress((p) => (p >= 90 ? 90 : p + 10)), 200);
    return () => clearInterval(iv);
  }, [loading]);

  const handleRefresh = useCallback(() => {
    refreshRef.current = true;
    setRefreshTick((k) => k + 1);
  }, []);

  const onEditRow = useCallback((row: AdminShopAccountTableRow) => {
    setEditRow(row);
    setFormOpen(true);
  }, []);

  const onDeleteRow = useCallback(
    (row: AdminShopAccountTableRow) => {
      const confirmLine = t("dashboard.admin.shopCatalog.confirmDeleteAccount", {
        name: row.name,
      });
      showPendingDeleteConfirmToast({
        getLine: (sec) =>
          sec > 0
            ? `${confirmLine} (${sec})`
            : t("common.pendingDeleteApplying"),
        cancelLabel: t("common.pendingDeleteCancel"),
        applyingLabel: t("common.pendingDeleteApplying"),
        successMessage: t("dashboard.admin.shopCatalog.deleteSuccess"),
        errorFallback: t("dashboard.admin.shopCatalog.deleteError"),
        runDelete: async () => {
          const res = await fetch(`/api/admin/shop/accounts/${row.id}`, {
            method: "DELETE",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof json?.error === "string"
                ? json.error
                : t("dashboard.admin.shopCatalog.deleteError"),
            );
          }
          invalidateCache(cacheKey("admin-shop-accounts-list"));
          refreshRef.current = true;
          setRefreshTick((k) => k + 1);
        },
      });
    },
    [t],
  );

  const columns = useMemo<Column<AdminShopAccountTableRow>[]>(
    () => [
      {
        key: "name" as const,
        label: t("dashboard.admin.allGames.table.title"),
      },
      {
        key: "slug" as const,
        label: t("dashboard.admin.shopCatalog.fieldSlug"),
      },
      {
        key: "games" as const,
        label: t("shop.admin.accounts.gamesColumn"),
        render: (row) => row.games ?? "—",
      },
      {
        key: "region" as const,
        label: t("shop.admin.accounts.regionColumn"),
        render: (row) => row.region ?? "—",
      },
      {
        key: "price" as const,
        label: t("shop.admin.accounts.priceColumn"),
        render: (row) =>
          `${row.price}${row.currency ? ` ${row.currency}` : ""}`,
      },
      {
        key: "is_active" as const,
        label: t("shop.common.active"),
        render: (row) => (
          <BoolCell value={row.is_active !== false} />
        ),
      },
      {
        key: "created_by" as const,
        label: t("dashboard.admin.shopCatalog.createdBy"),
        render: (row) => (
          <AdminShopCreatorCell
            creator={row.creator}
            rawId={row.created_by}
            unknownLabel={t("dashboard.admin.shopCatalog.creatorUnknown")}
          />
        ),
      },
      ...(isFounder
        ? [
            {
              key: "actions" as const,
              label: t("dashboard.admin.shopCatalog.action"),
              render: (row: AdminShopAccountTableRow) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditRow(row)}
                  >
                    {t("dashboard.admin.shopCatalog.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteRow(row)}
                  >
                    {t("dashboard.admin.shopCatalog.delete")}
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, isFounder, onEditRow, onDeleteRow],
  );

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
        {t("dashboard.admin.allGames.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminShopAccountEditDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditRow(null);
        }}
        row={editRow}
        onSaved={() => {
          invalidateCache(cacheKey("admin-shop-accounts-list"));
          handleRefresh();
        }}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">
            {t("shop.admin.accounts.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("shop.admin.accounts.description")}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="gap-2 px-3"
            disabled={loading}
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("shop.accounts.refresh")}
          </Button>
          <div className="min-w-0 sm:w-72">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("shop.accounts.searchPlaceholder")}
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <CommonTable columns={columns} data={filteredData} pageSize={12} />
      )}
    </div>
  );
}
