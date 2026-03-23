"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "@/app/components/i18n-provider"
import { AppSidebar } from "@/app/components/sidebar/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DefaultPage, CheatsPage, GamesPage, VideosPage, ReviewsPage, MiscPage } from "@/app/components/pages"
import { prefetchReviews } from "@/app/components/pages/client/reviews"

type PageProps = { onSelectPage?: (pageId: string) => void }

const PAGE_KEYS: Record<string, string> = {
  default: "dashboard.home",
  content: "dashboard.content",
  cheats: "sidebar.cheats",
  games: "sidebar.games",
  videos: "sidebar.videos",
  reviews: "sidebar.reviews",
  misc: "sidebar.misc",
}

const PAGES: Record<string, React.ComponentType<PageProps>> = {
  default: DefaultPage,
  content: DefaultPage,
  cheats: CheatsPage as React.ComponentType<PageProps>,
  games: GamesPage as React.ComponentType<PageProps>,
  videos: VideosPage as React.ComponentType<PageProps>,
  reviews: ReviewsPage as React.ComponentType<PageProps>,
  misc: MiscPage as React.ComponentType<PageProps>,
}

export default function Dashboard() {
  const { t } = useTranslations()
  const [currentPage, setCurrentPage] = useState<string>("cheats")

  useEffect(() => {
    prefetchReviews()
  }, [])
  const Page = PAGES[currentPage] ?? DefaultPage
  const label = t(PAGE_KEYS[currentPage] ?? "dashboard.home")

  return (
    <SidebarProvider>
      <AppSidebar currentPage={currentPage} onSelectPage={setCurrentPage} />
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
          <Page onSelectPage={setCurrentPage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
