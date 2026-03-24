import "server-only";

import { decryptOAuthToken } from "better-auth/oauth2";
import { auth } from "@/app/auth";
import {
  type Permission,
  type UserRole,
  USER_ROLES,
  getRolePermissions,
} from "@/lib/permissions";
import {
  DISCORD_API_BASE,
  discordBotHeaders,
} from "@/lib/discord/discord-rest";

type DiscordGuild = {
  id: string;
};

type DiscordInvite = {
  guild?: DiscordGuild | null;
};

type DiscordGuildMember = {
  roles?: string[];
};

type SessionUserLike = {
  id?: string | null;
  image?: string | null;
};

const ROLE_PRIORITY: UserRole[] = [
  "founder",
  "partner",
  "premium",
  "vip",
  "semivip",
  "user",
] as const;

const DEFAULT_DISCORD_GUILD_INVITE_CODE = "cod-fr";
let cachedDiscordGuildId: string | null = null;

function getDiscordUserIdFromImage(
  image: string | null | undefined,
): string | null {
  if (!image) {
    return null;
  }

  const match = image.match(/cdn\.discordapp\.com\/avatars\/(\d+)\//i);
  return match?.[1] ?? null;
}

function getConfiguredDiscordRoleIds(): Partial<Record<UserRole, string>> {
  return {
    founder: process.env.DISCORD_ROLE_FOUNDER?.trim(),
    partner: process.env.DISCORD_ROLE_PARTNER?.trim(),
    premium: process.env.DISCORD_ROLE_PREMIUM?.trim(),
    vip: process.env.DISCORD_ROLE_VIP?.trim(),
    semivip: process.env.DISCORD_ROLE_SEMIVIP?.trim(),
  };
}

function getRoleFromDiscordRoleIds(roleIds: readonly string[]): UserRole {
  const configured = getConfiguredDiscordRoleIds();

  for (const role of ROLE_PRIORITY) {
    if (role === "user") {
      return "user";
    }

    const configuredRoleId = configured[role];
    if (configuredRoleId && roleIds.includes(configuredRoleId)) {
      return role;
    }
  }

  return "user";
}

async function fetchDiscordBot<T>(path: string): Promise<T> {
  const res = await fetch(`${DISCORD_API_BASE}${path}`, {
    headers: discordBotHeaders(),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function resolveDiscordGuildId(): Promise<string | null> {
  const configuredGuildId = process.env.DISCORD_GUILD_ID?.trim();
  if (configuredGuildId) {
    return configuredGuildId;
  }

  if (cachedDiscordGuildId) {
    return cachedDiscordGuildId;
  }

  const inviteCode =
    process.env.DISCORD_GUILD_INVITE_CODE?.trim() ||
    DEFAULT_DISCORD_GUILD_INVITE_CODE;

  if (!inviteCode) {
    return null;
  }

  try {
    const invite = await fetchDiscordBot<DiscordInvite>(
      `/invites/${encodeURIComponent(inviteCode)}?with_counts=false&with_expiration=false`,
    );
    const guildId = invite.guild?.id ?? null;

    if (guildId) {
      cachedDiscordGuildId = guildId;
    }

    return guildId;
  } catch (error) {
    console.error("[permissions] unable to resolve Discord guild", error);
    return null;
  }
}

async function fetchDiscordGuildMember(
  guildId: string,
  discordUserId: string,
): Promise<DiscordGuildMember | null> {
  const res = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
    {
      headers: discordBotHeaders(),
      next: { revalidate: 0 },
    },
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord member ${res.status}: ${text}`);
  }

  return (await res.json()) as DiscordGuildMember;
}

async function resolveDiscordUserIdForAppUser(
  appUserId: string,
): Promise<string | null> {
  const context = await auth.$context;
  const accounts = await context.internalAdapter.findAccounts(appUserId);
  const discordAccount = accounts.find(
    (account) => account.providerId === "discord",
  );

  if (!discordAccount) {
    return null;
  }

  if (discordAccount.accountId) {
    return String(discordAccount.accountId);
  }

  if (!discordAccount.accessToken) {
    return null;
  }

  try {
    const accessToken = await decryptOAuthToken(
      discordAccount.accessToken,
      context,
    );
    if (!accessToken) {
      return null;
    }

    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return null;
    }

    const profile = (await res.json()) as { id?: string };
    return profile.id ? String(profile.id) : null;
  } catch {
    return null;
  }
}

export async function resolveUserRoleForUserId(
  appUserId: string | null | undefined,
  user?: SessionUserLike | null,
): Promise<UserRole> {
  if (!appUserId) {
    return "user";
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    return "user";
  }

  const discordUserId =
    (await resolveDiscordUserIdForAppUser(appUserId)) ??
    getDiscordUserIdFromImage(user?.image);
  if (!discordUserId) {
    return "user";
  }

  try {
    const guildId = await resolveDiscordGuildId();
    if (!guildId) {
      return "user";
    }

    const member = await fetchDiscordGuildMember(guildId, discordUserId);
    if (!member) {
      return "user";
    }

    const memberRoleIds = member.roles ?? [];
    if (memberRoleIds.length === 0) {
      return "user";
    }

    return getRoleFromDiscordRoleIds(memberRoleIds);
  } catch (error) {
    console.error("[permissions] unable to resolve Discord role", error);
    return "user";
  }
}

export async function getResolvedPermissionsForUserId(
  appUserId: string | null | undefined,
  user?: SessionUserLike | null,
): Promise<readonly Permission[]> {
  const role = await resolveUserRoleForUserId(appUserId, user);
  return getRolePermissions(role);
}

export function isResolvedUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
