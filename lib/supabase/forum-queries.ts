import "server-only";

import { createAdminClient } from "./admin";

/** Table `public.thread` */
export type ForumThreadRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  content: string | null;
  pinned: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

/** Table `public.comment` (corps : `message`) */
export type ForumCommentRow = {
  id: string;
  thread_id: string | null;
  user_id: string | null;
  parent_id: string | null;
  message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function listForumThreads(): Promise<ForumThreadRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("thread")
    .select(
      "id, user_id, title, content, pinned, created_at, updated_at",
    )
    .order("pinned", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[forum-queries] listForumThreads", error.message, error.code);
    return [];
  }
  return (data ?? []) as ForumThreadRow[];
}

export async function getForumThreadById(
  id: string,
): Promise<ForumThreadRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("thread")
    .select("id, user_id, title, content, pinned, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[forum-queries] getForumThreadById", error.message, error.code);
    return null;
  }
  return data as ForumThreadRow | null;
}

export async function listForumCommentsForThread(
  threadId: string,
): Promise<ForumCommentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("comment")
    .select("id, thread_id, user_id, parent_id, message, created_at, updated_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "[forum-queries] listForumCommentsForThread",
      error.message,
      error.code,
    );
    return [];
  }
  return (data ?? []) as ForumCommentRow[];
}

export type ForumThreadInsert = {
  user_id: string;
  title: string;
  content: string;
  pinned?: boolean | null;
};

export async function insertForumThread(
  row: ForumThreadInsert,
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("thread")
    .insert({
      user_id: row.user_id,
      title: row.title,
      content: row.content,
      pinned: row.pinned ?? false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[forum-queries] insertForumThread", error.message, error.code);
    return null;
  }
  const id = (data as { id?: string })?.id;
  return id ? { id } : null;
}

export async function updateForumThreadContent(
  threadId: string,
  authorUserId: string,
  content: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("thread")
    .select("user_id")
    .eq("id", threadId)
    .maybeSingle();

  if (fetchErr || !existing) return false;
  if (String((existing as { user_id?: string }).user_id ?? "") !== authorUserId) {
    return false;
  }

  const { error } = await supabase
    .from("thread")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) {
    console.error(
      "[forum-queries] updateForumThreadContent",
      error.message,
      error.code,
    );
    return false;
  }
  return true;
}

export async function touchForumThreadUpdatedAt(threadId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("thread")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) {
    console.error(
      "[forum-queries] touchForumThreadUpdatedAt",
      error.message,
      error.code,
    );
  }
}

export type ForumCommentInsert = {
  id: string;
  thread_id: string;
  user_id: string;
  message: string;
  parent_id?: string | null;
};

export async function insertForumComment(
  row: ForumCommentInsert,
): Promise<ForumCommentRow | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("comment")
    .insert({
      id: row.id,
      thread_id: row.thread_id,
      user_id: row.user_id,
      message: row.message,
      parent_id: row.parent_id ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("id, thread_id, user_id, parent_id, message, created_at, updated_at")
    .single();

  if (error) {
    console.error("[forum-queries] insertForumComment", error.message, error.code);
    return null;
  }

  await touchForumThreadUpdatedAt(row.thread_id);
  return data as ForumCommentRow;
}
