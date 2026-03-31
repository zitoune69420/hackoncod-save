import "server-only";

import { discordFetchBot } from "./discord-rest";

const SNOWFLAKE_RE = /^\d{5,24}$/;

function normalizeSnowflake(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!SNOWFLAKE_RE.test(s)) return null;
  return s;
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
