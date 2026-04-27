import { ForumPinnedBadge } from "@/app/components/pages/client/forum-labels";
import type { ForumAuthorView } from "@/lib/forum/forum-discord-authors";
import { authorInitials, forumDateOnly } from "@/lib/forum/forum-discord-authors";
import { cn } from "@/lib/utils";

function Avatar({
  author,
  size,
}: {
  author: ForumAuthorView;
  size: "sm" | "md";
}) {
  const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  if (author.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.avatarUrl}
        alt=""
        className={cn(dim, "shrink-0 rounded-full object-cover ring-1 ring-border/60")}
        width={size === "md" ? 40 : 32}
        height={size === "md" ? 40 : 32}
      />
    );
  }
  return (
    <div
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border/60",
        textSize,
      )}
      aria-hidden
    >
      {authorInitials(author.displayName)}
    </div>
  );
}

/** En-tête d’un fil : avatar, pseudo Discord, date (jour seul), épinglé. */
export function ForumThreadPostHeader({
  author,
  title,
  createdAt,
  updatedAt,
  pinned,
}: {
  author: ForumAuthorView;
  title: string;
  createdAt: string | null | undefined;
  updatedAt: string | null | undefined;
  pinned: boolean | null | undefined;
}) {
  const dateStr = forumDateOnly(createdAt) ?? forumDateOnly(updatedAt);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar author={author} size="md" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {author.displayName}
            </span>
            {pinned ? <ForumPinnedBadge /> : null}
          </div>
          {dateStr ? (
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          ) : null}
        </div>
      </div>
      <h1 className="text-2xl font-bold leading-tight">{title || "—"}</h1>
    </div>
  );
}

/** Ligne auteur sur une carte liste de fils. */
export function ForumThreadListAuthorRow({
  author,
  dateIso,
}: {
  author: ForumAuthorView;
  dateIso: string | null | undefined;
}) {
  const dateStr = forumDateOnly(dateIso);
  return (
    <div className="flex items-center gap-2 pt-1">
      <Avatar author={author} size="sm" />
      <span className="truncate text-xs font-medium text-foreground">
        {author.displayName}
      </span>
      {dateStr ? (
        <span className="shrink-0 text-xs text-muted-foreground">· {dateStr}</span>
      ) : null}
    </div>
  );
}

/** En-tête compact pour un commentaire. */
export function ForumCommentAuthorRow({
  author,
  dateIso,
}: {
  author: ForumAuthorView;
  dateIso: string | null | undefined;
}) {
  const dateStr = forumDateOnly(dateIso);
  return (
    <div className="flex items-center gap-2">
      <Avatar author={author} size="sm" />
      <div className="min-w-0 flex-1">
        <span className="truncate text-xs font-semibold text-foreground">
          {author.displayName}
        </span>
        {dateStr ? (
          <span className="ml-2 text-[11px] text-muted-foreground">{dateStr}</span>
        ) : null}
      </div>
    </div>
  );
}
