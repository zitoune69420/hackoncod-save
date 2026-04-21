"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/app/components/i18n-provider";
import { HowToVipDialog } from "@/app/components/dialogs/how-to-vip";
import { DemoSidebar } from "./demo-sidebar";
import { DemoVipContent } from "./demo-vip-content";

export function DemoDashboard() {
  const { t } = useTranslations();
  const [howToVipOpen, setHowToVipOpen] = useState(false);

  return (
    <>
      <SidebarProvider>
        <DemoSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex flex-1 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 mt-1.5 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:inline-flex">
                    <BreadcrumbLink asChild>
                      <Link href="/dashboard">
                        {t("dashboard.breadcrumb")}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:inline-flex" />
                  <BreadcrumbItem className="hidden md:inline-flex">
                    <BreadcrumbPage>{t("sidebar.exclusive")}</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:inline-flex" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{t("sidebar.vip")}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <Badge variant="secondary" className="ml-auto mr-2">
                {t("demo.badge")}
              </Badge>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <DemoVipContent onOpenHowToVip={() => setHowToVipOpen(true)} />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <HowToVipDialog
        open={howToVipOpen}
        onOpenChangeAction={setHowToVipOpen}
      />
    </>
  );
}
