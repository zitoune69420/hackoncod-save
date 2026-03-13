import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDoubleCloseIcon } from "@hugeicons/core-free-icons";

export function AppSidebarTitle() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                    <a href="#">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-neutral-200 text-sidebar-foreground">
                            <HugeiconsIcon icon={ChevronDoubleCloseIcon} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col gap-0.5 leading-none">
                            <span className="font-semibold">Hack on COD</span>
                            <span className="">v3.0.0</span>
                        </div>
                    </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}