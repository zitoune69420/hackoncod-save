import "server-only";

import type { AuthContext } from "@better-auth/core";
import { decryptOAuthToken } from "better-auth/oauth2";
import { headers } from "next/headers";
import { auth } from "@/app/auth";
import { DISCORD_API_BASE, discordFetchBot } from "@/lib/discord/discord-rest";
import {
  ACCESS_ROLES,
  getHighestRole,
  getRoleLevel,
  getRolePermissions,
  type Permission,
  type UserRole,
} from "@/lib/permissions";
import {
  getAppUserRole,
  upsertAppUserFromSession,
} from "@/lib/supabase/app-users";

type DiscordGuildMember = {
  roles?: string[];
};

type DiscordUserProfile = {
  id?: string;
};

type SessionUserLike = {
  id?: string | null;
  image?: string | null;
};

type SessionLike = Awaited<ReturnType<typeof auth.api.getSession>>;

type ServerUserAccess = {
  isAuthenticated: boolean;
  permissions: readonly Permission[];
  role: UserRole;
  session: SessionLike | null;
};

/** `db` = rôle lu dans Supabase (menus / `/api/discord/me`). `live` = Discord à chaque appel + mise à jour DB (routes sensibles). */
export type UserAccessSource = "db" | "live";

/** Mets `DEBUG_DISCORD_ROLES=1` dans `.env.local` pour tracer la réponse Discord et le rôle retenu. */
function discordRolesDebugEnabled(): boolean {
  const v = process.env.DEBUG_DISCORD_ROLES?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const DISCORD_ROLE_ENV_KEYS: Record<Permission, string> = {
  semivip: "DISCORD_ROLE_SEMIVIP",
  vip: "DISCORD_ROLE_VIP",
  premium: "DISCORD_ROLE_PREMIUM",
  partner: "DISCORD_ROLE_PARTNER",
  founder: "DISCORD_ROLE_FOUNDER",
};

/** IDs Discord associés à un rôle app (VIP peut avoir `DISCORD_ROLE_VIP` + alias `DISCORD_ROLE_VIP2`). */
function getDiscordIdsForAppPermission(permission: Permission): string[] {
  const envKey = DISCORD_ROLE_ENV_KEYS[permission];
  const primary = normalizeDiscordSnowflake(process.env[envKey]);
  const out: string[] = [];
  if (primary) out.push(primary);
  if (permission === "vip") {
    const v2 = normalizeDiscordSnowflake(process.env.DISCORD_ROLE_VIP2);
    if (v2 && !out.includes(v2)) out.push(v2);
  }
  return out;
}

function memberDiscordRoleMatchesAppPermission(
  discordRoleId: string,
  permission: Permission,
): boolean {
  return getDiscordIdsForAppPermission(permission).includes(discordRoleId);
}

function getDiscordGuildId(): string | null {
  const guildId = normalizeDiscordSnowflake(process.env.DISCORD_GUILD_ID);
  return guildId || null;
}

/** Snowflake Discord (chaîne numérique). Évite les mismatches string/number ou espaces. */
function normalizeDiscordSnowflake(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!/^\d{5,24}$/.test(s)) return null;
  return s;
}

let loggedDuplicateEnvIds = false;

function getConfiguredDiscordRoleIds(): Partial<Record<Permission, string>> {
  const configured: Partial<Record<Permission, string>> = {};

  for (const role of ACCESS_ROLES) {
    const envKey = DISCORD_ROLE_ENV_KEYS[role];
    const roleId = normalizeDiscordSnowflake(process.env[envKey]);
    if (roleId) {
      configured[role] = roleId;
    }
  }

  if (!loggedDuplicateEnvIds && process.env.NODE_ENV !== "test") {
    loggedDuplicateEnvIds = true;
    const byId = new Map<string, Set<Permission>>();
    for (const r of ACCESS_ROLES) {
      const id = configured[r];
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id)!.add(r);
    }
    const vip2Id = normalizeDiscordSnowflake(process.env.DISCORD_ROLE_VIP2);
    if (vip2Id) {
      if (!byId.has(vip2Id)) byId.set(vip2Id, new Set());
      byId.get(vip2Id)!.add("vip");
    }
    for (const [id, perms] of byId) {
      if (perms.size > 1) {
        console.warn(
          "[roles] Plusieurs DISCORD_ROLE_* pointent vers le même ID Discord → rôle effet « le plus bas » par membre, mais vérifie ton .env :",
          [...perms].join(", "),
          "…" + id.slice(-8),
        );
      }
    }
  }

  return configured;
}

function getDiscordUserIdFromImage(
  image: string | null | undefined,
): string | null {
  if (!image) {
    return null;
  }

  const match = image.match(/cdn\.discordapp\.com\/avatars\/(\d+)\//i);
  return match?.[1] ? normalizeDiscordSnowflake(match[1]) : null;
}

async function fetchDiscordGuildMember(
  guildId: string,
  discordUserId: string,
): Promise<DiscordGuildMember | null> {
  const gId = normalizeDiscordSnowflake(guildId);
  const uId = normalizeDiscordSnowflake(discordUserId);
  if (!gId || !uId) {
    return null;
  }
  try {
    const member = await discordFetchBot<DiscordGuildMember>(
      `/guilds/${gId}/members/${uId}`,
    );
    if (discordRolesDebugEnabled()) {
      console.log(
        "[discord-roles-debug] GET guilds/…/members/… — corps JSON Discord :",
        JSON.stringify(member),
      );
    }
    return member;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Discord API 404:")
    ) {
      return null;
    }

    throw error;
  }
}

/** ID Discord (snowflake) lié au compte Better Auth — pour stockage métier (`review.user_id`, etc.). */
export async function getDiscordUserIdForAuthUser(
  appUserId: string,
  image: string | null | undefined,
): Promise<string | null> {
  const context = await auth.$context;
  const accounts = await context.internalAdapter.findAccounts(appUserId);
  const discordAccount = accounts.find(
    (account) => account.providerId === "discord",
  );

  if (discordAccount?.accountId) {
    const id = normalizeDiscordSnowflake(discordAccount.accountId);
    if (discordRolesDebugEnabled()) {
      console.log(
        "[discord-roles-debug] user_id Discord ← compte Better Auth (accountId) :",
        id,
      );
    }
    return id;
  }

  if (discordAccount?.accessToken) {
    try {
      const accessToken = await decryptOAuthToken(
        discordAccount.accessToken,
        context as unknown as AuthContext,
      );

      if (accessToken) {
        const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          next: { revalidate: 0 },
        });

        if (res.ok) {
          const profile = (await res.json()) as DiscordUserProfile;
          if (discordRolesDebugEnabled()) {
            console.log(
              "[discord-roles-debug] GET /users/@me (OAuth) — JSON :",
              JSON.stringify(profile),
            );
          }
          if (profile.id != null) {
            return normalizeDiscordSnowflake(profile.id);
          }
        } else if (discordRolesDebugEnabled()) {
          const body = await res.text().catch(() => "");
          console.log(
            "[discord-roles-debug] GET /users/@me échoué :",
            res.status,
            body.slice(0, 200),
          );
        }
      }
    } catch (error) {
      console.error(
        "[roles] unable to resolve Discord user via access token",
        error,
      );
    }
  }

  const fromImage = getDiscordUserIdFromImage(image);
  if (discordRolesDebugEnabled()) {
    console.log(
      "[discord-roles-debug] user_id Discord ← avatar session (ou null) :",
      fromImage,
    );
  }
  return fromImage;
}

function resolveRoleFromDiscordRoleIds(roleIds: readonly unknown[]): UserRole {
  const configuredRoleIds = getConfiguredDiscordRoleIds();
  const matched: UserRole[] = [];
  const normalizedMemberRoles = roleIds
    .map((id) => normalizeDiscordSnowflake(id))
    .filter((id): id is string => id != null);

  for (const discordRoleId of normalizedMemberRoles) {
    const appRoles = ACCESS_ROLES.filter((r) =>
      memberDiscordRoleMatchesAppPermission(discordRoleId, r),
    );
    if (appRoles.length === 0) continue;
    if (appRoles.length > 1) {
      const least = appRoles.reduce((a, b) =>
        getRoleLevel(a) <= getRoleLevel(b) ? a : b,
      );
      console.warn(
        "[roles] Même ID Discord utilisé dans plusieurs variables d’environnement :",
        appRoles.join(", "),
        "— rôle conservé (moindre privilège) :",
        least,
      );
      matched.push(least);
    } else {
      matched.push(appRoles[0]!);
    }
  }

  const uniqueMatched = [...new Set(matched)];
  const highest = getHighestRole(uniqueMatched);

  if (discordRolesDebugEnabled()) {
    const envRoleDump: Record<string, string> = Object.fromEntries(
      ACCESS_ROLES.map((r) => [
        DISCORD_ROLE_ENV_KEYS[r],
        configuredRoleIds[r] ?? "(non défini)",
      ]),
    );
    const vip2Env = normalizeDiscordSnowflake(process.env.DISCORD_ROLE_VIP2);
    if (vip2Env) envRoleDump.DISCORD_ROLE_VIP2 = vip2Env;
    console.log(
      "[discord-roles-debug] DISCORD_ROLE_* (env) → id Discord :",
      envRoleDump,
    );
    console.log(
      "[discord-roles-debug] role_ids sur le membre (normalisés) :",
      normalizedMemberRoles,
    );
    const unmatched = normalizedMemberRoles.filter(
      (rid) =>
        !ACCESS_ROLES.some((r) => memberDiscordRoleMatchesAppPermission(rid, r)),
    );
    if (unmatched.length > 0) {
      console.log(
        "[discord-roles-debug] ids Discord du membre sans entrée DISCORD_ROLE_* (ignorés pour l’app) :",
        unmatched,
      );
    }
    console.log(
      "[discord-roles-debug] rôles app reconnus → niveau",
      uniqueMatched.map((r) => ({ role: r, level: getRoleLevel(r) })),
    );
    console.log(
      "[discord-roles-debug] rôle le plus haut (getHighestRole) :",
      highest,
      "niveau",
      getRoleLevel(highest),
    );
  }

  return highest;
}

async function resolveDiscordRoleForUser(
  appUserId: string,
  image: string | null | undefined,
): Promise<UserRole> {
  const guildId = getDiscordGuildId();
  if (!guildId || !process.env.DISCORD_BOT_TOKEN) {
    return "user";
  }

  const discordUserId = await getDiscordUserIdForAuthUser(appUserId, image);
  if (!discordUserId) {
    return "user";
  }

  const member = await fetchDiscordGuildMember(guildId, discordUserId);
  if (!member?.roles?.length) {
    return "user";
  }

  return resolveRoleFromDiscordRoleIds(member.roles as unknown[]);
}

export type DiscordRoleDebugPayload = {
  guildIdOk: boolean;
  botTokenOk: boolean;
  /** Suffixe masqué du compte Discord résolu, ou null */
  discordUserIdSuffix: string | null;
  memberRolesCount: number;
  memberRoleSuffixes: string[];
  envRoleConfigured: Partial<Record<Permission, boolean>>;
  envIdSuffixes: Partial<Record<Permission, string>>;
  resolutionSteps: Array<{
    memberRoleSuffix: string;
    matchedAppRoles: Permission[];
    kept: Permission;
  }>;
  resolvedRole: UserRole;
};

/** Détails de résolution (IDs partiellement masqués). À n’exposer que derrière auth + env. */
export async function getDiscordRoleResolutionDebug(
  appUserId: string,
  user: SessionUserLike | null | undefined,
): Promise<DiscordRoleDebugPayload> {
  const guildId = getDiscordGuildId();
  const botTokenOk = Boolean(process.env.DISCORD_BOT_TOKEN?.trim());
  const configured = getConfiguredDiscordRoleIds();
  const envRoleConfigured: Partial<Record<Permission, boolean>> = {};
  const envIdSuffixes: Partial<Record<Permission, string>> = {};
  for (const r of ACCESS_ROLES) {
    const ids = getDiscordIdsForAppPermission(r);
    envRoleConfigured[r] = ids.length > 0;
    const id0 = ids[0];
    if (id0) envIdSuffixes[r] = "…" + id0.slice(-8);
  }

  if (!guildId || !botTokenOk) {
    return {
      guildIdOk: Boolean(guildId),
      botTokenOk,
      discordUserIdSuffix: null,
      memberRolesCount: 0,
      memberRoleSuffixes: [],
      envRoleConfigured,
      envIdSuffixes,
      resolutionSteps: [],
      resolvedRole: "user",
    };
  }

  const discordUserId = await getDiscordUserIdForAuthUser(appUserId, user?.image);
  if (!discordUserId) {
    return {
      guildIdOk: true,
      botTokenOk: true,
      discordUserIdSuffix: null,
      memberRolesCount: 0,
      memberRoleSuffixes: [],
      envRoleConfigured,
      envIdSuffixes,
      resolutionSteps: [],
      resolvedRole: "user",
    };
  }

  const member = await fetchDiscordGuildMember(guildId, discordUserId);
  const rawRoles = member?.roles ?? [];
  const normalizedMemberRoles = rawRoles
    .map((id) => normalizeDiscordSnowflake(id as unknown))
    .filter((id): id is string => id != null);

  const resolutionSteps: DiscordRoleDebugPayload["resolutionSteps"] = [];
  const matched: UserRole[] = [];

  for (const discordRoleId of normalizedMemberRoles) {
    const appRoles = ACCESS_ROLES.filter((r) =>
      memberDiscordRoleMatchesAppPermission(discordRoleId, r),
    );
    if (appRoles.length === 0) continue;
    const kept: Permission =
      appRoles.length > 1
        ? appRoles.reduce((a, b) =>
            getRoleLevel(a) <= getRoleLevel(b) ? a : b,
          )
        : appRoles[0]!;
    resolutionSteps.push({
      memberRoleSuffix: "…" + discordRoleId.slice(-8),
      matchedAppRoles: [...appRoles],
      kept,
    });
    matched.push(kept);
  }

  const resolvedRole = getHighestRole([...new Set(matched)]);

  return {
    guildIdOk: true,
    botTokenOk: true,
    discordUserIdSuffix: "…" + discordUserId.slice(-8),
    memberRolesCount: normalizedMemberRoles.length,
    memberRoleSuffixes: normalizedMemberRoles.map((id) => "…" + id.slice(-8)),
    envRoleConfigured,
    envIdSuffixes,
    resolutionSteps,
    resolvedRole,
  };
}

export async function resolveUserRoleForUserId(
  appUserId: string | null | undefined,
  user?: SessionUserLike | null,
): Promise<UserRole> {
  if (!appUserId) {
    return "user";
  }

  try {
    return await resolveDiscordRoleForUser(appUserId, user?.image);
  } catch (error) {
    console.error("[roles] unable to resolve Discord guild role", error);
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

export async function getCurrentUserAccess(options?: {
  source?: UserAccessSource;
}): Promise<ServerUserAccess> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      isAuthenticated: false,
      permissions: [],
      role: "user",
      session: null,
    };
  }

  const source = options?.source ?? "db";
  const u = session.user;
  let role: UserRole;

  if (source === "live") {
    const live = await resolveUserRoleForUserId(u.id, u);
    const saved = await upsertAppUserFromSession(
      u.id,
      { name: u.name, email: u.email },
      live,
    );
    if (!saved.ok) {
      console.error(
        "[roles] Impossible d’enregistrer l’utilisateur Supabase (live) — accès refusé côté rôle :",
        saved.message,
      );
      role = "user";
    } else {
      const fromDb = await getAppUserRole(u.id);
      /** Même logique que `db` : la base est la source pour les autorisations une fois persistée. */
      role = fromDb ?? live;
    }
  } else {
    let fromDb = await getAppUserRole(u.id);
    if (fromDb != null) {
      role = fromDb;
    } else {
      const live = await resolveUserRoleForUserId(u.id, u);
      const saved = await upsertAppUserFromSession(
        u.id,
        { name: u.name, email: u.email },
        live,
      );
      if (!saved.ok) {
        console.error("[roles] Impossible d’enregistrer l’utilisateur Supabase (db) :", saved.message);
      }
      fromDb = await getAppUserRole(u.id);
      /** Si la ligne n’existe toujours pas, pas de rôle Discord en UI : évite l’accès fantôme. */
      role = fromDb ?? "user";
    }
  }

  return {
    isAuthenticated: true,
    permissions: getRolePermissions(role),
    role,
    session,
  };
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const access = await getCurrentUserAccess({ source: "db" });
  return access.role;
}
