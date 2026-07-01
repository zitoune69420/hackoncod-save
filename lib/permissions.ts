export const ROLE_HIERARCHY = [
  "user",
  "semivip",
  "vip",
  "premium",
  "partner",
  "founder",
] as const;

export type UserRole = (typeof ROLE_HIERARCHY)[number];

export const ACCESS_ROLES = ROLE_HIERARCHY.filter(
  (role) => role !== "user",
) as Exclude<UserRole, "user">[];

export type Permission = Exclude<UserRole, "user">;

const ROLE_LEVELS: Record<UserRole, number> = ROLE_HIERARCHY.reduce(
  (levels, role, index) => {
    levels[role] = index;
    return levels;
  },
  {} as Record<UserRole, number>,
);

export function isUserRole(value: string): value is UserRole {
  return (ROLE_HIERARCHY as readonly string[]).includes(value);
}

export function getUserRole(roleOrUser: UserRole | unknown): UserRole {
  if (typeof roleOrUser === "string" && isUserRole(roleOrUser)) {
    return roleOrUser;
  }

  if (roleOrUser && typeof roleOrUser === "object") {
    const role = (roleOrUser as { role?: unknown }).role;
    if (typeof role === "string" && isUserRole(role)) {
      return role;
    }
  }

  return "user";
}

export function getRoleLevel(roleOrUser: UserRole | unknown): number {
  return ROLE_LEVELS[getUserRole(roleOrUser)];
}

export function hasMinimumRole(
  roleOrUser: UserRole | unknown,
  minimumRole: UserRole,
): boolean {
  return getRoleLevel(roleOrUser) >= ROLE_LEVELS[minimumRole];
}

/**
 * Page / API cheats VIP : uniquement ces rôles (pas `semivip`, pas `user`).
 * Indépendant de la « hiérarchie » : le semi-VIP ne doit pas hériter du VIP par erreur de mapping Discord.
 */
export function canAccessVipCheats(roleOrUser: UserRole | unknown): boolean {
  const r = getUserRole(roleOrUser);
  return (
    r === "vip" ||
    r === "premium" ||
    r === "partner" ||
    r === "founder"
  );
}

/**
 * Messagerie / outils partenaires : réservé aux partenaires (et fondateur).
 * Un VIP sans rôle partenaire n’y a pas accès, même si son niveau hiérarchique est élevé ailleurs.
 */
export function canAccessPartnerTools(roleOrUser: UserRole | unknown): boolean {
  const r = getUserRole(roleOrUser);
  return r === "partner" || r === "founder";
}

/**
 * Section Administration → Boutique : fondateur (tout) ou partenaire (produits dont `created_by` correspond au compte).
 */
export function canAccessAdminShopSection(roleOrUser: UserRole | unknown): boolean {
  const r = getUserRole(roleOrUser);
  return r === "partner" || r === "founder";
}

/**
 * Page Administration → Boutique → Avis (modération) : fondateur uniquement.
 */
export function canAccessAdminShopReviewsPage(roleOrUser: UserRole | unknown): boolean {
  return getUserRole(roleOrUser) === "founder";
}

/**
 * Fil d’ariane / nav « Exclusif » : `requiredRole` sur l’item correspond au feature gate, pas toujours à `hasMinimumRole`.
 */
export function canSeeExclusiveNavItem(
  roleOrUser: UserRole | unknown,
  requiredRole: UserRole,
): boolean {
  if (requiredRole === "vip") return canAccessVipCheats(roleOrUser);
  if (requiredRole === "partner") return canAccessPartnerTools(roleOrUser);
  return hasMinimumRole(roleOrUser, requiredRole);
}

export function hasPermission(
  roleOrUser: UserRole | unknown,
  permission: Permission,
): boolean {
  return hasMinimumRole(roleOrUser, permission);
}

export function hasPermissions(
  roleOrUser: UserRole | unknown,
  permissions: readonly Permission[] = [],
): boolean {
  return permissions.every((permission) => hasPermission(roleOrUser, permission));
}

export function getRolePermissions(role: UserRole): readonly Permission[] {
  return ACCESS_ROLES.filter((permission) => hasPermission(role, permission));
}

export function getHighestRole(roles: readonly UserRole[]): UserRole {
  if (roles.length === 0) {
    return "user";
  }

  return roles.reduce((highest, role) =>
    ROLE_LEVELS[role] > ROLE_LEVELS[highest] ? role : highest,
  );
}
