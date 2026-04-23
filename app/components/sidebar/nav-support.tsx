"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  ArrowRight01Icon,
  CustomerService01Icon,
} from "@hugeicons/core-free-icons";
import { CreateGeneralTicketDialog } from "@/app/components/sidebar/create-general-ticket-dialog";
import { Spinner } from "@/components/ui/spinner";
import type { Ticket } from "@/lib/supabase/shop-types";
import { useTicketChatLoading } from "@/app/dashboard/ticket-chat-loading-context";

async function fetchTicketsList(): Promise<Ticket[]> {
  const res = await fetch("/api/shop/tickets", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function UnreadTicketDot({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className="size-2 shrink-0 rounded-full bg-destructive"
      title={label}
      aria-label={label}
    />
  );
}

/** Pendant l’ouverture du chat, le GET liste peut précéder le POST /read → on force 0 côté UI. */
function patchTicketsForOpenConversation(
  list: Ticket[],
  page: string | undefined,
  openOrderId: string | null,
): Ticket[] {
  if (page !== "tickets" || !openOrderId) return list;
  return list.map((tk) =>
    tk.order.id === openOrderId ? { ...tk, unread_count: 0 } : tk,
  );
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
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const firstListLoadRef = useRef(true);
  const ticketViewRef = useRef<{
    page: string | undefined;
    orderId: string | null;
  }>({ page: currentPage, orderId: currentOrderId ?? null });

  useEffect(() => {
    ticketViewRef.current = {
      page: currentPage,
      orderId: currentOrderId ?? null,
    };
  }, [currentPage, currentOrderId]);

  const loadTickets = useCallback(
    async (showSpinner: boolean, lifecycle?: { cancelled: boolean }) => {
      if (showSpinner) {
        setLoading(true);
        setError(false);
      }
      try {
        const data = await fetchTicketsList();
        if (lifecycle?.cancelled) return;
        const { page, orderId } = ticketViewRef.current;
        setTickets(patchTicketsForOpenConversation(data, page, orderId));
        if (showSpinner) setError(false);
      } catch {
        if (lifecycle?.cancelled) return;
        if (showSpinner) setError(true);
      } finally {
        // Toujours arrêter le spinner si on l’a affiché (évite chargement infini si la requête
        // est annulée au démontage / React Strict Mode).
        if (showSpinner) setLoading(false);
      }
    },
    [],
  );

  const handleGeneralTicketCreated = useCallback(
    async (orderId: string) => {
      await loadTickets(false);
      onSelectPageAction?.("tickets", { ticketOrderId: orderId });
    },
    [loadTickets, onSelectPageAction],
  );

  /** Pastille retirée dès qu’on ouvre une conv (avant la fin du fetch / du POST read). */
  useEffect(() => {
    if (currentPage !== "tickets" || !currentOrderId) return;
    setTickets((prev) =>
      patchTicketsForOpenConversation(prev, currentPage, currentOrderId),
    );
  }, [currentPage, currentOrderId]);

  useEffect(() => {
    const showSpinner = firstListLoadRef.current;
    firstListLoadRef.current = false;
    const lifecycle = { cancelled: false };
    void loadTickets(showSpinner, lifecycle);
    return () => {
      lifecycle.cancelled = true;
    };
  }, [currentPage, currentOrderId, loadTickets]);

  useEffect(() => {
    const id = setInterval(() => void loadTickets(false), 45_000);
    return () => clearInterval(id);
  }, [loadTickets]);

  const totalUnread = tickets.reduce((acc, tk) => acc + tk.unread_count, 0);
  const totalUnreadLabel =
    totalUnread > 0
      ? `${totalUnread} ${t("tickets.unread")}`
      : "";

  const isTicketsPage = currentPage === "tickets";
  const allListActive = isTicketsPage && !currentOrderId;

  return (
    <SidebarGroup>
      <CreateGeneralTicketDialog
        open={createTicketOpen}
        onOpenChange={setCreateTicketOpen}
        onCreated={handleGeneralTicketCreated}
      />
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
                <span className="min-w-0 flex-1 truncate">
                  {t("sidebar.tickets")}
                </span>
                <UnreadTicketDot count={totalUnread} label={totalUnreadLabel} />
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem key="tickets-create">
                  <SidebarMenuSubButton asChild>
                    <button
                      type="button"
                      onClick={() => setCreateTicketOpen(true)}
                      className="w-full text-left"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {t("tickets.createTicket.button")}
                      </span>
                    </button>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem key="tickets-all">
                  <SidebarMenuSubButton
                    isActive={allListActive}
                    onClick={() => onSelectPageAction?.("tickets")}
                    className="gap-2"
                  >
                    {navTransitionPending && pendingNavPageId === "tickets" ? (
                      <Spinner className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {t("tickets.allTickets")}
                    </span>
                    <UnreadTicketDot
                      count={totalUnread}
                      label={totalUnreadLabel}
                    />
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
                    const rowUnreadLabel =
                      tk.unread_count > 0
                        ? `${tk.unread_count} ${t("tickets.unread")}`
                        : "";
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
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={ticketSidebarTitle(tk, t)}
                          >
                            {ticketSidebarTitle(tk, t)}
                          </span>
                          <UnreadTicketDot
                            count={tk.unread_count}
                            label={rowUnreadLabel}
                          />
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
