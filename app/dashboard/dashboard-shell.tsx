"use client";

import {
  Fragment,
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
  dashboardPageUsesSidebarNavPending,
  isDashboardSettingsOpen,
  isExclusiveDashboardPageId,
  isValidDashboardPageId,
  type DashboardPageId,
} from "@/lib/dashboard-url";

/** Fil d’Ariane admin : [section → première page], libellé de la page courante. */
const ADMIN_BREADCRUMB: Partial<
  Record<
    DashboardPageId,
    { section: "server" | "shop" | "stats"; sectionFirst: DashboardPageId; pageLabel: string }
  >
> = {
  "admin-server-cheats": {
    section: "server",
    sectionFirst: "admin-server-cheats",
    pageLabel: "sidebar.cheats",
  },
  "admin-server-games": {
    section: "server",
    sectionFirst: "admin-server-cheats",
    pageLabel: "sidebar.games",
  },
  "admin-server-videos": {
    section: "server",
    sectionFirst: "admin-server-cheats",
    pageLabel: "sidebar.videos",
  },
  "admin-server-reviews": {
    section: "server",
    sectionFirst: "admin-server-cheats",
    pageLabel: "sidebar.reviews",
  },
  "admin-server-blacklist": {
    section: "server",
    sectionFirst: "admin-server-cheats",
    pageLabel: "sidebar.blacklist",
  },
  "admin-shop-cheats": {
    section: "shop",
    sectionFirst: "admin-shop-cheats",
    pageLabel: "sidebar.cheats",
  },
  "admin-shop-games": {
    section: "shop",
    sectionFirst: "admin-shop-cheats",
    pageLabel: "sidebar.games",
  },
  "admin-shop-services": {
    section: "shop",
    sectionFirst: "admin-shop-cheats",
    pageLabel: "sidebar.services",
  },
  "admin-shop-accounts": {
    section: "shop",
    sectionFirst: "admin-shop-cheats",
    pageLabel: "sidebar.accounts",
  },
  "admin-shop-reviews": {
    section: "shop",
    sectionFirst: "admin-shop-cheats",
    pageLabel: "sidebar.shopReviews",
  },
  "admin-stats-users": {
    section: "stats",
    sectionFirst: "admin-stats-users",
    pageLabel: "dashboard.trail.statsUsers",
  },
  "admin-stats-performance": {
    section: "stats",
    sectionFirst: "admin-stats-users",
    pageLabel: "dashboard.trail.statsPerformance",
  },
  "admin-stats-security": {
    section: "stats",
    sectionFirst: "admin-stats-users",
    pageLabel: "dashboard.trail.statsSecurity",
  },
};

const TRAIL_SECTION_LABEL: Record<"server" | "shop" | "stats", string> = {
  server: "dashboard.trail.server",
  shop: "dashboard.trail.shop",
  stats: "dashboard.trail.stats",
};

/** Première entrée du menu Exclusif (même ordre que la sidebar). */
const EXCLUSIVE_SECTION_FIRST = "vip-cheats" as const satisfies DashboardPageId;

type DashboardBreadcrumbSeg =
  | { kind: "link"; label: string; pageId: DashboardPageId }
  | { kind: "current"; label: string };

function getDashboardBreadcrumbSegments(
  contentPage: DashboardPageId,
  t: (key: string) => string,
): DashboardBreadcrumbSeg[] {
  const rootLabel = t("dashboard.breadcrumb");
  const admin = ADMIN_BREADCRUMB[contentPage];
  if (admin) {
    return [
      { kind: "link", label: rootLabel, pageId: DASHBOARD_DEFAULT_PAGE },
      {
        kind: "link",
        label: t(TRAIL_SECTION_LABEL[admin.section]),
        pageId: admin.sectionFirst,
      },
      { kind: "current", label: t(admin.pageLabel) },
    ];
  }
  if (isExclusiveDashboardPageId(contentPage)) {
    const pageKey = PAGE_KEYS[contentPage] ?? "dashboard.home";
    return [
      { kind: "link", label: rootLabel, pageId: DASHBOARD_DEFAULT_PAGE },
      {
        kind: "link",
        label: t("sidebar.exclusive"),
        pageId: EXCLUSIVE_SECTION_FIRST,
      },
      { kind: "current", label: t(pageKey) },
    ];
  }
  const pageKey = PAGE_KEYS[contentPage] ?? "dashboard.home";
  return [
    { kind: "link", label: rootLabel, pageId: DASHBOARD_DEFAULT_PAGE },
    { kind: "current", label: t(pageKey) },
  ];
}

const PAGE_KEYS: Record<string, string> = {
  default: "dashboard.home",
  content: "dashboard.content",
  cheats: "sidebar.cheats",
  games: "sidebar.games",
  videos: "sidebar.videos",
  reviews: "sidebar.reviews",
  forum: "sidebar.forum",
  misc: "sidebar.misc",
  "vip-cheats": "sidebar.vip",
  "semivip-cheats": "sidebar.semivip",
  partners: "sidebar.partners",
};

function DashboardChrome({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, status } = useUserRole();
  const [isNavPending, startNavTransition] = useTransition();
  const [pendingNavPageId, setPendingNavPageId] = useState<string | null>(null);

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
    if (pendingNavPageId && contentPage === pendingNavPageId) {
      setPendingNavPageId(null);
    }
  }, [contentPage, pendingNavPageId]);

  const onSelectPage = useCallback(
    (pageId: string) => {
      if (!isValidDashboardPageId(pageId)) return;
      if (dashboardPageUsesSidebarNavPending(pageId)) {
        setPendingNavPageId(pageId);
      } else {
        setPendingNavPageId(null);
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

  const breadcrumbSegments = getDashboardBreadcrumbSegments(contentPage, t);

  return (
    <SidebarProvider>
      <AppSidebar
        currentPage={contentPage}
        onSelectPage={onSelectPage}
        pendingNavPageId={pendingNavPageId}
        navTransitionPending={isNavPending && pendingNavPageId != null}
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
                {breadcrumbSegments.map((seg, i) => {
                  const isLast = i === breadcrumbSegments.length - 1;
                  const hideUntilMd = !isLast;
                  return (
                  <Fragment key={`${seg.kind}-${i}-${seg.label}`}>
                    {i > 0 ? (
                      <BreadcrumbSeparator className="hidden md:inline-flex" />
                    ) : null}
                    <BreadcrumbItem
                      className={hideUntilMd ? "hidden md:inline-flex" : undefined}
                    >
                      {seg.kind === "link" ? (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            className="cursor-pointer bg-transparent p-0 font-inherit text-inherit"
                            onClick={() => onSelectPage(seg.pageId)}
                          >
                            {seg.label}
                          </button>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                  );
                })}
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
