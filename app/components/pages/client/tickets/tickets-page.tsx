"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DiscordIcon,
  Loading03Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import {
  cacheKey,
  getCached,
  invalidateCache,
  setCached,
  ticketsListCacheKey,
} from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { getShopImageUrl } from "@/lib/shop-utils";
import { authClient } from "@/lib/auth-client";
import { useUserRole } from "@/hooks/use-user-role";
import { DASHBOARD_DEFAULT_PAGE } from "@/lib/dashboard-url";
import { useTicketChatLoading } from "@/app/dashboard/ticket-chat-loading-context";
import { TicketList } from "./ticket-list";
import { TicketChat } from "./ticket-chat";
import type {
  Ticket,
  ShopOrder,
  TicketMessageEnriched,
  TicketMessagesApiResponse,
} from "@/lib/supabase/shop-types";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/shop/tickets", { cache: "no-store" });
  if (res.status === 401) {
    const err = new Error("unauthorized");
    throw err;
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export function TicketsPage() {
  const { t } = useTranslations();
  const { setTicketChatLoading } = useTicketChatLoading();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const reduceMotion = useReducedMotion();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const ticketsCacheKey = userId ? ticketsListCacheKey(userId) : null;
  const { role } = useUserRole();
  const isAdminOrPartner = role === "founder" || role === "partner";
  const [isSigningIn, setIsSigningIn] = useState(false);
  const legacyTicketsCachePurged = useRef(false);

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

  /** Un rechargement API si l’URL contient un orderId pas encore dans la liste (ex. commande fraîche). */
  const didRefetchForMissingOrder = useRef(false);

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

  const ticketsSignInCallbackUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", "tickets");
    if (orderIdParam) p.set("orderId", orderIdParam);
    return `/dashboard?${p.toString()}`;
  }, [orderIdParam]);

  const loadTickets = useCallback(
    (skipCache = false) => {
      if (!ticketsCacheKey) {
        setTickets([]);
        setLoading(false);
        return;
      }
      if (!skipCache) {
        const cached = getCached<Ticket[]>(ticketsCacheKey);
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
          setCached(ticketsCacheKey, data);
          setTickets(data);
          setProgress(100);
        })
        .catch((err: unknown) => {
          if (
            err instanceof Error &&
            err.message === "unauthorized" &&
            ticketsCacheKey
          ) {
            invalidateCache(ticketsCacheKey);
          }
          showToast({ text: t("tickets.toastError"), variant: "error" });
        })
        .finally(() => setLoading(false));
    },
    [t, ticketsCacheKey],
  );

  useEffect(() => {
    if (sessionPending) return;
    if (!userId) {
      setTickets([]);
      setSelectedOrderId(null);
      setSelectedOrder(null);
      setChatMessages([]);
      setViewerDiscordId(null);
      setChatImageUrl(null);
      setLoading(false);
      return;
    }
    if (!legacyTicketsCachePurged.current) {
      legacyTicketsCachePurged.current = true;
      invalidateCache(cacheKey("tickets"));
    }
    loadTickets();
  }, [sessionPending, userId, loadTickets]);

  /** Client : un seul ticket → ouverture directe (pas de liste « tous les tickets »). */
  useEffect(() => {
    if (isAdminOrPartner) return;
    if (orderIdParam) return;
    if (loading) return;
    if (tickets.length !== 1) return;
    syncTicketsUrl(tickets[0].order.id);
  }, [isAdminOrPartner, orderIdParam, loading, tickets, syncTicketsUrl]);

  useEffect(() => {
    if (!loading && !sessionPending) return;
    const iv = setInterval(() => setProgress((p) => (p >= 90 ? 90 : p + 10)), 200);
    return () => clearInterval(iv);
  }, [loading, sessionPending]);

  const handleRefresh = useCallback(() => {
    if (ticketsCacheKey) invalidateCache(ticketsCacheKey);
    loadTickets(true);
  }, [loadTickets, ticketsCacheKey]);

  const openChat = useCallback(
    async (orderId: string, opts?: { skipUrlSync?: boolean }) => {
      if (!opts?.skipUrlSync) {
        syncTicketsUrl(orderId);
      }
      setChatLoading(true);
      setTicketChatLoading(orderId);
      setSelectedOrderId(orderId);
      try {
        const [msgRes, ticket] = await Promise.all([
          fetch(`/api/shop/tickets/${orderId}/messages`, {
            cache: "no-store",
          }),
          Promise.resolve(tickets.find((tk) => tk.order.id === orderId)),
        ]);
        if (msgRes.status === 401) {
          if (ticketsCacheKey) invalidateCache(ticketsCacheKey);
          setSelectedOrderId(null);
          setSelectedOrder(null);
          setChatMessages([]);
          setViewerDiscordId(null);
          setChatImageUrl(null);
          syncTicketsUrl(null);
          showToast({ text: t("tickets.toastError"), variant: "error" });
          return;
        }
        if (!msgRes.ok) {
          throw new Error(String(msgRes.status));
        }
        const msgJson =
          (await msgRes.json()) as
            | TicketMessagesApiResponse
            | TicketMessageEnriched[];
        if (!ticket) {
          setSelectedOrderId(null);
          setSelectedOrder(null);
          setChatMessages([]);
          setViewerDiscordId(null);
          setChatImageUrl(null);
          showToast({ text: t("tickets.toastError"), variant: "error" });
          return;
        }
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
      } catch {
        showToast({ text: t("tickets.toastError"), variant: "error" });
        setSelectedOrderId(null);
        setSelectedOrder(null);
        setChatMessages([]);
        syncTicketsUrl(null);
      } finally {
        setChatLoading(false);
        setTicketChatLoading(null);
      }
    },
    [tickets, t, syncTicketsUrl, setTicketChatLoading, ticketsCacheKey],
  );

  useEffect(() => {
    didRefetchForMissingOrder.current = false;
  }, [orderIdParam]);

  useEffect(() => {
    if (!userId || sessionPending) return;

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

    if (loading) return;

    const hasTicket = tickets.some((tk) => tk.order.id === orderIdParam);
    if (!hasTicket) {
      if (!didRefetchForMissingOrder.current) {
        didRefetchForMissingOrder.current = true;
        if (ticketsCacheKey) invalidateCache(ticketsCacheKey);
        loadTickets(true);
        return;
      }
      didRefetchForMissingOrder.current = false;
      showToast({ text: t("tickets.toastError"), variant: "error" });
      syncTicketsUrl(null);
      return;
    }

    if (chatLoading) return;
    if (selectedOrderId === orderIdParam && selectedOrder) return;
    void openChat(orderIdParam, { skipUrlSync: true });
  }, [
    userId,
    sessionPending,
    orderIdParam,
    loading,
    chatLoading,
    tickets,
    selectedOrderId,
    selectedOrder,
    openChat,
    syncTicketsUrl,
    t,
    loadTickets,
    ticketsCacheKey,
  ]);

  const handleBack = useCallback(() => {
    if (!isAdminOrPartner && tickets.length === 1) {
      if (ticketsCacheKey) invalidateCache(ticketsCacheKey);
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", DASHBOARD_DEFAULT_PAGE);
      params.delete("orderId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
      return;
    }
    syncTicketsUrl(null);
    if (ticketsCacheKey) invalidateCache(ticketsCacheKey);
    loadTickets(true);
  }, [
    isAdminOrPartner,
    tickets.length,
    pathname,
    router,
    searchParams,
    syncTicketsUrl,
    loadTickets,
    ticketsCacheKey,
  ]);

  const signInWithDiscord = useCallback(async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: ticketsSignInCallbackUrl,
      });
    } catch {
      /* silencieux */
    } finally {
      setIsSigningIn(false);
    }
  }, [ticketsSignInCallbackUrl]);

  if (sessionPending) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3">
        <Progress value={progress} className="h-1 w-48" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{t("tickets.guestGateTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("tickets.guestGateDescription")}
          </p>
        </div>
        <Button
          type="button"
          className="w-full gap-2"
          disabled={isSigningIn}
          onClick={() => void signInWithDiscord()}
        >
          <HugeiconsIcon icon={DiscordIcon} strokeWidth={2} className="size-4" />
          {isSigningIn ? t("common.signingIn") : t("common.signIn")}
        </Button>
      </div>
    );
  }

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
        <div className="flex min-h-48 flex-col items-center justify-center gap-3">
          {chatLoading ? (
            <>
              <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-8 shrink-0 animate-spin text-muted-foreground"
              />
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {t("tickets.loadingMessages")}
              </p>
            </>
          ) : (
            <Progress value={progress} className="h-1 w-48" />
          )}
        </div>
      ) : (
        <TicketList tickets={filteredTickets} onSelect={openChat} />
      )}
    </div>
  );
}
