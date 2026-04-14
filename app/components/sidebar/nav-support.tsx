"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
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
import { ArrowRight01Icon, CustomerService01Icon } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import type { Ticket } from "@/lib/supabase/shop-types";
import { useTicketChatLoading } from "@/app/dashboard/ticket-chat-loading-context";

async function fetchTicketsList(): Promise<Ticket[]> {
  const res = await fetch("/api/shop/tickets");
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function ticketSidebarTitle(ticket: Ticket, tAll: (key: string) => string): string {
  const pseudo =
    ticket.client_discord_display?.trim() ||
    tAll("tickets.sidebarUnknownDiscord");
  const num = ticket.order.ticket_number;
  if (num != null) {
    return `#${num} · ${pseudo}`;
  }
  return pseudo;
}

export function NavSupport({
  currentPage,
  currentOrderId,
  onSelectPageAction,
  pendingNavPageId,
  navTransitionPending,
}: {
  currentPage?: string;
  currentOrderId?: string | null;
  onSelectPageAction?: (
    pageId: string,
    options?: { ticketOrderId?: string | null },
  ) => void;
  pendingNavPageId?: string | null;
  navTransitionPending?: boolean;
}) {
  const { t } = useTranslations();
  const { loadingOrderId } = useTicketChatLoading();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTicketsList()
      .then((data) => {
        if (!cancelled) setTickets(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isTicketsPage = currentPage === "tickets";
  const allListActive = isTicketsPage && !currentOrderId;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("sidebar.support")}</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible
          defaultOpen={false}
          className="group/collapsible"
          asChild
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={t("sidebar.tickets")}>
                <HugeiconsIcon icon={CustomerService01Icon} strokeWidth={2} />
                <span>{t("sidebar.tickets")}</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem key="tickets-all">
                  <SidebarMenuSubButton
                    isActive={allListActive}
                    onClick={() => onSelectPageAction?.("tickets")}
                    className="gap-2"
                  >
                    {navTransitionPending && pendingNavPageId === "tickets" ? (
                      <Spinner className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : null}
                    <span>{t("tickets.allTickets")}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                {loading ? (
                  <SidebarMenuSubItem key="tickets-loading">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                      <Spinner className="size-3.5" />
                      {t("tickets.sidebarLoading")}
                    </div>
                  </SidebarMenuSubItem>
                ) : error ? (
                  <SidebarMenuSubItem key="tickets-error">
                    <span className="block px-2 py-1.5 text-xs text-muted-foreground">
                      {t("tickets.sidebarError")}
                    </span>
                  </SidebarMenuSubItem>
                ) : (
                  tickets.map((tk) => {
                    const oid = tk.order.id;
                    const active =
                      isTicketsPage && currentOrderId === oid;
                    const chatOpening =
                      loadingOrderId != null && loadingOrderId === oid;
                    const showRowSpinner =
                      chatOpening ||
                      (navTransitionPending &&
                        pendingNavPageId === "tickets" &&
                        active);
                    return (
                      <SidebarMenuSubItem key={oid}>
                        <SidebarMenuSubButton
                          isActive={active}
                          onClick={() =>
                            onSelectPageAction?.("tickets", {
                              ticketOrderId: oid,
                            })
                          }
                          className="gap-2"
                        >
                          {showRowSpinner ? (
                            <Spinner className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : null}
                          <span className="truncate" title={ticketSidebarTitle(tk, t)}>
                            {ticketSidebarTitle(tk, t)}
                          </span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })
                )}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
