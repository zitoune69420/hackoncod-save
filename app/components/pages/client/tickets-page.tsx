"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { getShopImageUrl } from "@/lib/shop-utils";
import { authClient } from "@/lib/auth-client";
import { useUserRole } from "@/hooks/use-user-role";
import { DASHBOARD_DEFAULT_PAGE } from "@/lib/dashboard-url";
import { TicketList } from "./ticket-list";
import { TicketChat } from "./ticket-chat";
import type {
  Ticket,
  ShopOrder,
  TicketMessageEnriched,
  TicketMessagesApiResponse,
} from "@/lib/supabase/shop-types";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/shop/tickets");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export function TicketsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const reduceMotion = useReducedMotion();
  const { data: session } = authClient.useSession();
  const { role } = useUserRole();
  const isAdminOrPartner = role === "founder" || role === "partner";

  const syncTicketsUrl = useCallback(
    (orderId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "tickets");
      if (orderId) params.set("orderId", orderId);
      else params.delete("orderId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const blockIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.18, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  };
  const sectionStagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0.04 : 0.08 } },
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [chatMessages, setChatMessages] = useState<TicketMessageEnriched[]>([]);
  const [viewerDiscordId, setViewerDiscordId] = useState<string | null>(null);
  const [chatImageUrl, setChatImageUrl] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (tk) =>
        (tk.order.product?.name ?? "").toLowerCase().includes(q) ||
        String(tk.order.ticket_number ?? "").includes(q) ||
        (tk.last_message?.content ?? "").toLowerCase().includes(q),
    );
  }, [tickets, searchQuery]);

  const loadTickets = useCallback(
    (skipCache = false) => {
      const key = cacheKey("tickets");
      if (!skipCache) {
        const cached = getCached<Ticket[]>(key);
        if (cached) {
          setTickets(cached);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setProgress(0);
      fetchTickets()
        .then((data) => {
          setCached(key, data);
          setTickets(data);
          setProgress(100);
        })
        .catch(() => {
          showToast({ text: t("tickets.toastError"), variant: "error" });
        })
        .finally(() => setLoading(false));
    },
    [t],
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  /** Client : un seul ticket → ouverture directe (pas de liste « tous les tickets »). */
  useEffect(() => {
    if (isAdminOrPartner) return;
    if (orderIdParam) return;
    if (loading) return;
    if (tickets.length !== 1) return;
    syncTicketsUrl(tickets[0].order.id);
  }, [isAdminOrPartner, orderIdParam, loading, tickets, syncTicketsUrl]);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setProgress((p) => (p >= 90 ? 90 : p + 10)), 200);
    return () => clearInterval(iv);
  }, [loading]);

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("tickets"));
    loadTickets(true);
  }, [loadTickets]);

  const openChat = useCallback(
    async (orderId: string, opts?: { skipUrlSync?: boolean }) => {
      if (!opts?.skipUrlSync) {
        syncTicketsUrl(orderId);
      }
      setChatLoading(true);
      setSelectedOrderId(orderId);
      try {
        const [msgJson, ticket] = await Promise.all([
          fetch(`/api/shop/tickets/${orderId}/messages`).then(
            (r) => r.json() as Promise<TicketMessagesApiResponse | TicketMessageEnriched[]>,
          ),
          Promise.resolve(tickets.find((tk) => tk.order.id === orderId)),
        ]);
        if (ticket) {
          setSelectedOrder(ticket.order);
          if (Array.isArray(msgJson)) {
            setChatMessages(msgJson);
            setViewerDiscordId(null);
          } else {
            setChatMessages(msgJson.messages ?? []);
            setViewerDiscordId(msgJson.viewerDiscordId ?? null);
          }
          const img =
            ticket.order.product && "image" in ticket.order.product
              ? await getShopImageUrl(
                  ticket.order.product.image as string | null,
                )
              : null;
          setChatImageUrl(img);
        }
      } catch {
        showToast({ text: t("tickets.toastError"), variant: "error" });
        setSelectedOrderId(null);
        syncTicketsUrl(null);
      } finally {
        setChatLoading(false);
      }
    },
    [tickets, t, syncTicketsUrl],
  );

  useEffect(() => {
    if (!orderIdParam) {
      if (selectedOrderId != null) {
        setSelectedOrderId(null);
        setSelectedOrder(null);
        setChatMessages([]);
        setViewerDiscordId(null);
        setChatImageUrl(null);
      }
      return;
    }
    if (loading || chatLoading) return;
    if (tickets.length === 0) {
      syncTicketsUrl(null);
      return;
    }
    const hasTicket = tickets.some((tk) => tk.order.id === orderIdParam);
    if (!hasTicket) {
      syncTicketsUrl(null);
      return;
    }
    if (selectedOrderId === orderIdParam && selectedOrder) return;
    void openChat(orderIdParam, { skipUrlSync: true });
  }, [
    orderIdParam,
    loading,
    chatLoading,
    tickets,
    selectedOrderId,
    selectedOrder,
    openChat,
    syncTicketsUrl,
  ]);

  const handleBack = useCallback(() => {
    if (!isAdminOrPartner && tickets.length === 1) {
      invalidateCache(cacheKey("tickets"));
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", DASHBOARD_DEFAULT_PAGE);
      params.delete("orderId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
      return;
    }
    syncTicketsUrl(null);
    invalidateCache(cacheKey("tickets"));
    loadTickets(true);
  }, [
    isAdminOrPartner,
    tickets.length,
    pathname,
    router,
    searchParams,
    syncTicketsUrl,
    loadTickets,
  ]);

  if (selectedOrderId && selectedOrder && !chatLoading) {
    return (
      <TicketChat
        orderId={selectedOrderId}
        order={selectedOrder}
        initialMessages={chatMessages}
        viewerDiscordId={viewerDiscordId}
        viewerAvatarUrl={session?.user?.image ?? null}
        isAdminOrPartner={isAdminOrPartner}
        imageUrl={chatImageUrl}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={blockIn} className="min-w-0">
          <h1 className="text-2xl font-semibold">{t("tickets.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("tickets.description")}
          </p>
        </motion.div>
        <motion.div variants={blockIn} className="flex shrink-0 gap-2">
          {isAdminOrPartner ? (
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={() => setSearchQuery(search)}
              placeholder={t("tickets.searchPlaceholder")}
            />
          ) : null}
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="gap-2 px-3"
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("tickets.refresh")}
          </Button>
        </motion.div>
      </motion.div>

      {loading || chatLoading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <TicketList tickets={filteredTickets} onSelect={openChat} />
      )}
    </div>
  );
}
