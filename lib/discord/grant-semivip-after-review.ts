import "server-only"

import { discordPutBotNoContent } from "@/lib/discord/discord-rest"
import {
  getDiscordGuildId,
  getDiscordRoleSemivipId,
  getDiscordBotToken,
} from "@/lib/env"

const SNOWFLAKE_RE = /^\d{5,24}$/

function asSnowflake(raw: string | undefined): string | null {
  const s = raw?.trim() ?? ""
  return SNOWFLAKE_RE.test(s) ? s : null
}

/**
 * Attribue `DISCORD_ROLE_SEMIVIP` au membre Discord (bot = Manage Roles).
 * Ne lève pas : log uniquement (l’avis est déjà en base).
 */
export async function grantSemivipRoleAfterHighRatingReview(
  discordUserId: string,
): Promise<void> {
  if (!getDiscordBotToken()) {
    console.error(
      "[grant-semivip-after-review] DISCORD_BOT_TOKEN missing; skip",
    )
    return
  }
  const guildId = asSnowflake(getDiscordGuildId())
  const roleId = asSnowflake(getDiscordRoleSemivipId())
  const memberId = asSnowflake(discordUserId)
  if (!guildId || !roleId || !memberId) {
    console.error(
      "[grant-semivip-after-review] invalid or missing guild, role, or member id; skip",
    )
    return
  }
  try {
    await discordPutBotNoContent(
      `/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[grant-semivip-after-review] Discord API:", msg)
  }
}
