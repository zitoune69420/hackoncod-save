import type { ReactNode } from "react";

export type AdminReviewRow = {
  id: string;
  user_id: string;
  author_name: string;
  message: string;
  note: number;
  created_at: string;
  action?: ReactNode;
};
