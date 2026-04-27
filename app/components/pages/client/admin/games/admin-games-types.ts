import type { ReactNode } from "react";

export type AdminGameRow = {
  id: string;
  title: string;
  description: string;
  image: string;
  steam: string;
  link: string;
  client: string;
  displayed: boolean;
  action?: ReactNode;
};
