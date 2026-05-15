import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDoubleCloseIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export function AppSidebarTitle() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                    <Link href="/">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary text-sidebar-foreground">
                            <HugeiconsIcon icon={ChevronDoubleCloseIcon} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col gap-0.5 leading-none">
                            <span className="font-semibold">Hack on COD</span>
                            <span className="">v3.2.1</span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}