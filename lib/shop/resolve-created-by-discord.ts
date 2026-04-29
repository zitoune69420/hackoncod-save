import "server-only";

import { isUuid } from "@/lib/security/is-uuid";
import { createAdminClient } from "@/lib/supabase/admin";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

const APP_USERS_TABLE =
  process.env.SUPABASE_APP_USERS_TABLE?.trim() || "users";

/**
 * Interprète `shop_*.created_by` (snowflake Discord, `users.id` UUID ou `users.auth_user_id`)
 * pour obtenir un snowflake Discord (MP, avatar API, etc.).
 */
export async function resolveCreatedByToDiscordSnowflake(
  createdBy: string | null | undefined,
): Promise<string | null> {
  if (createdBy == null) return null;
  const s = String(createdBy).trim();
  if (!s) return null;
  if (DISCORD_SNOWFLAKE_RE.test(s)) return s;

  const supabase = createAdminClient();

  if (isUuid(s)) {
    const { data, error } = await supabase
      .from(APP_USERS_TABLE)
      .select("discord_user_id")
      .eq("id", s)
      .maybeSingle();
    if (error || !data) return null;
    const raw =
      (data as { discord_user_id?: string | null }).discord_user_id?.trim() ??
      "";
    return DISCORD_SNOWFLAKE_RE.test(raw) ? raw : null;
  }

  const { data: data2, error: err2 } = await supabase
    .from(APP_USERS_TABLE)
    .select("discord_user_id")
    .eq("auth_user_id", s)
    .maybeSingle();
  if (err2 || !data2) return null;
  const raw2 =
    (data2 as { discord_user_id?: string | null }).discord_user_id?.trim() ??
    "";
  return DISCORD_SNOWFLAKE_RE.test(raw2) ? raw2 : null;
}
