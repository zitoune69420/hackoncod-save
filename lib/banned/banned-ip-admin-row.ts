import type { ReactNode } from "react";

/** Ligne `banned_ips` pour l’admin (client + API + DB). */
export type BannedIpAdminRow = {
  id: string;
  ip: string;
  discord_id: string | null;
  reason: string | null;
  created_at: string | null;
  /** Clé factice pour la colonne Actions (CommonTable). */
  action?: ReactNode;
};
