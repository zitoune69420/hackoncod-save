export const USER_ROLES = [
  "user",
  "semivip",
  "vip",
  "premium",
  "partner",
  "founder",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const PERMISSIONS = [
  "semivip",
  "vip",
  "premium",
  "partner",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  user: [],
  semivip: ["semivip"],
  vip: ["semivip", "vip"],
  premium: ["semivip", "vip", "premium"],
  partner: ["semivip", "vip", "premium", "partner"],
  founder: ["semivip", "vip", "premium", "partner"],
}

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export function getUserRole(user: unknown): UserRole {
  if (!user || typeof user !== "object") return "user"

  const role = (user as { role?: unknown }).role
  if (typeof role === "string" && isUserRole(role)) {
    return role
  }

  return "user"
}

export function getRolePermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function hasPermission(
  roleOrUser: UserRole | unknown,
  permission: Permission,
): boolean {
  const role =
    typeof roleOrUser === "string" && isUserRole(roleOrUser)
      ? roleOrUser
      : getUserRole(roleOrUser)

  return ROLE_PERMISSIONS[role].includes(permission)
}

export function hasPermissions(
  roleOrUser: UserRole | unknown,
  permissions: readonly Permission[] = [],
): boolean {
  return permissions.every((permission) => hasPermission(roleOrUser, permission))
}
