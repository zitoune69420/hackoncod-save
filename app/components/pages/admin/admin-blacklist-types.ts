import type { ReactNode } from "react";

export type AdminBlacklistRow = {
  id: string;
  /** UUID Supabase (`retard`) si la ligne est en base ; vide si ban Discord seulement. */
  db_row_id: string;
  /** Membre présent dans la liste des bans du serveur Discord. */
  discord_ban: boolean;
  user_id: string;
  discord: string;
  /** Pseudo Discord résolu (API bot) à partir de user_id. */
  discord_display: string;
  /** Avatar (URL) depuis l’API Discord. */
  discord_avatar_url: string;
  reason: string;
  added_by: string;
  /** Pseudo si added_by est un id Discord, sinon vide. */
  added_by_display: string;
  added_by_avatar_url: string;
  created_at: string;
  action?: ReactNode;
};
