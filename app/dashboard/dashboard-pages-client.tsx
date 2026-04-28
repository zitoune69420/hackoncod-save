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
  AdminServerCheatsPage,
  AdminShopCheatsPage,
  AdminServerGamesPage,
  AdminShopGamesPage,
  AdminShopServicesPage,
  AdminShopAccountsPage,
  AdminServerVideosPage,
  AdminServerReviewsPage,
  AdminShopReviewsPage,
  AdminServerBlacklistPage,
  AdminServerBannedIpsPage,
  ShopCheatsPage,
  ShopServicesPage,
  ShopAccountsPage,
  ShopReviewsPage,
  TicketsPage,
} from "@/app/components/pages";
import {
  isValidDashboardPageId,
  type DashboardPageId,
} from "@/lib/dashboard-url";

type PageProps = {
  onSelectPage?: (
    pageId: string,
    options?: { ticketOrderId?: string | null },
  ) => void;
};

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
  "shop-cheats": ShopCheatsPage as ComponentType<PageProps>,
  "shop-services": ShopServicesPage as ComponentType<PageProps>,
  "shop-accounts": ShopAccountsPage as ComponentType<PageProps>,
  "shop-reviews": ShopReviewsPage as ComponentType<PageProps>,
  tickets: TicketsPage as ComponentType<PageProps>,
};

PAGES["admin-server-cheats"] = AdminServerCheatsPage as ComponentType<PageProps>;
PAGES["admin-shop-cheats"] = AdminShopCheatsPage as ComponentType<PageProps>;
PAGES["admin-server-games"] = AdminServerGamesPage as ComponentType<PageProps>;
PAGES["admin-shop-games"] = AdminShopGamesPage as ComponentType<PageProps>;
PAGES["admin-shop-services"] = AdminShopServicesPage as ComponentType<PageProps>;
PAGES["admin-shop-accounts"] = AdminShopAccountsPage as ComponentType<PageProps>;
PAGES["admin-server-videos"] = AdminServerVideosPage as ComponentType<PageProps>;
PAGES["admin-server-reviews"] = AdminServerReviewsPage as ComponentType<PageProps>;
PAGES["admin-shop-reviews"] = AdminShopReviewsPage as ComponentType<PageProps>;
PAGES["admin-server-blacklist"] = AdminServerBlacklistPage as ComponentType<PageProps>;
PAGES["admin-server-banned-ips"] =
  AdminServerBannedIpsPage as ComponentType<PageProps>;

type Props = { contentPage: DashboardPageId };

export function DashboardPagesClient({ contentPage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onSelectPage = useCallback(
    (
      pageId: string,
      options?: { ticketOrderId?: string | null },
    ) => {
      if (!isValidDashboardPageId(pageId)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", pageId);
      params.delete("settings");
      params.delete("from");
      if (pageId !== "tickets") {
        params.delete("orderId");
      } else if (options?.ticketOrderId) {
        params.set("orderId", options.ticketOrderId);
      } else {
        params.delete("orderId");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const Page = PAGES[contentPage] ?? DefaultPage;
  return <Page onSelectPage={onSelectPage} />;
}
