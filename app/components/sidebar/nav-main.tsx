"use client";

import { useTranslations } from "@/app/components/i18n-provider";
import { prefetchReviews } from "@/app/components/pages/client/reviews";
import { useUserRole } from "@/hooks/use-user-role";
import { canSeeExclusiveNavItem, type UserRole } from "@/lib/permissions";
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
    /** Si défini, toute la section (Server, Shop, etc.) n’est visible que pour ce rôle. */
    requiredRole?: UserRole;
    items?: {
      title: string;
      pageId: string;
      requiredRole?: UserRole;
    }[];
  }[];
  currentPage?: string;
  onSelectPageAction?: (pageId: string) => void;
  label?: string;
}) {
  const { t } = useTranslations();
  const { role } = useUserRole();
  const filteredItems = items
    .filter((item) =>
      item.requiredRole
        ? canSeeExclusiveNavItem(role, item.requiredRole)
        : true,
    )
    .map((item) => ({
      ...item,
      items: item.items?.filter((subItem) =>
        subItem.requiredRole
          ? canSeeExclusiveNavItem(role, subItem.requiredRole)
          : true,
      ),
    }))
    .filter((item) => (item.items?.length ?? 0) > 0);

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label ?? t("sidebar.platform")}</SidebarGroupLabel>
      <SidebarMenu>
        {filteredItems.map((item) => (
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
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem
                      key={`${item.id ?? item.title}-${subItem.pageId}`}
                    >
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
