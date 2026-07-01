"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Refresh01Icon,
  StarIcon,
  UserIcon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { getShopImageUrl, cleanExpiredImageCache } from "@/lib/shop-utils";
import type { EnrichedShopReview } from "@/lib/supabase/shop-types";

const PAGE_SIZE = 12;

async function fetchShopReviews(): Promise<EnrichedShopReview[]> {
  const res = await fetch("/api/shop/reviews");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <HugeiconsIcon
          key={i}
          icon={StarIcon}
          strokeWidth={2}
          className={`size-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function ShopReviewsPage() {
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();

  const blockIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.18, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  };
  const cardIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.16, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 380, damping: 28 },
    },
  };
  const sectionStagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0.04 : 0.08 } },
  };
  const gridStagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.04 : 0.06,
        delayChildren: reduceMotion ? 0 : 0.03,
      },
    },
  };

  const [data, setData] = useState<EnrichedShopReview[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({});

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (r) =>
        (r.comment ?? "").toLowerCase().includes(q) ||
        r.product_type.toLowerCase().includes(q) ||
        (r.author_display_name ?? "").toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const visibleData = filteredData.slice(0, visibleCount);
  const hasMore = visibleCount < filteredData.length;

  const avgRating = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  }, [data]);

  const loadData = useCallback(
    (skipCache = false) => {
      const key = cacheKey("shop-reviews");
      if (!skipCache) {
        const cached = getCached<EnrichedShopReview[]>(key);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setProgress(0);
      fetchShopReviews()
        .then((json) => {
          setCached(key, json);
          setData(json);
          setProgress(100);
        })
        .catch(() => {
          showToast({ text: t("shop.reviews.toastError"), variant: "error" });
        })
        .finally(() => setLoading(false));
    },
    [t],
  );

  useEffect(() => {
    cleanExpiredImageCache();
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setProgress((p) => (p >= 90 ? 90 : p + 10)), 200);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls: Record<string, string | null> = {};
      await Promise.all(
        data.map(async (r) => {
          urls[r.id] = await getShopImageUrl(r.image);
        }),
      );
      if (!cancelled) setImageUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("shop-reviews"));
    loadData(true);
  }, [loadData]);

  function productTypeBadge(type: string) {
    const labels: Record<string, string> = {
      cheat: "Cheat",
      service: "Service",
      account: "Account",
    };
    return labels[type] ?? type;
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={blockIn} className="min-w-0">
          <h1 className="text-2xl font-semibold">{t("shop.reviews.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("shop.reviews.description")}
          </p>
        </motion.div>
        <motion.div variants={blockIn} className="flex shrink-0 gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSearch={() => setSearchQuery(search)}
            placeholder={t("shop.reviews.searchPlaceholder")}
          />
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="gap-2 px-3"
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("shop.reviews.refresh")}
          </Button>
        </motion.div>
      </motion.div>

      {loading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {t("shop.reviews.noReviews")}
          </p>
        </div>
      ) : (
        <>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={gridStagger}
            initial="hidden"
            animate="show"
          >
            {visibleData.map((review) => (
              <motion.div key={review.id} variants={cardIn} className="min-w-0">
                <Card className="flex h-full flex-col gap-0 overflow-hidden p-0 pt-0">
                  <div className="relative h-48 w-full shrink-0 overflow-hidden bg-muted">
                    {imageUrls[review.id] ? (
                      <Image
                        src={imageUrls[review.id]!}
                        alt=""
                        className="size-full object-cover"
                        width={600}
                        height={300}
                        unoptimized
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center"
                        aria-hidden
                      >
                        <HugeiconsIcon
                          icon={Image01Icon}
                          strokeWidth={2}
                          className="size-12 text-muted-foreground/35"
                        />
                      </div>
                    )}
                  </div>
                  <CardHeader className="shrink-0 px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <StarRating rating={review.rating} />
                      <Badge variant="secondary" className="shrink-0">
                        {productTypeBadge(review.product_type)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-0 px-6 pb-6 pt-0">
                    <div className="min-h-0 flex-1">
                      {review.comment ? (
                        <p className="text-sm leading-relaxed">{review.comment}</p>
                      ) : null}
                    </div>
                    <div className="mt-auto flex shrink-0 items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
                      <div className="flex min-w-0 items-center gap-2">
                        {review.author_avatar_url ? (
                          <Image
                            src={review.author_avatar_url}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="size-8 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <HugeiconsIcon
                              icon={UserIcon}
                              strokeWidth={2}
                              className="size-4 text-muted-foreground"
                            />
                          </div>
                        )}
                        <span className="truncate font-medium text-foreground">
                          {review.user_id
                            ? review.author_display_name?.trim() ||
                              t("reviews.authorFallback")
                            : t("shop.reviews.anonymous")}
                        </span>
                      </div>
                      <time
                        className="shrink-0 tabular-nums"
                        dateTime={review.created_at}
                      >
                        {new Date(review.created_at).toLocaleDateString()}
                      </time>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                {t("shop.reviews.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
