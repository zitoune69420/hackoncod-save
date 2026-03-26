"use client";

import { useCallback, type ComponentType } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  DefaultPage,
  CheatsPage,
  GamesPage,
  VideosPage,
  ReviewsPage,
  MiscPage,
  VipCheatsPage,
  SemiVipCheatsPage,
  PartnersPage,
} from "@/app/components/pages";
import {
  DASHBOARD_DEFAULT_PAGE,
  isValidDashboardPageId,
  type DashboardPageId,
} from "@/lib/dashboard-url";

type PageProps = { onSelectPage?: (pageId: string) => void };

const PAGES: Record<string, ComponentType<PageProps>> = {
  default: DefaultPage,
  content: DefaultPage,
  cheats: CheatsPage as ComponentType<PageProps>,
  games: GamesPage as ComponentType<PageProps>,
  videos: VideosPage as ComponentType<PageProps>,
  reviews: ReviewsPage as ComponentType<PageProps>,
  misc: MiscPage as ComponentType<PageProps>,
  "vip-cheats": VipCheatsPage as ComponentType<PageProps>,
  "semivip-cheats": SemiVipCheatsPage as ComponentType<PageProps>,
  partners: PartnersPage as ComponentType<PageProps>,
};

const ADMIN_PAGE_FALLBACK = DefaultPage;
for (const id of [
  "admin-server-cheats",
  "admin-server-games",
  "admin-server-videos",
  "admin-server-reviews",
  "admin-server-blacklist",
  "admin-shop-cheats",
  "admin-shop-services",
  "admin-shop-accounts",
  "admin-shop-reviews",
] as const) {
  PAGES[id] = ADMIN_PAGE_FALLBACK;
}

type Props = { contentPage: DashboardPageId };

export function DashboardPagesClient({ contentPage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onSelectPage = useCallback(
    (pageId: string) => {
      if (!isValidDashboardPageId(pageId)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", pageId);
      params.delete("settings");
      params.delete("from");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const Page = PAGES[contentPage] ?? DefaultPage;
  return <Page onSelectPage={onSelectPage} />;
}
