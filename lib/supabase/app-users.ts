/**
 * Profils applicatifs dans Supabase (`public.users` par défaut, schéma `public`).
 *
 * Obligatoire si l’ID Better Auth n’est **pas** un UUID :
 *
 * ```sql
 * alter table public.users add column if not exists auth_user_id text unique;
 * ```
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

export async function getAppUserRole(
  authUserId: string,
): Promise<UserRole | null> {
  const row = await getAppUserRow(authUserId);
  if (!row?.roles) return null;
  return getUserRole(row.roles);
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
