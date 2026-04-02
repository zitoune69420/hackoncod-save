import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ForumAddComment } from "@/app/components/pages/client/forum-add-comment";
import { ForumNewThreadDialog } from "@/app/components/pages/client/forum-new-thread-dialog";
import { ForumPageHeader } from "@/app/components/pages/client/forum-page-header";
import { ForumMarkdown } from "@/app/components/pages/client/forum-markdown";
import { normalizeForumMarkdownSource } from "@/lib/forum/normalize-forum-markdown-source";
import {
  ForumCommentAuthorRow,
  ForumThreadListAuthorRow,
  ForumThreadPostHeader,
} from "@/app/components/pages/server/forum-author-blocks";
import {
  ForumCommentsHeading,
  ForumNoComments,
  ForumNoThreads,
  ForumPinnedBadge,
  ForumThreadNotFound,
} from "@/app/components/pages/client/forum-labels";
import {
  getForumThreadById,
  listForumCommentsForThread,
  listForumThreads,
  type ForumCommentRow,
  type ForumThreadRow,
} from "@/lib/supabase/forum-queries";
import { isUuid } from "@/lib/security/is-uuid";
import {
  type ForumAuthorView,
  resolveForumAuthors,
} from "@/lib/forum/forum-discord-authors";
import { cn } from "@/lib/utils";

function pickAuthor(
  profiles: Map<string, ForumAuthorView>,
  userId: string | null | undefined,
): ForumAuthorView {
  const id = userId?.trim() ?? "";
  if (!id) {
    return { discordId: "", displayName: "Anonyme", avatarUrl: null };
  }
  return (
    profiles.get(id) ?? {
      discordId: id,
      displayName: `Membre ${id.slice(-4)}`,
      avatarUrl: null,
    }
  );
}

function firstParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = raw[key];
  if (v == null) return null;
  if (Array.isArray(v)) return v[0]?.trim() || null;
  const s = v.trim();
  return s || null;
}

function excerpt(text: string | null | undefined, max = 140): string {
  const s = normalizeForumMarkdownSource(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd() + "…";
}

const forumLayoutClass =
  "mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-4 lg:px-0";

type CommentNode = ForumCommentRow & { children: CommentNode[] };

function buildCommentTree(flat: ForumCommentRow[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of flat) {
    byId.set(c.id, { ...c, children: [] });
  }
  const roots: CommentNode[] = [];
  for (const c of flat) {
    const node = byId.get(c.id)!;
    const pid = c.parent_id?.trim() || null;
    if (!pid) {
      roots.push(node);
    } else {
      const parent = byId.get(pid);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  const sortChrono = (a: CommentNode, b: CommentNode) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  roots.sort(sortChrono);
  for (const n of byId.values()) {
    n.children.sort(sortChrono);
  }
  return roots;
}

function ThreadList({
  threads,
  profiles,
}: {
  threads: ForumThreadRow[];
  profiles: Map<string, ForumAuthorView>;
}) {
  if (threads.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/dashboard?page=forum&thread=${encodeURIComponent(thread.id)}`}
          scroll={false}
        >
          <Card className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardHeader className="gap-2 pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-semibold leading-tight">
                  {thread.title ?? "—"}
                </h2>
                {thread.pinned ? <ForumPinnedBadge /> : null}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {excerpt(thread.content)}
              </p>
              <ForumThreadListAuthorRow
                author={pickAuthor(profiles, thread.user_id)}
                dateIso={thread.created_at ?? thread.updated_at}
              />
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function CommentBranch({
  node,
  depth,
  profiles,
  threadId,
}: {
  node: CommentNode;
  depth: number;
  profiles: Map<string, ForumAuthorView>;
  threadId: string;
}) {
  const msg = node.message ?? "";
  const author = pickAuthor(profiles, node.user_id);
  return (
    <div
      className={
        depth > 0
          ? "ml-4 border-l-2 border-border pl-4 md:ml-6 md:pl-5"
          : undefined
      }
    >
      <div className="overflow-hidden rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10">
        <div
          className={cn(
            "space-y-2 px-4 pb-4",
            depth > 0 ? "pb-3 pt-3" : "pt-4",
          )}
        >
          <ForumCommentAuthorRow
            author={author}
            dateIso={node.created_at}
          />
          <ForumMarkdown source={msg} compact className="text-sm text-foreground" />
          <ForumAddComment
            threadId={threadId}
            parentId={node.id}
            replyTrigger
          />
        </div>
      </div>
      {node.children.length > 0 ? (
        <div className="mt-3 space-y-3">
          {node.children.map((ch) => (
            <CommentBranch
              key={ch.id}
              node={ch}
              depth={depth + 1}
              profiles={profiles}
              threadId={threadId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ThreadView({
  thread,
  author,
}: {
  thread: ForumThreadRow;
  author: ForumAuthorView;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <ForumThreadPostHeader
          author={author}
          title={thread.title ?? ""}
          createdAt={thread.created_at}
          updatedAt={thread.updated_at}
          pinned={thread.pinned}
        />
        <div className="prose dark:prose-invert mt-4 max-w-none">
          <ForumMarkdown source={thread.content ?? ""} />
        </div>
      </CardContent>
    </Card>
  );
}

export async function ForumPageServer({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const threadParam = firstParam(searchParams, "thread");

  if (threadParam && isUuid(threadParam)) {
    const thread = await getForumThreadById(threadParam);
    if (!thread) {
      return (
        <div className={forumLayoutClass}>
          <ForumPageHeader variant="list" />
          <ForumThreadNotFound />
        </div>
      );
    }
    const commentsFlat = await listForumCommentsForThread(thread.id);
    const tree = buildCommentTree(commentsFlat);
    const profiles = await resolveForumAuthors([
      thread.user_id,
      ...commentsFlat.map((c) => c.user_id),
    ]);
    const threadAuthor = pickAuthor(profiles, thread.user_id);

    return (
      <div className={forumLayoutClass}>
        <ForumPageHeader variant="thread" />
        <ThreadView thread={thread} author={threadAuthor} />
        <section className="space-y-3">
          <ForumCommentsHeading />
          {tree.length === 0 ? (
            <ForumNoComments />
          ) : (
            <div className="space-y-4">
              {tree.map((node) => (
                <CommentBranch
                  key={node.id}
                  node={node}
                  depth={0}
                  profiles={profiles}
                  threadId={thread.id}
                />
              ))}
            </div>
          )}
          <ForumAddComment threadId={thread.id} className="pt-2" />
        </section>
      </div>
    );
  }

  const threads = await listForumThreads();
  const profiles = await resolveForumAuthors(threads.map((t) => t.user_id));

  return (
    <div className={forumLayoutClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <ForumPageHeader variant="list" />
        </div>
        <ForumNewThreadDialog className="shrink-0 self-start" />
      </div>
      {threads.length === 0 ? (
        <ForumNoThreads />
      ) : (
        <ThreadList threads={threads} profiles={profiles} />
      )}
    </div>
  );
}
