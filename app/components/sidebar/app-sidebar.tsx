"use client";

import * as React from "react";
import { NavMain } from "@/app/components/sidebar/nav-main";
import { NavUser } from "@/app/components/sidebar/nav-user";
import { AppSidebarTitle } from "@/app/components/sidebar/app-sidebar-title";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroup02Icon,
  ChevronDoubleCloseIcon,
  ShoppingBag01Icon,
  Diamond02Icon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";

function useNavData() {
  const { t } = useTranslations();
  return React.useMemo(
    () => ({
      navMain: [
        {
          id: "content",
          title: t("sidebar.content"),
          icon: <HugeiconsIcon icon={ChevronDoubleCloseIcon} strokeWidth={2} />,
          items: [
            { title: t("sidebar.cheats"), pageId: "cheats" },
            { title: t("sidebar.games"), pageId: "games" },
            { title: t("sidebar.misc"), pageId: "misc" },
          ],
        },
        {
          id: "community",
          title: t("sidebar.community"),
          icon: <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />,
          items: [
            { title: t("sidebar.videos"), pageId: "videos" },
            { title: t("sidebar.reviews"), pageId: "reviews" },
            { title: t("sidebar.forum"), pageId: "content" },
          ],
        },
        {
          id: "shop",
          title: t("sidebar.shop"),
          icon: <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />,
          items: [
            { title: t("sidebar.cheats"), pageId: "content" },
            { title: t("sidebar.services"), pageId: "content" },
            { title: t("sidebar.accounts"), pageId: "content" },
            { title: t("sidebar.reviews"), pageId: "content" },
          ],
        },
      ],
      NavSecondary: [
        {
          id: "exclusive",
          title: t("sidebar.content"),
          icon: <HugeiconsIcon icon={Diamond02Icon} strokeWidth={2} />,
          items: [
            {
              title: t("sidebar.vip"),
              pageId: "vip-cheats",
              requiredRole: "vip" as const,
            },
            {
              title: t("sidebar.semivip"),
              pageId: "semivip-cheats",
              requiredRole: "semivip" as const,
            },
            {
              title: t("sidebar.partners"),
              pageId: "partners",
              requiredRole: "partner" as const,
            },
          ],
        },
      ],
    }),
    [t],
  );
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage?: string;
  onSelectPage?: (pageId: string) => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}

export function AppSidebar({
  currentPage,
  onSelectPage,
  settingsOpen,
  onSettingsOpenChange,
  ...props
}: AppSidebarProps) {
  const data = useNavData();
  const { t } = useTranslations();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppSidebarTitle />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain}
          currentPage={currentPage}
          onSelectPageAction={onSelectPage}
          label={t("sidebar.platform")}
        />
        <NavMain
          items={data.NavSecondary}
          currentPage={currentPage}
          onSelectPageAction={onSelectPage}
          label={t("sidebar.exclusive")}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          settingsOpen={settingsOpen}
          onSettingsOpenChangeAction={onSettingsOpenChange}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
