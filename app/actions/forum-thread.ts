"use server";

import { revalidatePath } from "next/cache";
import { normalizeForumMarkdownSource } from "@/lib/forum/normalize-forum-markdown-source";
import {
  getCurrentUserAccess,
  getDiscordUserIdForAuthUser,
} from "@/lib/permissions-server";
import { insertForumThread } from "@/lib/supabase/forum-queries";

export type CreateForumThreadResult =
  | { ok: true; threadId: string }
  | {
      ok: false;
      error: "unauthorized" | "invalid" | "server";
    };

export async function createForumThreadAction(input: {
  title: string;
  content: string;
}): Promise<CreateForumThreadResult> {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated || !access.session?.user) {
    return { ok: false, error: "unauthorized" };
  }
  const u = access.session.user;
  const forumUserId =
    (await getDiscordUserIdForAuthUser(u.id, u.image)) ?? u.id.trim();
  if (!forumUserId) {
    return { ok: false, error: "invalid" };
  }

  const title = (input.title ?? "").trim().slice(0, 200);
  const content = normalizeForumMarkdownSource(input.content ?? "").trim().slice(0, 20_000);
  if (!title || !content) {
    return { ok: false, error: "invalid" };
  }

  const inserted = await insertForumThread({
    user_id: forumUserId,
    title,
    content,
    pinned: false,
  });

  if (!inserted?.id) {
    return { ok: false, error: "server" };
  }

  revalidatePath("/dashboard");
  return { ok: true, threadId: inserted.id };
}
