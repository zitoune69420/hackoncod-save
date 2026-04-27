import { loadMessages, getMessage, DEFAULT_LOCALE } from "@/lib/i18n"
import { getEnrichedPublicReviews } from "@/lib/reviews/enriched-public-reviews"
import type { Review } from "@/lib/supabase/types"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon, UserIcon } from "@hugeicons/core-free-icons"
import { ReviewsLoadMore, ReviewDate } from "@/app/components/pages/client/reviews"

async function fetchReviews(offset: number, limit: number): Promise<Review[]> {
  return getEnrichedPublicReviews(offset, limit)
}

const PAGE_SIZE = 12
const messages = loadMessages(DEFAULT_LOCALE)

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

function ReviewsHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{getMessage(messages, "reviews.title")}</h1>
      <p className="text-sm text-muted-foreground">{getMessage(messages, "reviews.description")}</p>
    </div>
  )
}

function ReviewsEmpty() {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
      {getMessage(messages, "reviews.noReviews")}
    </div>
  )
}

export async function ReviewsPage() {
  const initialReviews = await fetchReviews(0, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <ReviewsHeader />
      {initialReviews.length === 0 ? (
        <ReviewsEmpty />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          <ReviewsLoadMore initialReviews={initialReviews} />
        </>
      )}
    </div>
  )
}
