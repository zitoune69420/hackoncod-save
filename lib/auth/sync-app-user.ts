import "server-only";

import type { SyncProfileResult } from "@/lib/banned/site-ban-db";
import { getOAuthBanOutcome } from "@/lib/banned/site-ban-db";
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
 * Si `site_banned`, blacklist app (`retard`) ou ban Discord serveur, retourne `siteBanned`.
 */
export async function syncUserProfileAfterLogin(
  user: SessionUserLike,
  options?: { discordAccountId?: string | null },
): Promise<SyncProfileResult> {
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

  return getOAuthBanOutcome(user.id, {
    discordAccountId: options?.discordAccountId,
  });
}
