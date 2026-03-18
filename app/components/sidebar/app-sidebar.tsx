"use client"

import * as React from "react"
import { NavMain } from "@/app/components/sidebar/nav-main"
import { NavUser } from "@/app/components/sidebar/nav-user"
import { AppSidebarTitle } from "@/app/components/sidebar/app-sidebar-title"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserGroup02Icon, ChevronDoubleCloseIcon, ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { useTranslations } from "@/app/components/i18n-provider"

function useNavData() {
  const { t } = useTranslations()
  return React.useMemo(
    () => ({
      user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
      },
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
    }),
    [t]
  )
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage?: string
  onSelectPage?: (pageId: string) => void
}

export function AppSidebar({ currentPage, onSelectPage, ...props }: AppSidebarProps) {
  const data = useNavData()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppSidebarTitle />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} currentPage={currentPage} onSelectPage={onSelectPage} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
