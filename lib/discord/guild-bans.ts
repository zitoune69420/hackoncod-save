import "server-only";

import { getDiscordBotToken } from "@/lib/env";
import { DISCORD_API_BASE, discordFetchBot } from "./discord-rest";

const SNOWFLAKE_RE = /^\d{5,24}$/;

function normalizeSnowflake(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!SNOWFLAKE_RE.test(s)) return null;
  return s;
}

/** Pour la blacklist admin : ID Discord dans `user_id`, ou champ `discord` si c’est un snowflake. */
export function discordSnowflakeFromBlacklistFields(
  userId: string | null,
  discordField: string | null,
): string | null {
  return normalizeSnowflake(userId) ?? normalizeSnowflake(discordField);
}

/** Utilisateur dans un objet ban Discord. */
export type DiscordBanUserPayload = {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
};

export type DiscordBanPayload = {
  user: DiscordBanUserPayload;
  reason: string | null;
};

function cdnAvatarUrlForUser(userId: string, user: DiscordBanUserPayload): string {
  const hash = user.avatar;
  if (hash) {
    const ext = hash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=64`;
  }
  const disc = user.discriminator;
  if (disc && disc !== "0") {
    const idx = Number(disc) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }
  try {
    const idx = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

export function displayNameFromBanUser(user: DiscordBanUserPayload): string {
  const global = user.global_name?.trim();
  if (global) return global;
  const un = user.username?.trim();
  if (!un) return user.id;
  if (user.discriminator && user.discriminator !== "0") {
    return `${un}#${user.discriminator}`;
  }
  return un;
}

export function presentationFromBanUser(
  userId: string,
  user: DiscordBanUserPayload,
): { displayName: string; avatarUrl: string } {
  return {
    displayName: displayNameFromBanUser(user),
    avatarUrl: cdnAvatarUrlForUser(userId, user),
  };
}

/**
 * Tous les bannissements du serveur (`GET /guilds/.../bans`), paginé (`after`).
 * Nécessite que le bot ait la permission BAN_MEMBERS.
 */
export async function getAllGuildBans(
  rawGuildId: string,
): Promise<DiscordBanPayload[]> {
  const guildId = normalizeSnowflake(rawGuildId);
  if (!guildId) return [];

  const all: DiscordBanPayload[] = [];
  let after: string | undefined;

  for (;;) {
    const params = new URLSearchParams({ limit: "1000" });
    if (after) params.set("after", after);
    const chunk = await discordFetchBot<DiscordBanPayload[]>(
      `/guilds/${guildId}/bans?${params}`,
    );
    if (!chunk?.length) break;
    all.push(...chunk);
    if (chunk.length < 1000) break;
    const lastId = chunk[chunk.length - 1]?.user?.id;
    if (!lastId) break;
    after = lastId;
  }

  return all;
}

/**
 * Ban serveur pour un utilisateur (`GET /guilds/.../bans/...`).
 * Retourne null si non banni, 404, token/guild absents, ou erreur API (on ne bloque pas le site si Discord est down).
 */
export async function fetchGuildBanIfAny(
  rawUserId: string,
): Promise<DiscordBanPayload | null> {
  const guildId = normalizeSnowflake(process.env.DISCORD_GUILD_ID ?? "");
  const userId = normalizeSnowflake(rawUserId);
  if (!guildId || !userId) return null;
  const token = getDiscordBotToken()?.trim();
  if (!token) return null;
  try {
    const res = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/bans/${userId}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 0 },
      },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn("[guild-bans] fetchGuildBanIfAny HTTP", res.status);
      return null;
    }
    return (await res.json()) as DiscordBanPayload;
  } catch (e) {
    console.error("[guild-bans] fetchGuildBanIfAny", e);
    return null;
  }
}

const GUILD_BAN_REASON_MAX = 512;

export type GuildBanPutResult =
  | { ok: true }
  | { ok: false; status: number; detail?: string };

/**
 * Bannit un utilisateur sur le serveur configuré (`DISCORD_GUILD_ID`).
 * Succès : 204 (ou 200). Ne lève pas — journalise les erreurs (permissions, utilisateur introuvable, etc.).
 */
export async function putGuildBanMember(
  rawUserId: string,
  options?: { reason?: string | null },
): Promise<GuildBanPutResult> {
  const guildId = normalizeSnowflake(process.env.DISCORD_GUILD_ID ?? "");
  const userId = normalizeSnowflake(rawUserId);
  if (!guildId || !userId) {
    return { ok: false, status: 0, detail: "missing_guild_or_user_id" };
  }
  const token = getDiscordBotToken()?.trim();
  if (!token) {
    return { ok: false, status: 0, detail: "missing_bot_token" };
  }

  let reason = (options?.reason ?? "").trim().slice(0, GUILD_BAN_REASON_MAX);
  if (!reason) reason = "Hackoncod — liste noire / blocage site";

  try {
    const res = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/bans/${userId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ delete_message_seconds: 0, reason }),
        next: { revalidate: 0 },
      },
    );

    if (res.status === 204 || res.status === 200) {
      return { ok: true };
    }

    const text = await res.text().catch(() => "");
    console.warn(
      "[guild-bans] putGuildBanMember HTTP",
      res.status,
      text.slice(0, 300),
    );
    return { ok: false, status: res.status, detail: text.slice(0, 200) };
  } catch (e) {
    console.error("[guild-bans] putGuildBanMember", e);
    return { ok: false, status: 0, detail: "fetch_error" };
  }
}

/** Ban Discord best-effort : ignore si pas d’ID ou config incomplète. */
export async function tryGuildBanMemberForBlock(
  discordUserId: string | null | undefined,
  reason: string | null,
): Promise<void> {
  const id = normalizeSnowflake(discordUserId ?? "");
  if (!id) return;
  const r = await putGuildBanMember(id, { reason });
  if (!r.ok) {
    console.warn("[guild-bans] tryGuildBanMemberForBlock failed", id, r);
  }
}
