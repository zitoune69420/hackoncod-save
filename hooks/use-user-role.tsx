"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/lib/permissions";

type RoleResponse = {
  role: UserRole;
};

type ResolvedRoleState = {
  resolvedUserId: string | null;
  role: UserRole;
  status: "idle" | "resolved" | "error";
};

type UserRoleContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole;
  status: "idle" | "loading" | "resolved" | "error";
};

const UserRoleContext = createContext<UserRoleContextValue | null>(null);

const DEFAULT_RESOLVED_ROLE_STATE: ResolvedRoleState = {
  resolvedUserId: null,
  role: "user",
  status: "idle",
};

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [state, setState] = useState<ResolvedRoleState>(
    DEFAULT_RESOLVED_ROLE_STATE,
  );
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setState(DEFAULT_RESOLVED_ROLE_STATE);
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
        if (cancelled) {
          return;
        }

        setState({
          resolvedUserId: userId,
          role: data.role,
          status: "resolved",
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState({
          resolvedUserId: userId,
          role: "user",
          status: "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const status: UserRoleContextValue["status"] = sessionPending
    ? "loading"
    : !userId
      ? "idle"
      : state.resolvedUserId !== userId
        ? "loading"
        : state.status;

  const value = useMemo<UserRoleContextValue>(
    () => ({
      isAuthenticated: Boolean(userId),
      isLoading: status === "loading",
      role: status === "resolved" ? state.role : "user",
      status,
    }),
    [state.role, status, userId],
  );

  return (
    <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);

  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }

  return context;
}
