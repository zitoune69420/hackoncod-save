import "server-only";

import {
  getDiscordDisplayNamesForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display";
import { getReviews } from "@/lib/supabase/queries";
import type { Review } from "@/lib/supabase/types";

/** Même enrichissement que `GET /api/reviews` (noms Discord manquants en base). */
export async function getEnrichedPublicReviews(
  offset: number,
  limit: number,
): Promise<Review[]> {
  const reviews = await getReviews(offset, limit);
  const missingNames = reviews.filter(
    (r) => !r.author_name?.trim() && r.user_id?.trim(),
  );
  const idsForDiscord = missingNames.map((r) => r.user_id as string);
  const displayNames = await getDiscordDisplayNamesForUserIds(idsForDiscord);
  return reviews.map((r) => {
    const fromDb = r.author_name?.trim() || null;
    if (fromDb) return { ...r, author_name: fromDb };
    const key = normalizeDiscordUserIdForLookup(r.user_id);
    const fromApi = key ? displayNames.get(key) ?? null : null;
    return { ...r, author_name: fromApi };
  });
}
