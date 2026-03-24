"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import {
  SemiVipCheatsTable,
  type SemiVipCheatRow,
} from "@/app/components/pages/client/semivip-cheats";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon, Diamond02Icon } from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { authClient } from "@/lib/auth-client";

function fetchSemiVipCheats(): Promise<SemiVipCheatRow[]> {
  return fetch("/api/semivip-cheats").then((res) => res.json());
}

export function SemiVipCheatsPage() {
  const { t } = useTranslations();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user;

  const [data, setData] = useState<SemiVipCheatRow[]>([]);
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
        row.game.toLowerCase().includes(q) ||
        row.mode.toLowerCase().includes(q) ||
        row.extension.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;

    (async () => {
      const key = cacheKey("semivip-cheats");
      if (!isRefresh) {
        const cached = getCached<SemiVipCheatRow[]>(key);
        if (cached) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
          }
          return;
        }
      }
      if (isRefresh) invalidateCache(key);
      if (!cancelled) {
        setLoading(true);
        setProgress(0);
      }
      try {
        const json = await fetchSemiVipCheats();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("semivip.toasts.errorLoading"),
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
  }, [user, refreshTick, t]);

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
    showToast({ text: t("semivip.toasts.cacheCleared"), variant: "success" });
  }, [t]);

  if (sessionPending) {
    return (
      <div className="flex min-h-16 items-center justify-center">
        <Progress value={progress} className="h-1 w-48" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("semivip.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("semivip.description")}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center space-y-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon
              icon={Diamond02Icon}
              className="size-8 text-primary"
              strokeWidth={2}
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              {t("semivip.accessRequired")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("semivip.accessRequiredDescription")}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {t("semivip.accessRequiredNote")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("semivip.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("semivip.description")}
        </p>
      </div>
      <div className="flex justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          onSearch={() => setSearchQuery(search)}
          placeholder={t("semivip.searchPlaceholder")}
        />
        <Button variant="outline" onClick={handleRefresh} className="ml-2">
          <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
          {t("semivip.refresh")}
        </Button>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <SemiVipCheatsTable data={filteredData} />
      )}
    </div>
  );
}
