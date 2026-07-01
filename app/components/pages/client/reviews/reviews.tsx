"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  DiscordIcon,
  StarIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { useTranslations } from "@/app/components/i18n-provider"
import type { ReviewWithAuthor } from "@/lib/supabase/types"
import { authClient } from "@/lib/auth-client"
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache"
import { showToast } from "@/components/commons/toasts"

const PAGE_SIZE = 12

function useReviewPageMotion() {
  const reduceMotion = useReducedMotion()
  return useMemo(
    () => ({
      blockIn: {
        hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: reduceMotion
            ? { duration: 0.18, ease: "easeOut" as const }
            : { type: "spring" as const, stiffness: 400, damping: 30 },
        },
      },
      cardIn: {
        hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: reduceMotion
            ? { duration: 0.16, ease: "easeOut" as const }
            : { type: "spring" as const, stiffness: 380, damping: 28 },
        },
      },
      sectionStagger: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduceMotion ? 0.04 : 0.08,
          },
        },
      },
      gridStagger: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduceMotion ? 0.04 : 0.06,
            delayChildren: reduceMotion ? 0 : 0.03,
          },
        },
      },
    }),
    [reduceMotion],
  )
}

async function fetchReviews(
  offset: number,
  limit: number,
): Promise<ReviewWithAuthor[]> {
  const res = await fetch(`/api/reviews?offset=${offset}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? "Error")
  return Array.isArray(data) ? data : []
}

export function prefetchReviews(): void {
  const key = cacheKey("reviews")
  if (getCached<ReviewWithAuthor[]>(key)) return
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

const REVIEWS_SIGNIN_CALLBACK = "/dashboard?page=reviews"

function AddReviewDialog({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslations()
  const [open, setOpen] = useState(false)
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [message, setMessage] = useState("")
  const [note, setNote] = useState("5")
  const [submitting, setSubmitting] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const resetForm = () => {
    setMessage("")
    setNote("5")
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const signInWithDiscord = async () => {
    try {
      setSigningIn(true)
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: REVIEWS_SIGNIN_CALLBACK,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSigningIn(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) {
      showToast({ text: t("reviews.toasts.mustBeLoggedIn"), variant: "error" })
      return
    }
    const trimmed = message.trim()
    if (trimmed.length < 3) return
    const n = Number.parseInt(note, 10)
    if (!Number.isInteger(n) || n < 1 || n > 5) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, note: n }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : t("reviews.toasts.errorAdding"),
        )
      }
      invalidateCache(cacheKey("reviews"))
      showToast({ text: t("reviews.toasts.reviewAdded"), variant: "success" })
      handleOpenChange(false)
      onSuccess()
    } catch (err) {
      showToast({
        text:
          err instanceof Error ? err.message : t("reviews.toasts.errorAdding"),
        variant: "error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const loggedIn = Boolean(session?.user)

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="default"
        className="shrink-0 gap-2"
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
        <span>{t("reviews.addReview")}</span>
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {sessionPending ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("reviews.form.title")}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            </>
          ) : !loggedIn ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("reviews.loginDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("reviews.loginDialog.description")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-stretch">
                <Button
                  type="button"
                  className="w-full gap-2 sm:w-auto"
                  onClick={signInWithDiscord}
                  disabled={signingIn}
                >
                  <HugeiconsIcon
                    icon={DiscordIcon}
                    className="size-4"
                    strokeWidth={2}
                  />
                  {signingIn ? t("navUser.signingIn") : t("navUser.signIn")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={submit}>
              <DialogHeader className="mb-2">
                <DialogTitle>{t("reviews.form.title")}</DialogTitle>
                <DialogDescription>
                  {t("reviews.form.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="review-message">
                    {t("reviews.form.messageLabel")}
                  </Label>
                  <Textarea
                    id="review-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("reviews.form.messagePlaceholder")}
                    rows={4}
                    maxLength={4000}
                    required
                    minLength={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="review-note">{t("reviews.form.noteLabel")}</Label>
                  <Select value={note} onValueChange={setNote}>
                    <SelectTrigger id="review-note" className="w-full" size="default">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="p-2">
                      {[5, 4, 3, 2, 1].map((v) => (
                        <SelectItem
                          key={v}
                          value={String(v)}
                          className="py-2 pl-2 pr-8"
                        >
                          {t(`reviews.form.note${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  {t("reviews.form.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || message.trim().length < 3}
                >
                  {submitting ? t("common.loading") : t("reviews.form.publish")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReviewsPageHeader({ onReviewAdded }: { onReviewAdded: () => void }) {
  const { t } = useTranslations()
  const { blockIn, sectionStagger } = useReviewPageMotion()
  return (
    <motion.div
      className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      variants={sectionStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={blockIn} className="min-w-0">
        <h1 className="text-2xl font-semibold">{t("reviews.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reviews.description")}</p>
      </motion.div>
      <motion.div variants={blockIn} className="shrink-0">
        <AddReviewDialog onSuccess={onReviewAdded} />
      </motion.div>
    </motion.div>
  )
}

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

function ReviewCard({ review }: { review: ReviewWithAuthor }) {
  const { t } = useTranslations()
  const rawId = review.user_id?.trim()
  const authorLabel = !rawId
    ? t("reviews.anonymous")
    : review.author_name?.trim() || t("reviews.authorFallback")

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={UserIcon} className="size-4 text-muted-foreground" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {authorLabel}
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
  const { blockIn } = useReviewPageMotion()
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback((skipCache = false) => {
    const key = cacheKey("reviews")
    if (!skipCache) {
      const cached = getCached<ReviewWithAuthor[]>(key)
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
  }, [t])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <ReviewsPageHeader onReviewAdded={() => loadData(true)} />
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
        <ReviewsPageHeader onReviewAdded={() => loadData(true)} />
        <motion.div
          variants={blockIn}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </motion.div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="space-y-6">
        <ReviewsPageHeader onReviewAdded={() => loadData(true)} />
        <motion.div
          variants={blockIn}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground"
        >
          {t("reviews.noReviews")}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ReviewsPageHeader onReviewAdded={() => loadData(true)} />
      <ReviewsLoadMore initialReviews={reviews} />
    </div>
  )
}

export function ReviewsLoadMore({
  initialReviews,
}: {
  initialReviews: ReviewWithAuthor[]
}) {
  const { t } = useTranslations()
  const { cardIn, gridStagger } = useReviewPageMotion()
  const [extraReviews, setExtraReviews] = useState<ReviewWithAuthor[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialReviews.length >= PAGE_SIZE)

  useEffect(() => {
    setExtraReviews([])
    setHasMore(initialReviews.length >= PAGE_SIZE)
  }, [initialReviews])

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
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={gridStagger}
        initial="hidden"
        animate="show"
      >
        {allReviews.map((review) => (
          <motion.div key={review.id} variants={cardIn} className="min-w-0">
            <ReviewCard review={review} />
          </motion.div>
        ))}
      </motion.div>
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
