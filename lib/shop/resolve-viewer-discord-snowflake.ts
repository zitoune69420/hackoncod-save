import "server-only";

import { findDiscordAccountId } from "@/lib/banned/site-ban-db";
import { extractDiscordSnowflakeFromAvatarUrl } from "@/lib/discord/extract-discord-snowflake-from-avatar";
import { getDiscordUserIdForAuthUser } from "@/lib/permissions-server";
import { getAuthUserDiscordSnowflake } from "@/lib/supabase/app-users";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

/**
 * Snowflake Discord du visiteur (session Better Auth), avec replis alignés sur la création de commande.
 */
export async function resolveViewerDiscordSnowflake(user: {
  id: string;
  image?: string | null;
}): Promise<string | null> {
  let discordId = await getDiscordUserIdForAuthUser(user.id, user.image);
  if (!discordId) {
    discordId = await findDiscordAccountId(user.id);
  }
  if (!discordId && DISCORD_SNOWFLAKE_RE.test(user.id)) {
    discordId = user.id;
  }
  if (!discordId) {
    discordId = extractDiscordSnowflakeFromAvatarUrl(user.image);
  }
  if (!discordId) {
    discordId = await getAuthUserDiscordSnowflake(user.id);
  }
  return discordId;
}
