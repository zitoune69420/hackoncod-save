"use server";

import { revalidatePath } from "next/cache";
import { normalizeForumMarkdownSource } from "@/lib/forum/normalize-forum-markdown-source";
import {
  getDiscordUserIdForAuthUser,
  getCurrentUserAccess,
} from "@/lib/permissions-server";
import { isUuid } from "@/lib/security/is-uuid";
import {
  getForumThreadById,
  insertForumComment,
  listForumCommentsForThread,
} from "@/lib/supabase/forum-queries";

export type PostForumCommentResult =
  | { ok: true }
  | {
      ok: false;
      error: "unauthorized" | "invalid" | "not_found" | "server";
    };

export async function postForumCommentAction(input: {
  threadId: string;
  message: string;
  parentId?: string | null;
}): Promise<PostForumCommentResult> {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated || !access.session?.user) {
    return { ok: false, error: "unauthorized" };
  }
  const u = access.session.user;
  /** Snowflake Discord si compte lié, sinon ID Better Auth (affichage via `resolveForumAuthors`). */
  const forumUserId =
    (await getDiscordUserIdForAuthUser(u.id, u.image)) ?? u.id.trim();
  if (!forumUserId) {
    return { ok: false, error: "invalid" };
  }

  const threadId = input.threadId?.trim() ?? "";
  if (!isUuid(threadId)) {
    return { ok: false, error: "invalid" };
  }

  const message = normalizeForumMarkdownSource(input.message ?? "").trim().slice(0, 10_000);
  if (!message) {
    return { ok: false, error: "invalid" };
  }

  let parentId = input.parentId?.trim() || null;
  if (parentId && !isUuid(parentId)) {
    return { ok: false, error: "invalid" };
  }

  const thread = await getForumThreadById(threadId);
  if (!thread) {
    return { ok: false, error: "not_found" };
  }

  if (parentId) {
    const comments = await listForumCommentsForThread(threadId);
    const parentOk = comments.some((c) => c.id === parentId);
    if (!parentOk) {
      return { ok: false, error: "invalid" };
    }
  }

  const row = await insertForumComment({
    id: crypto.randomUUID(),
    thread_id: threadId,
    user_id: forumUserId,
    message,
    parent_id: parentId,
  });

  if (!row) {
    return { ok: false, error: "server" };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
