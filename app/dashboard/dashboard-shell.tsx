"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "@/app/components/i18n-provider";
import { AppSidebar } from "@/app/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { prefetchReviews } from "@/app/components/pages/client/reviews";
import { useUserRole } from "@/hooks/use-user-role";
import {
  DASHBOARD_DEFAULT_PAGE,
  isDashboardSettingsOpen,
  isValidDashboardPageId,
  type DashboardPageId,
} from "@/lib/dashboard-url";

const PAGE_KEYS: Record<string, string> = {
  default: "dashboard.home",
  content: "dashboard.content",
  cheats: "sidebar.cheats",
  games: "sidebar.games",
  videos: "sidebar.videos",
  reviews: "sidebar.reviews",
  misc: "sidebar.misc",
  "vip-cheats": "sidebar.vip",
  "semivip-cheats": "sidebar.semivip",
  partners: "sidebar.partners",
  "admin-server-cheats": "dashboard.admin.serverCheats",
  "admin-server-games": "dashboard.admin.serverGames",
  "admin-server-videos": "dashboard.admin.serverVideos",
  "admin-server-reviews": "dashboard.admin.serverReviews",
  "admin-server-blacklist": "dashboard.admin.serverBlacklist",
  "admin-shop-cheats": "dashboard.admin.shopCheats",
  "admin-shop-services": "dashboard.admin.shopServices",
  "admin-shop-accounts": "dashboard.admin.shopAccounts",
  "admin-shop-reviews": "dashboard.admin.shopReviews",
  "admin-stats-users": "dashboard.admin.statsUsers",
  "admin-stats-performance": "dashboard.admin.statsPerformance",
  "admin-stats-security": "dashboard.admin.statsSecurity",
};

function DashboardChrome({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, status } = useUserRole();
  const [isNavPending, startNavTransition] = useTransition();
  const [pendingStatsPageId, setPendingStatsPageId] = useState<string | null>(
    null,
  );

  const pageParam = searchParams.get("page");
  const fromParam = searchParams.get("from");
  const settingsOpen = isDashboardSettingsOpen(searchParams);

  const contentPage: DashboardPageId = settingsOpen
    ? isValidDashboardPageId(fromParam)
      ? fromParam
      : DASHBOARD_DEFAULT_PAGE
    : isValidDashboardPageId(pageParam)
      ? pageParam
      : DASHBOARD_DEFAULT_PAGE;

  useEffect(() => {
    prefetchReviews();
  }, []);

  useEffect(() => {
    if (!contentPage.startsWith("admin-")) {
      return;
    }
    if (status !== "resolved") {
      return;
    }
    if (role === "founder") {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", DASHBOARD_DEFAULT_PAGE);
    params.delete("settings");
    params.delete("from");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [contentPage, pathname, router, role, searchParams, status]);

  useEffect(() => {
    if (pendingStatsPageId && contentPage === pendingStatsPageId) {
      setPendingStatsPageId(null);
    }
  }, [contentPage, pendingStatsPageId]);

  const onSelectPage = useCallback(
    (pageId: string) => {
      if (!isValidDashboardPageId(pageId)) return;
      if (pageId.startsWith("admin-stats-")) {
        setPendingStatsPageId(pageId);
      } else {
        setPendingStatsPageId(null);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", pageId);
      params.delete("settings");
      params.delete("from");
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startNavTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router, searchParams, startNavTransition],
  );

  const onSettingsOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        const current = isValidDashboardPageId(pageParam)
          ? pageParam
          : DASHBOARD_DEFAULT_PAGE;
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "settings");
        params.set("from", current);
        params.delete("settings");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return;
      }
      const restoreTo = isValidDashboardPageId(fromParam)
        ? fromParam
        : DASHBOARD_DEFAULT_PAGE;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("settings");
      params.delete("from");
      params.set("page", restoreTo);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, pageParam, fromParam],
  );

  const label = t(PAGE_KEYS[contentPage] ?? "dashboard.home");

  return (
    <SidebarProvider>
      <AppSidebar
        currentPage={contentPage}
        onSelectPage={onSelectPage}
        pendingStatsPageId={pendingStatsPageId}
        statsNavPending={isNavPending && pendingStatsPageId != null}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={onSettingsOpenChange}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 mt-1.5 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
