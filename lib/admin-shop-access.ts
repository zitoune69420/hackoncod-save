import "server-only";

import { canAccessAdminShopSection } from "@/lib/permissions";
import type { AdminShopScope } from "@/lib/supabase/shop-queries";
import {
  getCurrentUserAccess,
  getDiscordUserIdForAuthUser,
} from "@/lib/permissions-server";

export type AdminShopApiGate =
  | { ok: false; status: 401 | 403 }
  | { ok: true; scope: AdminShopScope };

/**
 * Routes `/api/admin/shop/*` (hors avis) : fondateur (tout) ou partenaire (filtré par `created_by`).
 * Partenaire : au moins `appUserId` session requis ; le snowflake Discord est ajouté aux candidats
 * `created_by` quand on peut le résoudre (sinon seul l’id session sert — évite un 403 inutile en prod).
 */
export async function requireAdminShopApiAccess(): Promise<AdminShopApiGate> {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated) {
    return { ok: false, status: 401 };
  }
  if (!canAccessAdminShopSection(access.role)) {
    return { ok: false, status: 403 };
  }

  if (access.role === "founder") {
    return { ok: true, scope: { mode: "founder" } };
  }

  const u = access.session?.user;
  if (!u?.id) {
    return { ok: false, status: 403 };
  }

  const discordId =
    (await getDiscordUserIdForAuthUser(u.id, u.image))?.trim() ?? "";

  return {
    ok: true,
    scope: { mode: "partner", discordId, appUserId: u.id },
  };
}

/**
 * Modération des avis boutique (GET liste, PATCH, DELETE) : fondateur uniquement.
 */
export async function requireAdminShopReviewsApiAccess(): Promise<
  | { ok: false; status: 401 | 403 }
  | { ok: true; scope: { mode: "founder" } }
> {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated) {
    return { ok: false, status: 401 };
  }
  if (access.role !== "founder") {
    return { ok: false, status: 403 };
  }
  return { ok: true, scope: { mode: "founder" } };
}
