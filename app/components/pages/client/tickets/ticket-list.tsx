"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import type { Ticket } from "@/lib/supabase/shop-types";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default",
  in_progress: "default",
  waiting_client: "secondary",
  completed: "secondary",
};

interface TicketListProps {
  tickets: Ticket[];
  onSelect: (orderId: string) => void;
}

export function TicketList({ tickets, onSelect }: TicketListProps) {
  const { t } = useTranslations();

  if (tickets.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("tickets.noTickets")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket) => {
        const { order, last_message, unread_count } = ticket;
        const discordLabel =
          ticket.client_discord_display?.trim() ||
          t("tickets.sidebarUnknownDiscord");

        return (
          <Card
            key={order.id}
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => onSelect(order.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Ticket #{order.ticket_number ?? 1}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {unread_count > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unread_count}
                    </Badge>
                  )}
                  <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                    {t(`tickets.status.${order.status}`)}
                  </Badge>
                </div>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {discordLabel}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-3.5 shrink-0" />
                {last_message ? (
                  <span className="line-clamp-1">
                    {last_message.content.slice(0, 60)}
                    {last_message.content.length > 60 ? "…" : ""}
                  </span>
                ) : (
                  <span>{t("tickets.noMessagesYet")}</span>
                )}
              </div>
              {last_message && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground/60">
                  {new Date(last_message.created_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
