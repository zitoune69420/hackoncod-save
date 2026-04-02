"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { GamesTable, type GameRow } from "@/app/components/pages/client/games";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { SuggestGameDialogTrigger } from "@/app/components/pages/client/content-suggestion-dialogs";

function fetchGames(): Promise<GameRow[]> {
  return fetch("/api/games").then((res) => res.json());
}

export function GamesPage() {
  const { t } = useTranslations();
  const [data, setData] = useState<GameRow[]>([]);
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
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const isRefresh = refreshRef.current;
    refreshRef.current = false;

    (async () => {
      const key = cacheKey("games");
      if (!isRefresh) {
        const cached = getCached<GameRow[]>(key);
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
        const json = await fetchGames();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({ text: t("games.toasts.errorLoading"), variant: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, t]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("games.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("games.description")}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 w-full sm:w-auto sm:max-w-xl">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSearch={() => setSearchQuery(search)}
            placeholder={t("games.searchPlaceholder")}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SuggestGameDialogTrigger />
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="px-3 gap-2"
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("games.refresh")}
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <GamesTable data={filteredData} />
      )}
    </div>
  );
}
