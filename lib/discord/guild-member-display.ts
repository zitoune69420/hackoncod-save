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
  avatar?: string | null
}

function cdnAvatarUrlForUser(userId: string, user: DiscordUserPayload): string {
  const hash = user.avatar
  if (hash) {
    const ext = hash.startsWith("a_") ? "gif" : "png"
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=64`
  }
  const disc = user.discriminator
  if (disc && disc !== "0") {
    const idx = Number(disc) % 5
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
  }
  try {
    const idx = Number(
      (BigInt(userId) >> BigInt(22)) % BigInt(6),
    )
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png"
  }
}

export type DiscordUserPresentation = {
  displayName: string | null
  /** URL absolu (avatar perso ou embed par défaut Discord). */
  avatarUrl: string | null
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
 * Pseudos + URLs d’avatar : `GET /users/{id}`, puis secours membre de guilde.
 */
export async function getDiscordUserPresentationsForUserIds(
  rawIds: readonly string[],
): Promise<Map<string, DiscordUserPresentation>> {
  const out = new Map<string, DiscordUserPresentation>()
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
      let partial: DiscordUserPresentation | null = null

      try {
        const user = await discordFetchBot<DiscordUserPayload>(`/users/${userId}`)
        const name = displayNameFromUser(user)
        const avatarUrl = cdnAvatarUrlForUser(userId, user)
        partial = { displayName: name, avatarUrl }
        if (name) {
          out.set(userId, partial)
          return
        }
      } catch {
        /* membre de guilde ci-dessous */
      }

      if (!guildId) {
        if (partial?.avatarUrl) {
          out.set(userId, {
            displayName: null,
            avatarUrl: partial.avatarUrl,
          })
        }
        return
      }

      try {
        const member = await discordFetchBot<GuildMemberPayload>(
          `/guilds/${guildId}/members/${userId}`,
        )
        const name = displayNameFromGuildMember(member)
        const u = member.user
        out.set(userId, {
          displayName: name,
          avatarUrl: u
            ? cdnAvatarUrlForUser(userId, u)
            : (partial?.avatarUrl ?? null),
        })
      } catch {
        if (partial?.avatarUrl) {
          out.set(userId, {
            displayName: partial.displayName,
            avatarUrl: partial.avatarUrl,
          })
        }
      }
    }),
  )

  return out
}

/**
 * Résout les pseudos d’abord avec `GET /users/{id}`, puis en secours
 * `GET /guilds/{guildId}/members/{id}` si `DISCORD_GUILD_ID` est défini.
 */
export async function getDiscordDisplayNamesForUserIds(
  rawIds: readonly string[],
): Promise<Map<string, string>> {
  const pres = await getDiscordUserPresentationsForUserIds(rawIds)
  const out = new Map<string, string>()
  for (const [id, p] of pres) {
    if (p.displayName) out.set(id, p.displayName)
  }
  return out
}

export function normalizeDiscordUserIdForLookup(value: unknown): string | null {
  return normalizeSnowflake(value)
}
