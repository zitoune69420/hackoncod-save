/**
 * Profils applicatifs dans Supabase (`public.users` par défaut, schéma `public`).
 *
 * Obligatoire si l’ID Better Auth n’est **pas** un UUID :
 *
 * ```sql
 * alter table public.users add column if not exists auth_user_id text unique;
 * alter table public.users add column if not exists discord_user_id text;
 * ```
 *
 * `discord_user_id` : snowflake Discord (sans adaptateur DB Better Auth, les comptes OAuth ne sont pas persistés côté BA — on le stocke ici pour les Server Actions / Vercel).
 *
 * Sur `id` : soit `uuid` avec valeur = `session.user.id` (si UUID), soit `default gen_random_uuid()`
 * et liaison uniquement par `auth_user_id`.
 *
 * Variables :
 * - `SUPABASE_APP_USERS_TABLE` (défaut : `users`)
 * - `SUPABASE_APP_USERS_SKIP_AUTH_USER_ID=1` — ne pas toucher à `auth_user_id` (uniquement si id = UUID)
 */
import "server-only";

import { getUserRole, type UserRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const TABLE = process.env.SUPABASE_APP_USERS_TABLE?.trim() || "users";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function logSupabaseError(ctx: string, err: { message?: string; code?: string; details?: string; hint?: string }) {
  console.error(
    `[app-users:${ctx}]`,
    JSON.stringify({
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      table: TABLE,
    }),
  );
}

/** PostgREST n’applique le RLS qu’avec une clé « basse » (anon / publishable). */
function hintForRlsWriteFailure(message: string): string {
  if (!/row-level security|violates row-level security/i.test(message)) {
    return message;
  }
  return (
    message +
    " — Côté Vercel (Production) : SUPABASE_SERVICE_ROLE_KEY doit être la clé **Secret** sb_secret_… " +
    "ou l’ancienne **service_role** (JWT), jamais la clé anon/publishable ni NEXT_PUBLIC_*."
  );
}

export type AppUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  roles: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  auth_user_id?: string | null;
  discord_user_id?: string | null;
};

export type UpsertAppUserResult =
  | { ok: true }
  | { ok: false; message: string };

export async function getAppUserRow(
  authUserId: string,
): Promise<Pick<AppUserRow, "roles"> | null> {
  try {
    const supabase = createAdminClient();
    if (isUuid(authUserId)) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("roles")
        .eq("id", authUserId)
        .maybeSingle();
      if (error) {
        logSupabaseError("getAppUserRow.select.id", error);
      } else if (data?.roles != null && String(data.roles).trim() !== "") {
        return data;
      }
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select("roles")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      if (error.code === "42703" || error.message?.includes("auth_user_id")) {
        console.error(
          "[app-users] Colonne auth_user_id absente alors que l’ID Better Auth n’est pas un UUID. SQL : alter table public.users add column auth_user_id text unique;",
        );
        return null;
      }
      logSupabaseError("getAppUserRow.select.auth_user_id", error);
      return null;
    }
    if (data?.roles != null && String(data.roles).trim() !== "") {
      return data;
    }
    return null;
  } catch (e) {
    console.error("[app-users] getAppUserRow", e);
    return null;
  }
}

/**
 * UUID primaire (`users.id`) pour les colonnes FK uuid (ex. `sale.buy_by`).
 * L’ID Better Auth peut être un snowflake Discord : résolution via `auth_user_id`.
 */
export async function getAppUserTableIdForAuthUser(
  authUserId: string,
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    if (isUuid(authUserId)) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id")
        .eq("id", authUserId)
        .maybeSingle();
      if (error) {
        logSupabaseError("getAppUserTableIdForAuthUser.eq_id", error);
        return null;
      }
      return data?.id ?? null;
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      if (error.code === "42703" || error.message?.includes("auth_user_id")) {
        return null;
      }
      logSupabaseError("getAppUserTableIdForAuthUser.eq_auth_user_id", error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[app-users] getAppUserTableIdForAuthUser", e);
    return null;
  }
}

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

function isMissingDiscordUserIdColumn(err: {
  code?: string;
  message?: string;
}): boolean {
  const msg = err.message ?? "";
  return (
    err.code === "42703" ||
    /discord_user_id/i.test(msg) ||
    /column.*does not exist/i.test(msg)
  );
}

/**
 * Met à jour le snowflake Discord pour un utilisateur app (colonne optionnelle `discord_user_id`).
 */
export async function persistAuthUserDiscordSnowflake(
  authUserId: string,
  discordUserId: string | null | undefined,
): Promise<void> {
  const id = discordUserId?.trim() ?? "";
  if (!id || !DISCORD_SNOWFLAKE_RE.test(id)) {
    return;
  }
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const patch = { discord_user_id: id, updated_at: now };

    if (isUuid(authUserId)) {
      const { error } = await supabase
        .from(TABLE)
        .update(patch)
        .eq("id", authUserId);
      if (error && isMissingDiscordUserIdColumn(error)) {
        return;
      }
      if (error) {
        logSupabaseError("persistAuthUserDiscordSnowflake.update.id", error);
      }
      return;
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return;
    }

    const { error: e2 } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("auth_user_id", authUserId);
    if (e2 && isMissingDiscordUserIdColumn(e2)) {
      return;
    }
    if (e2) {
      logSupabaseError("persistAuthUserDiscordSnowflake.update.auth_user_id", e2);
    }
  } catch (e) {
    console.error("[app-users] persistAuthUserDiscordSnowflake", e);
  }
}

/**
 * Snowflake Discord stocké en base pour cet ID Better Auth (repli quand l’adaptateur BA est en mémoire).
 */
export async function getAuthUserDiscordSnowflake(
  authUserId: string,
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    if (isUuid(authUserId)) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("discord_user_id")
        .eq("id", authUserId)
        .maybeSingle();
      if (error) {
        if (isMissingDiscordUserIdColumn(error)) {
          return null;
        }
        logSupabaseError("getAuthUserDiscordSnowflake.select.id", error);
        return null;
      }
      const raw = (data as { discord_user_id?: string | null } | null)
        ?.discord_user_id;
      const s = raw?.trim() ?? "";
      return DISCORD_SNOWFLAKE_RE.test(s) ? s : null;
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return null;
    }

    const { data: data2, error: err2 } = await supabase
      .from(TABLE)
      .select("discord_user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (err2) {
      if (isMissingDiscordUserIdColumn(err2)) {
        return null;
      }
      logSupabaseError("getAuthUserDiscordSnowflake.select.auth_user_id", err2);
      return null;
    }
    const raw = (data2 as { discord_user_id?: string | null } | null)
      ?.discord_user_id;
    const s = raw?.trim() ?? "";
    return DISCORD_SNOWFLAKE_RE.test(s) ? s : null;
  } catch (e) {
    console.error("[app-users] getAuthUserDiscordSnowflake", e);
    return null;
  }
}

export async function getAppUserRole(
  authUserId: string,
): Promise<UserRole | null> {
  const row = await getAppUserRow(authUserId);
  if (!row?.roles) return null;
  return getUserRole(row.roles);
}

/**
 * Noms / e-mails pour affichage forum quand `user_id` = ID Better Auth (pas snowflake Discord).
 */
export async function getAppUserForumDisplayByIds(
  rawIds: readonly string[],
): Promise<Map<string, { name: string | null; email: string | null }>> {
  const ids = [
    ...new Set(
      rawIds.map((x) => String(x ?? "").trim()).filter((s) => s.length > 0),
    ),
  ];
  const out = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length === 0) return out;

  const supabase = createAdminClient();
  const uuidIds = ids.filter(isUuid);
  const rows: Pick<AppUserRow, "id" | "auth_user_id" | "name" | "email">[] = [];

  try {
    if (uuidIds.length > 0) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id, auth_user_id, name, email")
        .in("id", uuidIds);
      if (error) {
        logSupabaseError("getAppUserForumDisplayByIds.in_id", error);
      } else if (data) {
        rows.push(...(data as typeof rows));
      }
    }

    const { data: data2, error: err2 } = await supabase
      .from(TABLE)
      .select("id, auth_user_id, name, email")
      .in("auth_user_id", ids);

    if (err2) {
      if (err2.code !== "42703" && !err2.message?.includes("auth_user_id")) {
        logSupabaseError("getAppUserForumDisplayByIds.in_auth_user_id", err2);
      }
    } else if (data2) {
      const seen = new Set(rows.map((r) => r.id));
      for (const r of data2 as typeof rows) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          rows.push(r);
        }
      }
    }
  } catch (e) {
    console.error("[app-users] getAppUserForumDisplayByIds", e);
    return out;
  }

  for (const id of ids) {
    const row = rows.find(
      (r) => r.id === id || (r.auth_user_id != null && r.auth_user_id === id),
    );
    out.set(id, {
      name: row?.name ?? null,
      email: row?.email ?? null,
    });
  }
  return out;
}

/**
 * Insert ou update explicite (évite les upsert PostgREST qui cassent si la contrainte / les colonnes ne matchent pas).
 */
export async function upsertAppUserFromSession(
  authUserId: string,
  profile: { name?: string | null; email?: string | null },
  role: UserRole,
): Promise<UpsertAppUserResult> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const patch = {
      name: profile.name ?? null,
      email: profile.email ?? null,
      roles: role,
      updated_at: now,
    };

    if (isUuid(authUserId)) {
      const { data: existing, error: selErr } = await supabase
        .from(TABLE)
        .select("id")
        .eq("id", authUserId)
        .maybeSingle();
      if (selErr) {
        logSupabaseError("upsert.select.id", selErr);
        return { ok: false, message: hintForRlsWriteFailure(selErr.message ?? "") };
      }

      if (existing?.id) {
        const { error } = await supabase
          .from(TABLE)
          .update(patch)
          .eq("id", authUserId);
        if (error) {
          logSupabaseError("upsert.update.id", error);
          return { ok: false, message: hintForRlsWriteFailure(error.message ?? "") };
        }
        return { ok: true };
      }

      const insertRow: Record<string, unknown> = {
        id: authUserId,
        ...patch,
        created_at: now,
      };
      if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID !== "1") {
        insertRow.auth_user_id = authUserId;
      }

      const { error } = await supabase.from(TABLE).insert(insertRow);
      if (error) {
        logSupabaseError("upsert.insert.id", error);
        return { ok: false, message: hintForRlsWriteFailure(error.message ?? "") };
      }
      return { ok: true };
    }

    if (process.env.SUPABASE_APP_USERS_SKIP_AUTH_USER_ID === "1") {
      return {
        ok: false,
        message:
          "ID Better Auth non-UUID et SUPABASE_APP_USERS_SKIP_AUTH_USER_ID=1 : impossible de lier la ligne.",
      };
    }

    const { data: existing2, error: sel2 } = await supabase
      .from(TABLE)
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (sel2) {
      if (sel2.code === "42703" || sel2.message?.includes("auth_user_id")) {
        const msg =
          "Colonne auth_user_id absente. Exécute : alter table public.users add column auth_user_id text unique; (l’ID Better Auth n’est pas un UUID).";
        console.error(`[app-users] ${msg}`);
        return { ok: false, message: msg };
      }
      logSupabaseError("upsert.select.auth_user_id", sel2);
      return { ok: false, message: hintForRlsWriteFailure(sel2.message ?? "") };
    }

    if (existing2?.id) {
      const { error } = await supabase
        .from(TABLE)
        .update(patch)
        .eq("auth_user_id", authUserId);
      if (error) {
        logSupabaseError("upsert.update.auth_user_id", error);
        return { ok: false, message: hintForRlsWriteFailure(error.message ?? "") };
      }
      return { ok: true };
    }

    const { error: insErr } = await supabase.from(TABLE).insert({
      auth_user_id: authUserId,
      ...patch,
      created_at: now,
    });
    if (insErr) {
      logSupabaseError("upsert.insert.auth_user_id", insErr);
      return { ok: false, message: hintForRlsWriteFailure(insErr.message ?? "") };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[app-users] upsertAppUserFromSession", e);
    return { ok: false, message: hintForRlsWriteFailure(msg) };
  }
}
