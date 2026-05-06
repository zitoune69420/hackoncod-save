import "server-only";

import { getCurrentUserAccess } from "@/lib/permissions-server";

/** Routes admin strictes : Discord recalculé à chaque requête (pas seulement le cache DB). */
export async function requireFounderDiscordLive(): Promise<
  | { ok: true; access: Awaited<ReturnType<typeof getCurrentUserAccess>> }
  | { ok: false; status: 401 | 403 }
> {
  const access = await getCurrentUserAccess({ source: "live" });
  if (!access.isAuthenticated) return { ok: false, status: 401 };
  if (access.role !== "founder") return { ok: false, status: 403 };
  return { ok: true, access };
}
