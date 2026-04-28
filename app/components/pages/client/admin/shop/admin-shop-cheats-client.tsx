"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { canAccessAdminShopSection } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { CommonTable } from "@/components/commons/table/table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Refresh01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import type { ShopCheat } from "@/lib/supabase/shop-types";

async function fetchShopCheatsAdmin(): Promise<ShopCheat[]> {
  const res = await fetch("/api/admin/shop/cheats");
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

export function AdminShopCheatsClientPage() {
  const { t } = useTranslations();
  const { role, isLoading: roleLoading } = useUserRole();
  const canAccess = canAccessAdminShopSection(role);
  const isFounder = role === "founder";

  const [data, setData] = useState<ShopCheat[]>([]);
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
        (row.game ?? "").toLowerCase().includes(q) ||
        (row.platform ?? "").toLowerCase().includes(q) ||
        (row.status ?? "").toLowerCase().includes(q),
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
    const key = cacheKey("admin-shop-cheats-list");

    (async () => {
      if (isFounder && !isRefresh) {
        const cached = getCached<ShopCheat[]>(key);
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
        const json = await fetchShopCheatsAdmin();
        if (!cancelled) {
          if (isFounder) setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
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

  const columns = useMemo(
    () => [
      {
        key: "name" as const,
        label: t("dashboard.admin.allCheats.table.name"),
      },
      { key: "slug" as const, label: "Slug" },
      {
        key: "game" as const,
        label: t("dashboard.admin.allCheats.table.game"),
        render: (row: ShopCheat) => row.game ?? "—",
      },
      {
        key: "platform" as const,
        label: t("dashboard.admin.allCheats.table.platform"),
        render: (row: ShopCheat) => row.platform ?? "—",
      },
      {
        key: "is_active" as const,
        label: t("shop.common.active"),
        render: (row: ShopCheat) => <BoolCell value={row.is_active} />,
      },
      ...(isFounder
        ? [
            {
              key: "created_by" as const,
              label: "created_by",
              render: (row: ShopCheat) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {row.created_by ?? "—"}
                </span>
              ),
            },
          ]
        : []),
    ],
    [t, isFounder],
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
        {t("dashboard.admin.allCheats.accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">
            {t("dashboard.admin.allCheats.shopTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.admin.allCheats.description")}
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
            {t("dashboard.admin.allCheats.refresh")}
          </Button>
          <div className="min-w-0 sm:w-72">
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
        <CommonTable columns={columns} data={filteredData} pageSize={12} />
      )}
    </div>
  );
}
