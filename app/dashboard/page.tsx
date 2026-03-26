"use client";

import { Suspense, useCallback, useEffect } from "react";
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
import { prefetchReviews } from "@/app/components/pages/client/reviews";
import { UserRoleProvider } from "@/hooks/use-user-role";
import {
  DASHBOARD_DEFAULT_PAGE,
  isDashboardSettingsOpen,
  isValidDashboardPageId,
  type DashboardPageId,
} from "@/lib/dashboard-url";

type PageProps = { onSelectPage?: (pageId: string) => void };

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
};

const PAGES: Record<string, React.ComponentType<PageProps>> = {
  default: DefaultPage,
  content: DefaultPage,
  cheats: CheatsPage as React.ComponentType<PageProps>,
  games: GamesPage as React.ComponentType<PageProps>,
  videos: VideosPage as React.ComponentType<PageProps>,
  reviews: ReviewsPage as React.ComponentType<PageProps>,
  misc: MiscPage as React.ComponentType<PageProps>,
  "vip-cheats": VipCheatsPage as React.ComponentType<PageProps>,
  "semivip-cheats": SemiVipCheatsPage as React.ComponentType<PageProps>,
  partners: PartnersPage as React.ComponentType<PageProps>,
};

function DashboardContent() {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageParam = searchParams.get("page");
  const fromParam = searchParams.get("from");
  const settingsOpen = isDashboardSettingsOpen(searchParams);

  // Pure URL-driven: no state, no ref.
  // When settings is open we show the page stored in ?from=, otherwise the ?page=.
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

  const onSettingsOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Snapshot the current content page into ?from= so we can restore it on close.
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
      // Restore the page that was active before settings opened.
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

  const Page = PAGES[contentPage] ?? DefaultPage;
  const label = t(PAGE_KEYS[contentPage] ?? "dashboard.home");

  return (
    <UserRoleProvider>
      <SidebarProvider>
        <AppSidebar
          currentPage={contentPage}
          onSelectPage={onSelectPage}
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
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Page onSelectPage={onSelectPage} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UserRoleProvider>
  );
}

function DashboardFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
      <span className="text-sm">Loading…</span>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
