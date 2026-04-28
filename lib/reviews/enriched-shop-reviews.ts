import "server-only";

import {
  getDiscordUserPresentationsForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display";
import { getVisibleShopReviews } from "@/lib/supabase/shop-queries";
import type { EnrichedShopReview } from "@/lib/supabase/shop-types";

export async function getEnrichedVisibleShopReviews(): Promise<
  EnrichedShopReview[]
> {
  const reviews = await getVisibleShopReviews();
  const ids = [
    ...new Set(
      reviews
        .map((r) => normalizeDiscordUserIdForLookup(r.user_id))
        .filter((id): id is string => id != null),
    ),
  ];
  const presentations = await getDiscordUserPresentationsForUserIds(ids);
  return reviews.map((r) => {
    const key = normalizeDiscordUserIdForLookup(r.user_id);
    const p = key ? presentations.get(key) ?? null : null;
    return {
      ...r,
      author_display_name: p?.displayName ?? null,
      author_avatar_url: p?.avatarUrl ?? null,
    };
  });
}
