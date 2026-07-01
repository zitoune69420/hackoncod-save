/** Squelettes Suspense pour les pages admin stats (pas de async ici). */

export function AdminStatsUsersBodyFallback() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[7.5rem] animate-pulse rounded-xl border border-border/60 bg-muted/50"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-border/60 bg-muted/50" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-border/60 bg-muted/40"
          />
        ))}
      </div>
    </div>
  )
}

export function AdminStatsPerformanceBodyFallback() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <div className="h-48 animate-pulse rounded-xl border border-border/60 bg-muted/50" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/40"
          />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-8">
        <div className="h-[22rem] animate-pulse rounded-xl border border-border/60 bg-muted/50" />
        <div className="h-56 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
      </div>
    </div>
  )
}
