"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  Refresh01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import Image from "next/image";

export type VideoRow = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  link: string | null;
};

async function fetchVideos(): Promise<VideoRow[]> {
  const res = await fetch("/api/videos");
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? `Error ${res.status}`);
  }
  return Array.isArray(json) ? json : [];
}

function VideoCard({ video }: { video: VideoRow }) {
  const content = (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-muted/50">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
        {video.image ? (
          <Image
            src={video.image}
            alt={video.title}
            className="size-full object-cover transition-transform group-hover:scale-105"
            width={1000}
            height={1000}
            priority
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <HugeiconsIcon
              icon={Video01Icon}
              className="size-16 text-muted-foreground/50"
              strokeWidth={1.5}
            />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/90">
            <HugeiconsIcon
              icon={PlayIcon}
              className="size-7 text-primary"
              strokeWidth={2}
            />
          </div>
        </div>
      </div>
      <div className="flex min-h-22 flex-1 flex-col justify-between gap-2 p-4">
        <div className="flex items-start gap-2">
          <HugeiconsIcon
            icon={Video01Icon}
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
          />
          <h3 className="line-clamp-2 font-semibold">{video.title}</h3>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {video.description || "\u00A0"}
        </p>
      </div>
    </div>
  );

  if (video.link) {
    return (
      <a
        href={video.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {content}
      </a>
    );
  }

  return <div className="h-full">{content}</div>;
}

export function VideosPage() {
  const { t } = useTranslations();
  const [data, setData] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const loadData = useCallback((skipCache = false) => {
    const key = cacheKey("videos");
    if (!skipCache) {
      const cached = getCached<VideoRow[]>(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }
    setLoading(true);
    setProgress(0);
    setError(null);
    fetchVideos()
      .then((json) => {
        setCached(key, json);
        setData(json);
        setProgress(100);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setProgress(0);
        showToast({ text: t("videos.toasts.errorLoading"), variant: "error" });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10));
    }, 200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("videos"));
    loadData(true);
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("videos.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("videos.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSearch={() => setSearchQuery(search)}
            placeholder={t("videos.searchPlaceholder")}
          />
          <Button size="lg" variant="outline" onClick={handleRefresh} className="px-3 gap-2">
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("videos.refresh")}
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : !error ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredData.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
