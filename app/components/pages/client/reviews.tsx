"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, StarIcon, UserIcon } from "@hugeicons/core-free-icons"
import { useTranslations } from "@/app/components/i18n-provider"
import type { Review } from "@/lib/supabase/types"
import { cacheKey, getCached, setCached } from "@/lib/cache"
import { showToast } from "@/components/commons/toasts"

const PAGE_SIZE = 12

async function fetchReviews(offset: number, limit: number): Promise<Review[]> {
  const res = await fetch(`/api/reviews?offset=${offset}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? "Error")
  return Array.isArray(data) ? data : []
}

export function prefetchReviews(): void {
  const key = cacheKey("reviews")
  if (getCached<Review[]>(key)) return
  fetchReviews(0, PAGE_SIZE).then((data) => setCached(key, data))
}

function StarRating({ note }: { note: number }) {
  const full = Math.min(5, Math.max(0, Math.round(note)))
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
  )
}

const LOCALE_MAP: Record<string, string> = { fr: "fr-FR", en: "en-US" }

function formatDate(iso: string, locale: string) {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString(LOCALE_MAP[locale] ?? locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

export function ReviewDate({ iso }: { iso: string }) {
  const { locale } = useTranslations()
  return (
    <time className="shrink-0 text-xs text-muted-foreground" dateTime={iso}>
      {formatDate(iso, locale)}
    </time>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={UserIcon} className="size-4 text-muted-foreground" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {review.user_id ? `${String(review.user_id).slice(0, 8)}...` : "Anonymous"}
          </p>
          <StarRating note={review.note ?? 0} />
        </div>
        <ReviewDate iso={review.created_at ?? ""} />
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-4 text-sm">{review.message ?? "—"}</p>
      </CardContent>
    </Card>
  )
}

export function ReviewsPage() {
  const { t } = useTranslations()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback((skipCache = false) => {
    const key = cacheKey("reviews")
    if (!skipCache) {
      const cached = getCached<Review[]>(key)
      if (cached) {
        setReviews(cached)
        setLoading(false)
        setError(null)
        return
      }
    }
    setLoading(true)
    fetchReviews(0, PAGE_SIZE)
      .then((data) => {
        setCached(key, data)
        setReviews(data)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        showToast({ text: t("reviews.toasts.errorLoading"), variant: "error" })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("reviews.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reviews.description")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="space-y-2">
                <div className="flex gap-2">
                  <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("reviews.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reviews.description")}</p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("reviews.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reviews.description")}</p>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          {t("reviews.noReviews")}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("reviews.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reviews.description")}</p>
      </div>
      <ReviewsLoadMore initialReviews={reviews} />
    </div>
  )
}

export function ReviewsLoadMore({ initialReviews }: { initialReviews: Review[] }) {
  const { t } = useTranslations()
  const [extraReviews, setExtraReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialReviews.length >= PAGE_SIZE)

  const allReviews = [...initialReviews, ...extraReviews]

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const offset = initialReviews.length + extraReviews.length
      const next = await fetchReviews(offset, PAGE_SIZE)
      setExtraReviews((prev) => [...prev, ...next])
      setHasMore(next.length >= PAGE_SIZE)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? (
              <span className="animate-pulse">{t("common.loading")}</span>
            ) : (
              <>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" strokeWidth={2} />
                <span>{t("reviews.loadMore")}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
