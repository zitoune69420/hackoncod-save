import "server-only";

import type { BannedIpAdminRow } from "@/lib/banned/banned-ip-admin-row";
import { auth } from "@/app/auth";
import { isDiscordIdBanWhitelisted } from "@/lib/auth/ban-whitelist";
import { fetchGuildBanIfAny } from "@/lib/discord/guild-bans";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIpFromHeaders } from "@/lib/banned/client-ip";

async function findDiscordAccountIdFromBetterAuth(
  authUserId: string,
): Promise<string | null> {
  try {
    const context = await auth.$context;
    const accounts = await context.internalAdapter.findAccounts(authUserId);
    const discord = accounts.find(
      (a: { providerId?: string }) => a.providerId === "discord",
    );
    const raw = discord?.accountId;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  } catch (e) {
    console.error("[site-ban-db] findDiscordAccountIdFromBetterAuth", e);
    return null;
  }
}

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;
const RETARD_TABLE = "retard";

async function findRetardBanForDiscord(
  discordId: string,
): Promise<{ reason: string | null } | null> {
  const id = discordId.trim();
  if (!DISCORD_SNOWFLAKE_RE.test(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(RETARD_TABLE)
    .select("reason")
    .eq("user_id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    console.error("[site-ban-db] findRetardBanForDiscord", error.message);
    return null;
  }
  if (!data) return null;
  const reason = (data as { reason?: string | null }).reason ?? null;
  return { reason };
}

const APP_USERS_TABLE =
  process.env.SUPABASE_APP_USERS_TABLE?.trim() || "users";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type SyncProfileResult =
  | { ok: true }
  | { ok: false; siteBanned: true; reason: string | null };

export async function getSiteBanRowForAuthUser(
  authUserId: string,
): Promise<{ site_banned: boolean; site_ban_reason: string | null } | null> {
  try {
    const supabase = createAdminClient();
    const selectCols = "site_banned, site_ban_reason";

    if (isUuid(authUserId)) {
      const { data, error } = await supabase
        .from(APP_USERS_TABLE)
        .select(selectCols)
        .eq("id", authUserId)
        .maybeSingle();
      if (error?.code === "42703" || error?.message?.includes("site_banned")) {
        return null;
      }
      if (error) {
        console.error("[site-ban-db] getSiteBanRow.id", error.message);
      } else if (data) {
        return {
          site_banned: Boolean((data as { site_banned?: boolean }).site_banned),
          site_ban_reason:
            ((data as { site_ban_reason?: string | null }).site_ban_reason ??
              null) ||
            null,
        };
      }
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return null;
    }

    const { data, error } = await supabase
      .from(APP_USERS_TABLE)
      .select(selectCols)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      if (
        error.code === "42703" ||
        error.message?.includes("site_banned") ||
        error.message?.includes("auth_user_id")
      ) {
        return null;
      }
      console.error("[site-ban-db] getSiteBanRow", error.message);
      return null;
    }
    if (!data) return null;
    return {
      site_banned: Boolean((data as { site_banned?: boolean }).site_banned),
      site_ban_reason:
        ((data as { site_ban_reason?: string | null }).site_ban_reason ??
          null) ||
        null,
    };
  } catch (e) {
    console.error("[site-ban-db] getSiteBanRowForAuthUser", e);
    return null;
  }
}

export async function deleteBannedIpsByDiscordId(
  discordId: string,
): Promise<void> {
  const id = discordId.trim();
  if (!id) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("banned_ips")
    .delete()
    .eq("discord_id", id);
  if (error && error.code !== "42P01") {
    console.error("[site-ban-db] deleteBannedIpsByDiscordId", error.message);
  }
}

const BANNED_LIST_TABLE =
  process.env.SUPABASE_BANNED_LIST_TABLE?.trim() || "banned_list";

/** Supprime les lignes liées au snowflake Discord (colonnes `discord_id` ou `user_id` selon le schéma). */
export async function deleteBannedListRowsByDiscordId(
  discordId: string,
): Promise<void> {
  const id = discordId.trim();
  if (!id) return;
  const supabase = createAdminClient();

  for (const column of ["discord_id", "user_id"] as const) {
    const { error } = await supabase
      .from(BANNED_LIST_TABLE)
      .delete()
      .eq(column, id);
    if (!error) continue;
    if (error.code === "42P01" || error.code === "PGRST205") return;
    const msg = error.message ?? "";
    if (/column|schema cache/i.test(msg)) continue;
    console.error(
      `[site-ban-db] deleteBannedListRowsByDiscordId ${column}`,
      error.message,
    );
  }
}

/** Après retrait de la blacklist (`retard`) : nettoie `banned_ips` + `banned_list`. */
export async function purgeBanSideTablesForDiscordSnowflake(
  discordSnowflake: string | null | undefined,
): Promise<void> {
  const id = discordSnowflake?.trim();
  if (!id) return;
  await deleteBannedIpsByDiscordId(id);
  await deleteBannedListRowsByDiscordId(id);
}

export async function insertBannedIpRow(input: {
  ip: string;
  discord_id: string | null;
  reason: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("banned_ips").insert({
    ip: input.ip.slice(0, 128),
    discord_id: input.discord_id?.slice(0, 64) ?? null,
    reason: input.reason?.slice(0, 500) ?? null,
  });
  if (error) {
    console.error("[site-ban-db] insertBannedIpRow", error.message);
  }
}

/** Même insert ; lève une erreur lisible pour les échecs admin (doublon, RLS, etc.). */
export async function insertBannedIpRowStrict(input: {
  ip: string;
  discord_id: string | null;
  reason: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("banned_ips").insert({
    ip: input.ip.slice(0, 128),
    discord_id: input.discord_id?.slice(0, 64) ?? null,
    reason: input.reason?.slice(0, 500) ?? null,
  });
  if (error) {
    if (error.code === "42P01") {
      throw new Error("Table banned_ips introuvable.");
    }
    throw new Error(error.message ?? "insert banned_ips");
  }
}

export async function isIpInBanList(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banned_ips")
    .select("id")
    .eq("ip", ip)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return false;
    console.error("[site-ban-db] isIpInBanList", error.message);
    return false;
  }
  return data != null;
}

const FP_ALLOWED = /^[A-Za-z0-9._:\-+/=]+$/;

export async function isFingerprintInBanList(fp: string): Promise<boolean> {
  const safe = fp?.trim() ?? "";
  if (!safe || safe.length > 256 || !FP_ALLOWED.test(safe)) return false;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banned_fingerprints")
    .select("id")
    .eq("fingerprint", safe)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return false;
    console.error("[site-ban-db] isFingerprintInBanList", error.message);
    return false;
  }
  return data != null;
}

export async function insertBannedFingerprintRow(input: {
  fingerprint: string;
  discord_id: string | null;
  reason: string | null;
}): Promise<void> {
  const safe = input.fingerprint?.trim() ?? "";
  if (!safe || safe.length > 256 || !FP_ALLOWED.test(safe)) return;
  if (await isFingerprintInBanList(safe)) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("banned_fingerprints").insert({
    fingerprint: safe,
    discord_id: input.discord_id?.slice(0, 64) ?? null,
    reason: input.reason?.slice(0, 500) ?? null,
  });
  if (error && error.code !== "42P01") {
    console.error("[site-ban-db] insertBannedFingerprintRow", error.message);
  }
}

export type { BannedIpAdminRow } from "@/lib/banned/banned-ip-admin-row";

export async function listAllBannedIpsForAdmin(): Promise<BannedIpAdminRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banned_ips")
    .select("id, ip, discord_id, reason, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return [];
    }
    console.error("[site-ban-db] listAllBannedIpsForAdmin", error.message);
    throw new Error(error.message ?? "list banned_ips");
  }
  const rows = (data ?? []) as BannedIpAdminRow[];
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    ip: String(r.ip ?? ""),
    discord_id: r.discord_id != null ? String(r.discord_id) : null,
    reason: r.reason != null ? String(r.reason) : null,
    created_at: r.created_at != null ? String(r.created_at) : null,
  }));
}

export async function deleteBannedIpById(id: string): Promise<void> {
  const raw = id.trim();
  if (!raw) throw new Error("id requis");
  const supabase = createAdminClient();
  const { error } = await supabase.from("banned_ips").delete().eq("id", raw);
  if (error) {
    if (error.code === "42P01") {
      throw new Error("Table banned_ips introuvable.");
    }
    throw new Error(error.message ?? "delete banned_ips");
  }
}

export async function isDiscordIdInBanList(
  discordId: string,
): Promise<boolean> {
  const id = discordId.trim();
  if (!id) return false;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banned_ips")
    .select("id")
    .eq("discord_id", id)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return false;
    console.error("[site-ban-db] isDiscordIdInBanList", error.message);
    return false;
  }
  return data != null;
}

/**
 * ID Discord (snowflake) pour un utilisateur Better Auth.
 * En priorité : adaptateur BA (`findAccounts`) — sans `database` dans la config BA, il n’y a pas de ligne utile dans Supabase `account`.
 * Fallback : table Supabase `account` si tu persists Better Auth en Postgres.
 */
export async function findDiscordAccountId(
  authUserId: string,
): Promise<string | null> {
  const fromBa = await findDiscordAccountIdFromBetterAuth(authUserId);
  if (fromBa) return fromBa;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("account")
      .select("*")
      .eq("user_id", authUserId)
      .eq("provider_id", "discord")
      .maybeSingle();
    if (error) {
      if (error.code === "42P01") return null;
      return null;
    }
    const row = data as Record<string, unknown> | null;
    if (!row) return null;
    const raw =
      row.account_id ?? row.accountId ?? row["account_id"] ?? row["accountId"];
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export type BanStatusPayload = {
  banned: boolean;
  reason: string | null;
};

/**
 * Même logique que le hook OAuth : `site_banned`, puis blacklist app (`retard`), puis ban Discord serveur.
 */
export async function getOAuthBanOutcome(
  authUserId: string,
  options?: { discordAccountId?: string | null },
): Promise<SyncProfileResult> {
  const hint = options?.discordAccountId?.trim() || "";
  const discordId = hint || (await findDiscordAccountId(authUserId));

  /** Whitelist : bypass total, court-circuite tous les checks. */
  if (discordId && isDiscordIdBanWhitelisted(discordId)) {
    return { ok: true };
  }

  const row = await getSiteBanRowForAuthUser(authUserId);
  if (row?.site_banned) {
    return {
      ok: false,
      siteBanned: true,
      reason: row.site_ban_reason,
    };
  }

  if (discordId) {
    const retard = await findRetardBanForDiscord(discordId);
    if (retard) {
      return {
        ok: false,
        siteBanned: true,
        reason: retard.reason,
      };
    }
    const guildBan = await fetchGuildBanIfAny(discordId);
    if (guildBan) {
      return {
        ok: false,
        siteBanned: true,
        reason: guildBan.reason ?? null,
      };
    }
  }

  return { ok: true };
}

export async function resolveSessionBanStatus(input: {
  authUserId: string;
  requestHeaders: Headers;
}): Promise<BanStatusPayload> {
  const discordId = await findDiscordAccountId(input.authUserId);

  /** Whitelist : bypass total avant tout check DB ou Discord API. */
  if (discordId && isDiscordIdBanWhitelisted(discordId)) {
    return { banned: false, reason: null };
  }

  const ip = getClientIpFromHeaders(input.requestHeaders);
  if (await isIpInBanList(ip)) {
    return { banned: true, reason: null };
  }

  const fp = input.requestHeaders.get("x-client-fingerprint")?.trim();
  if (fp && (await isFingerprintInBanList(fp))) {
    return { banned: true, reason: null };
  }

  if (discordId && (await isDiscordIdInBanList(discordId))) {
    return { banned: true, reason: null };
  }

  const row = await getSiteBanRowForAuthUser(input.authUserId);
  if (row?.site_banned) {
    return { banned: true, reason: row.site_ban_reason };
  }

  if (discordId) {
    const retard = await findRetardBanForDiscord(discordId);
    if (retard) {
      return { banned: true, reason: retard.reason };
    }
    const guildBan = await fetchGuildBanIfAny(discordId);
    if (guildBan) {
      return { banned: true, reason: guildBan.reason ?? null };
    }
  }

  return { banned: false, reason: null };
}

export async function setUserSiteBan(input: {
  authUserId: string;
  siteBanned: boolean;
  reason: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    /** Refuse de site-ban un user whitelisté (le ban serait ignoré partout ailleurs). */
    if (input.siteBanned) {
      const did = await findDiscordAccountId(input.authUserId);
      if (did && isDiscordIdBanWhitelisted(did)) {
        return { ok: false, message: "Cet utilisateur est whitelisté." };
      }
    }
    const supabase = createAdminClient();
    const patch = {
      site_banned: input.siteBanned,
      site_ban_reason: input.reason?.trim() || null,
    };

    if (isUuid(input.authUserId)) {
      const { error } = await supabase
        .from(APP_USERS_TABLE)
        .update(patch)
        .eq("id", input.authUserId);
      if (!error) return { ok: true };
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return { ok: false, message: "Cannot resolve user row" };
    }

    const { error: e2 } = await supabase
      .from(APP_USERS_TABLE)
      .update(patch)
      .eq("auth_user_id", input.authUserId);
    if (e2) return { ok: false, message: e2.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export { getClientIpFromHeaders };
