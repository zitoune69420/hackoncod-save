"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ChevronDoubleCloseIcon,
  CrownIcon,
  Diamond02Icon,
  ShoppingBag01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";

type SectionDef = {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  itemKeys: string[];
};

const PLATFORM_SECTIONS: ReadonlyArray<SectionDef> = [
  {
    id: "content",
    titleKey: "sidebar.content",
    icon: <HugeiconsIcon icon={ChevronDoubleCloseIcon} strokeWidth={2} />,
    itemKeys: ["sidebar.cheats", "sidebar.games", "sidebar.misc"],
  },
  {
    id: "community",
    titleKey: "sidebar.community",
    icon: <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />,
    itemKeys: ["sidebar.videos", "sidebar.reviews", "sidebar.forum"],
  },
  {
    id: "shop",
    titleKey: "sidebar.shop",
    icon: <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />,
    itemKeys: [
      "sidebar.cheats",
      "sidebar.services",
      "sidebar.accounts",
      "sidebar.reviews",
    ],
  },
];

function StaticSection({ section }: { section: SectionDef }) {
  const { t } = useTranslations();
  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={t(section.titleKey)}>
            {section.icon}
            <span>{t(section.titleKey)}</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {section.itemKeys.map((key, i) => (
              <SidebarMenuSubItem key={`${section.id}-${i}-${key}`}>
                <SidebarMenuSubButton
                  aria-disabled
                  className="cursor-default opacity-60"
                  onClick={(e) => e.preventDefault()}
                >
                  <span>{t(key)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function DemoSidebar() {
  const { t } = useTranslations();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary text-sidebar-foreground">
                  <HugeiconsIcon icon={ChevronDoubleCloseIcon} strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Hack on COD</span>
                  <span className="text-xs text-muted-foreground">
                    v3.0.1 · {t("demo.sidebarTag")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("demo.backToDashboard")} className="bg-sidebar-accent text-sidebar-accent-foreground border">
                <Link href="/dashboard">
                  <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
                  <span>{t("demo.backToDashboard")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.platform")}</SidebarGroupLabel>
          <SidebarMenu>
            {PLATFORM_SECTIONS.map((section) => (
              <StaticSection key={section.id} section={section} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.exclusive")}</SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={t("sidebar.exclusive")}>
                    <HugeiconsIcon icon={Diamond02Icon} strokeWidth={2} />
                    <span>{t("sidebar.content")}</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive className="gap-2">
                        <HugeiconsIcon
                          icon={CrownIcon}
                          strokeWidth={2}
                          className="size-3.5 shrink-0 text-primary"
                        />
                        <span>{t("sidebar.vip")}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        aria-disabled
                        className="cursor-default opacity-60"
                        onClick={(e) => e.preventDefault()}
                      >
                        <span>{t("sidebar.semivip")}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        aria-disabled
                        className="cursor-default opacity-60"
                        onClick={(e) => e.preventDefault()}
                      >
                        <span>{t("sidebar.partners")}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
