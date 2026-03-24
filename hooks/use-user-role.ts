"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  getRolePermissions,
  type Permission,
  type UserRole,
} from "@/lib/permissions";

type RoleResponse = {
  role: UserRole;
  permissions: Permission[];
};

export function useUserRole() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [state, setState] = useState<{
    status: "idle" | "loading" | "resolved" | "error";
    role: UserRole;
    permissions: readonly Permission[];
    resolvedUserId: string | null;
  }>({
    status: "idle",
    role: "user",
    permissions: [],
    resolvedUserId: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!session?.user) {
      return;
    }

    fetch("/api/discord/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Role API ${res.status}`);
        }
        return (await res.json()) as RoleResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "resolved",
          role: data.role,
          permissions: data.permissions,
          resolvedUserId: session.user.id,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "error",
          role: "user",
          permissions: getRolePermissions("user"),
          resolvedUserId: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const status = sessionPending
    ? "loading"
    : session?.user &&
        state.resolvedUserId !== session.user.id &&
        state.status !== "error"
      ? "loading"
      : session?.user
        ? state.status
        : "idle";

  return {
    status,
    role: session?.user ? state.role : "user",
    permissions: session?.user ? state.permissions : [],
    isAuthenticated: Boolean(session?.user),
    isLoading:
      sessionPending ||
      (!!session?.user && state.resolvedUserId !== session?.user?.id),
  };
}
