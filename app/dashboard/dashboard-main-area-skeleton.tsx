/** Squelette de la zone principale (sous le breadcrumb) pendant le streaming RSC. */
export function DashboardMainAreaSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Chargement du contenu"
    >
      <div className="space-y-2">
        <div className="h-8 w-48 max-w-full animate-pulse rounded-md bg-muted/60" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-muted/40" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-10 min-w-[12rem] flex-1 max-w-md animate-pulse rounded-md bg-muted/50" />
        <div className="h-10 w-28 animate-pulse rounded-md bg-muted/50" />
      </div>
      <div className="min-h-[14rem] w-full animate-pulse rounded-xl border border-border/60 bg-muted/35" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl border border-border/50 bg-muted/30"
          />
        ))}
      </div>
    </div>
  );
}
