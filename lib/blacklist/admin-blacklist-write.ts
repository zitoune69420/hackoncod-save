import "server-only";

import {
  getDiscordUserPresentationsForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display";
import type { BlacklistUpsertRow } from "@/lib/supabase/queries";

function nullIfEmpty(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t === "" ? null : t;
}

/** Corps attendu depuis le client (sans `discord` ni `added_by`). */
export function parseBlacklistWriteBody(
  raw: unknown,
): { user_id: string; reason: string | null } | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const user_id =
    typeof o.user_id === "string" ? o.user_id.trim() : "";
  if (!user_id || !normalizeDiscordUserIdForLookup(user_id)) return null;
  return {
    user_id,
    reason: nullIfEmpty(o.reason),
  };
}

export async function buildBlacklistUpsertRow(input: {
  user_id: string;
  reason: string | null;
  added_by: string | null;
}): Promise<BlacklistUpsertRow> {
  const pres = await getDiscordUserPresentationsForUserIds([input.user_id]);
  const key = normalizeDiscordUserIdForLookup(input.user_id);
  const discordDisplay = key ? (pres.get(key)?.displayName ?? null) : null;
  return {
    user_id: input.user_id,
    discord: discordDisplay,
    reason: input.reason,
    added_by: input.added_by,
  };
}
