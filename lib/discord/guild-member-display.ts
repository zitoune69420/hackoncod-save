import "server-only"

import { discordFetchBot } from "./discord-rest"

const SNOWFLAKE_RE = /^\d{5,24}$/

function normalizeSnowflake(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!SNOWFLAKE_RE.test(s)) return null
  return s
}

/** Réponse `GET /users/{user.id}` (Discord API v10). */
type DiscordUserPayload = {
  id?: string
  username?: string
  discriminator?: string
  global_name?: string | null
}

function displayNameFromUser(user: DiscordUserPayload): string | null {
  const global = user.global_name?.trim()
  if (global) return global
  const un = user.username?.trim()
  if (!un) return null
  const disc = user.discriminator
  if (disc && disc !== "0") return `${un}#${disc}`
  return un
}

type GuildMemberPayload = {
  nick?: string | null
  user?: DiscordUserPayload | null
}

function displayNameFromGuildMember(member: GuildMemberPayload): string | null {
  const nick = member.nick?.trim()
  if (nick) return nick
  const u = member.user
  return u ? displayNameFromUser(u) : null
}

/**
 * Résout les pseudos d’abord avec `GET /users/{id}`, puis en secours
 * `GET /guilds/{guildId}/members/{id}` si `DISCORD_GUILD_ID` est défini.
 */
export async function getDiscordDisplayNamesForUserIds(
  rawIds: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!process.env.DISCORD_BOT_TOKEN?.trim()) return out

  const guildId = normalizeSnowflake(process.env.DISCORD_GUILD_ID)

  const unique = [
    ...new Set(
      rawIds
        .map((id) => normalizeSnowflake(id))
        .filter((id): id is string => id != null),
    ),
  ]

  await Promise.all(
    unique.map(async (userId) => {
      try {
        const user = await discordFetchBot<DiscordUserPayload>(`/users/${userId}`)
        const name = displayNameFromUser(user)
        if (name) {
          out.set(userId, name)
          return
        }
      } catch {
        /* tenter le membre du serveur ci-dessous */
      }

      if (!guildId) return
      try {
        const member = await discordFetchBot<GuildMemberPayload>(
          `/guilds/${guildId}/members/${userId}`,
        )
        const name = displayNameFromGuildMember(member)
        if (name) out.set(userId, name)
      } catch {
        /* inchangé */
      }
    }),
  )

  return out
}

export function normalizeDiscordUserIdForLookup(value: unknown): string | null {
  return normalizeSnowflake(value)
}
