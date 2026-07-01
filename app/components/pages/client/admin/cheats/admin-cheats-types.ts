import type { ReactNode } from "react";

export type AdminCheatRow = {
  id: string;
  game_id: string;
  game: string;
  name: string;
  mode: string;
  platform: string;
  extension: string;
  crack: boolean;
  client: string;
  vip: boolean;
  semi_vip: boolean;
  pinned: boolean;
  statut: string;
  link: string;
  /** Colonne actions (tableau). */
  action?: ReactNode;
};
