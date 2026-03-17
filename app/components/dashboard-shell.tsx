"use client"

import { useState } from "react"
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
import { DefaultPage, CheatsPage, GamesPage, VideosPage } from "@/app/components/pages"

type PageProps = { onSelectPage?: (pageId: string) => void }

const PAGES: Record<string, { component: React.ComponentType<PageProps>; label: string }> = {
  default: { component: DefaultPage, label: "Home" },
  content: { component: DefaultPage, label: "Content" },
  cheats: { component: CheatsPage as React.ComponentType<PageProps>, label: "Cheats" },
  games: { component: GamesPage as React.ComponentType<PageProps>, label: "Games" },
  videos: { component: VideosPage as React.ComponentType<PageProps>, label: "Videos" },
  misc: { component: DefaultPage, label: "Misc." },
}

type DashboardShellProps = {
  reviewsContent: React.ReactNode
}

export function DashboardShell({ reviewsContent }: DashboardShellProps) {
  const [currentPage, setCurrentPage] = useState<string>("default")

  const isReviews = currentPage === "reviews"
  const { component: Page, label } = isReviews
    ? { component: null, label: "Avis" }
    : (PAGES[currentPage] ?? { component: DefaultPage, label: currentPage })

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
          {isReviews ? reviewsContent : Page && <Page onSelectPage={setCurrentPage} />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
