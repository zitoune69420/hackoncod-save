import "server-only";

import { redirect } from "next/navigation";
import type { DashboardPageId } from "@/lib/dashboard-url";
import { isExclusiveDashboardPageId } from "@/lib/dashboard-url";
import { getCachedDashboardUserAccess } from "@/lib/dashboard-request-access";
import {
  canAccessPartnerTools,
  canAccessVipCheats,
  hasMinimumRole,
  type UserRole,
} from "@/lib/permissions";
import type { UserAccessSource } from "@/lib/permissions-server";

const SAFE_FALLBACK = "/dashboard?page=cheats" as const;

/** Stats / admin RSC : même règles que `enforceDashboardPageAccess` (fond de défense). */
export function redirectUnlessFounder(access: {
  isAuthenticated: boolean;
  role: UserRole;
}): void {
  if (!access.isAuthenticated) {
    redirect("/");
  }
  if (access.role !== "founder") {
    redirect(SAFE_FALLBACK);
  }
}

/**
 * Source du contrôle d’accès dashboard :
 * - défaut **`db`** (rapide : rôle Supabase, sans appel Discord à chaque navigation) ;
 * - `DASHBOARD_ACCESS_VERIFY_LIVE=1` ou `true` pour revalider sur Discord à chaque affichage (plus lent).
 */
function dashboardAccessSource(): UserAccessSource {
  const v = process.env.DASHBOARD_ACCESS_VERIFY_LIVE?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") {
    return "live";
  }
  return "db";
}

/** Pages réservées (administration). */
export function isAdminDashboardPage(page: DashboardPageId): boolean {
  return page.startsWith("admin-");
}

/** Pages « Exclusif » : même règles que la sidebar (`requiredRole`). */
export function isExclusiveDashboardPage(page: DashboardPageId): boolean {
  return isExclusiveDashboardPageId(page);
}

export function dashboardPageRequiresLiveVerification(
  page: DashboardPageId,
): boolean {
  return isAdminDashboardPage(page) || isExclusiveDashboardPage(page);
}

/**
 * Revalide le rôle via Discord (`live`) puis applique les mêmes règles que l’UI.
 * - Non connecté → page d’accueil
 * - Rôle insuffisant → dashboard public (cheats)
 */
export async function enforceDashboardPageAccess(
  page: DashboardPageId,
): Promise<void> {
  if (!dashboardPageRequiresLiveVerification(page)) {
    return;
  }

  const access = await getCachedDashboardUserAccess(dashboardAccessSource());

  if (!access.isAuthenticated) {
    redirect("/");
  }

  const { role } = access;

  if (isAdminDashboardPage(page)) {
    if (role !== "founder") {
      redirect(SAFE_FALLBACK);
    }
    return;
  }

  if (page === "vip-cheats") {
    if (!canAccessVipCheats(role)) {
      redirect(SAFE_FALLBACK);
    }
    return;
  }

  if (page === "semivip-cheats") {
    if (!hasMinimumRole(role, "semivip")) {
      redirect(SAFE_FALLBACK);
    }
    return;
  }

  if (page === "partners") {
    if (!canAccessPartnerTools(role)) {
      redirect(SAFE_FALLBACK);
    }
  }
}
