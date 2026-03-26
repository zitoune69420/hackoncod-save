import { createAdminClient } from "./admin"
import type { Review } from "./types"

/**
 * Colonne `author_name` (text, nullable) — si l’insert échoue :
 * `alter table public.review add column if not exists author_name text;`
 */
export async function insertReviewDb(
  userId: string,
  message: string,
  note: number,
  authorDisplayName: string | null,
): Promise<Review> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("review")
    .insert({
      user_id: userId,
      message: message.trim(),
      note,
      author_name: authorDisplayName?.trim() || null,
    })
    .select("id, user_id, message, note, author_name, created_at, updated_at")
    .single()

  if (error) {
    console.error(
      "[review-insert] error:",
      error.message,
      error.code,
      error.details,
    )
    throw new Error(`Supabase: ${error.message} (${error.code})`)
  }

  if (!data) {
    throw new Error("Supabase: insert review returned no row")
  }

  return data as Review
}
