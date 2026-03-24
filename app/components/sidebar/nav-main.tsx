"use client";

import { useTranslations } from "@/app/components/i18n-provider";
import { prefetchReviews } from "@/app/components/pages/client/reviews";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

export function NavMain({
  items,
  currentPage,
  onSelectPageAction,
  label,
}: {
  items: {
    id?: string;
    title: string;
    icon?: React.ReactNode;
    items?: {
      title: string;
      pageId: string;
    }[];
  }[];
  currentPage?: string;
  onSelectPageAction?: (pageId: string) => void;
  label?: string;
}) {
  const { t } = useTranslations();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label ?? t("sidebar.platform")}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.id ?? item.title}
            asChild
            defaultOpen={true}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon}
                  <span>{item.title}</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem, idx) => (
                    <SidebarMenuSubItem key={`${item.id ?? item.title}-${idx}`}>
                      <SidebarMenuSubButton
                        isActive={currentPage === subItem.pageId}
                        onClick={() => onSelectPageAction?.(subItem.pageId)}
                        onMouseEnter={() =>
                          subItem.pageId === "reviews" && prefetchReviews()
                        }
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
