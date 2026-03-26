import "server-only";

import { resolveUserRoleForUserId } from "@/lib/permissions-server";
import { upsertAppUserFromSession } from "@/lib/supabase/app-users";

type SessionUserLike = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * Après OAuth Discord : résolution des rôles serveur + écriture Supabase (`public.users`).
 * Import dynamique depuis `app/auth.ts` pour éviter un cycle de modules avec `permissions-server`.
 */
export async function syncUserProfileAfterLogin(
  user: SessionUserLike,
): Promise<void> {
  const role = await resolveUserRoleForUserId(user.id, user);
  const saved = await upsertAppUserFromSession(
    user.id,
    { name: user.name, email: user.email },
    role,
  );
  if (!saved.ok) {
    console.error(
      "[auth] Échec enregistrement Supabase après login — vérifie la table",
      process.env.SUPABASE_APP_USERS_TABLE ?? "users",
      ":",
      saved.message,
    );
  }
}
