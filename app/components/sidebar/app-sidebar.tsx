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

const data = {
  user: { 
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Content",
      icon: (
        <HugeiconsIcon icon={ChevronDoubleCloseIcon} strokeWidth={2} />
      ),
      items: [
        { title: "Cheats", pageId: "cheats" },
        { title: "Games", pageId: "games" },
        { title: "Misc.", pageId: "test" },
      ],
    },
    {
      title: "Community",
      icon: (
        <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />
      ),
      items: [
        { title: "Vidéos", pageId: "videos" },
        { title: "Reviews", pageId: "content" },
        { title: "Forum", pageId: "content" },
      ],
    },
    {
      title: "Shop",
      icon: (
        <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />
      ),
      items: [
        { title: "Cheats", pageId: "content" },
        { title: "Services", pageId: "content" },
        { title: "Accounts", pageId: "content" },
        { title: "Reviews", pageId: "content" },
      ],
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage?: string
  onSelectPage?: (pageId: string) => void
}

export function AppSidebar({ currentPage, onSelectPage, ...props }: AppSidebarProps) {
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
