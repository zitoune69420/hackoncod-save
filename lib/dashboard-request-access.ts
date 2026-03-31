import "server-only";

import { cache } from "react";
import {
  getCurrentUserAccess,
  type UserAccessSource,
} from "@/lib/permissions-server";

/**
 * Une résolution session + rôle par requête RSC (évite plusieurs appels Supabase
 * lorsque le garde dashboard et une page stats enchaînent la même lecture).
 */
export const getCachedDashboardUserAccess = cache(
  async (source: UserAccessSource) => getCurrentUserAccess({ source }),
);
