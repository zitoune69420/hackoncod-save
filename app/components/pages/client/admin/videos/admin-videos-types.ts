import type { ReactNode } from "react";

export type AdminVideoRow = {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  action?: ReactNode;
};
