"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  SentIcon,
  Loading03Icon,
  Archive01Icon,
  Delete02Icon,
  Tick02Icon,
  MessageProgrammingIcon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import {
  buildAccountDeliveryPayload,
  parseAccountDeliveryContent,
  TicketAccountDeliveryBlock,
} from "./ticket-account-delivery";
import {
  buildCheatDeliveryPayload,
  parseCheatDeliveryContent,
  TicketCheatDeliveryBlock,
} from "./ticket-cheat-delivery";
import { TicketInfoPanel } from "./ticket-info-panel";
import { ForumMarkdown } from "@/app/components/pages/client/forum/forum-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { discordDefaultEmbedAvatarUrl } from "@/lib/discord/discord-embed-avatar-fallback";
import { cn } from "@/lib/utils";
import type {
  ShopOrder,
  TicketMessageEnriched,
  TicketMessagesApiResponse,
} from "@/lib/supabase/shop-types";

const POLL_INTERVAL = 3000;

type SpecialMessageKind = "language" | "account" | "cheat";

type SpecialMessageKindOrNone = SpecialMessageKind | "none";

interface TicketChatProps {
  orderId: string;
  order: ShopOrder;
  initialMessages: TicketMessageEnriched[];
  /** Fetch des messages en cours : affiche un squelette plutôt que "Aucun message". */
  messagesLoading?: boolean;
  /**
   * Snowflake Discord du visiteur (enrichissement API / secours).
   * Ne pas s’en servir seul pour « mes » messages : côté client il est souvent null.
   */
  viewerDiscordId: string | null;
  /** Image session (souvent l’avatar Discord OAuth) en secours pour ta bulle. */
  viewerAvatarUrl?: string | null;
  isAdminOrPartner: boolean;
  imageUrl?: string | null;
  onBack: () => void;
}

/** Bulles squelettes pour combler la zone messages pendant le fetch initial. */
function MessagesSkeleton() {
  /* Tableau statique : largeurs / alignements pré-définis pour un aspect "discussion". */
  const rows: { side: "left" | "right"; w: string }[] = [
    { side: "left", w: "w-[60%]" },
    { side: "right", w: "w-[40%]" },
    { side: "left", w: "w-[70%]" },
    { side: "right", w: "w-[35%]" },
    { side: "left", w: "w-[50%]" },
  ];
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            "flex items-end gap-2",
            r.side === "right" ? "justify-end" : "justify-start",
          )}
        >
          {r.side === "left" && (
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
          )}
          <div
            className={cn(
              "h-10 animate-pulse rounded-2xl bg-muted",
              r.w,
              r.side === "right" ? "rounded-br-md" : "rounded-bl-md",
            )}
          />
          {r.side === "right" && (
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
          )}
        </div>
      ))}
    </div>
  );
}

const TIMESTAMP_GROUP_MAX_GAP_MS = 3 * 60 * 1000;
const MESSAGE_SHOW_DATE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Clé d’expéditeur pour le regroupement : sans ça, plusieurs messages avec `sent_by` null
 * sont traités comme le même expéditeur → une seule pp / heure en bas de bloc.
 */
function senderKeyForGrouping(msg: TicketMessageEnriched): string {
  if (msg.type === "system") {
    return `system:${msg.id}`;
  }
  const sb = msg.sent_by?.trim();
  if (sb) {
    return `${msg.type}:${sb}`;
  }
  return `${msg.type}:noid:${msg.id}`;
}

/** Afficher l’heure (et la date si > 24 h) uniquement sous le dernier message d’un groupe : même expéditeur, écart ≤ 3 min. */
function shouldShowTimestampOnMessage(
  msg: TicketMessageEnriched,
  next: TicketMessageEnriched | undefined,
): boolean {
  if (!next) return true;
  const tMsg = new Date(msg.created_at).getTime();
  const tNext = new Date(next.created_at).getTime();
  if (senderKeyForGrouping(next) !== senderKeyForGrouping(msg)) return true;
  if (tNext - tMsg > TIMESTAMP_GROUP_MAX_GAP_MS) return true;
  return false;
}

function formatTicketMessageTimestamp(iso: string): string {
  const d = new Date(iso);
  const ageMs = Date.now() - d.getTime();
  if (ageMs > MESSAGE_SHOW_DATE_AFTER_MS) {
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Même largeur qu’un avatar 8 pour garder l’alignement des bulles quand la pp est masquée. */
function messageAvatarSpacer() {
  return <div className="mt-0.5 size-8 shrink-0 self-end" aria-hidden />;
}

function parseMessagesApiPayload(json: unknown): TicketMessagesApiResponse {
  if (Array.isArray(json)) {
    return { messages: json as TicketMessageEnriched[], viewerDiscordId: null };
  }
  if (json && typeof json === "object" && "messages" in json) {
    const o = json as {
      messages?: unknown;
      viewerDiscordId?: unknown;
    };
    return {
      messages: Array.isArray(o.messages)
        ? (o.messages as TicketMessageEnriched[])
        : [],
      viewerDiscordId:
        typeof o.viewerDiscordId === "string" ? o.viewerDiscordId : null,
    };
  }
  return { messages: [], viewerDiscordId: null };
}

function messageAvatarSrc(
  msg: TicketMessageEnriched,
  opts: { isOwn: boolean; viewerAvatarUrl?: string | null },
): string | undefined {
  const fromApi = msg.author_avatar_url?.trim();
  if (fromApi) return fromApi;
  if (opts.isOwn && opts.viewerAvatarUrl?.trim()) return opts.viewerAvatarUrl.trim();
  if (msg.sent_by) return discordDefaultEmbedAvatarUrl(msg.sent_by);
  return undefined;
}

function messageAvatarFallbackLabel(msg: TicketMessageEnriched): string {
  const name = msg.author_display_name?.trim();
  if (name) return name.slice(0, 2).toUpperCase();
  if (msg.sent_by) return msg.sent_by.slice(-2);
  return "?";
}

/** Message d’accueil commande (système ou ancien contenu staff/client). */
function resolveOrderReceivedContent(
  content: string,
  t: (key: string, vars?: Record<string, string>) => string,
): string | null {
  const trimmed = content.trim();
  /** Anciens messages courts ou marqueur seul — le message riche markdown n’est pas remplacé. */
  if (trimmed === "[ORDER_RECEIVED]" || trimmed === "[ORDER_RECEIVED_V1]") {
    return t("tickets.orderReceivedSystem");
  }
  if (/^commande\s+reçue\.?$/i.test(trimmed)) return t("tickets.orderReceivedSystem");
  if (/^order\s+received\.?$/i.test(trimmed)) return t("tickets.orderReceivedSystem");
  return null;
}

const LANGUAGE_PICKER_MARKER = "[LANGUAGE_PICKER]";

function languageDisplayLabel(
  inner: string,
  t: (key: string, vars?: Record<string, string>) => string,
): string {
  const lower = inner.trim().toLowerCase();
  if (lower === "fr") return t("tickets.language.french");
  if (lower === "en") return t("tickets.language.english");
  if (lower === "other") return t("tickets.language.other");
  return inner.trim();
}

function processSystemContent(content: string, t: (key: string, vars?: Record<string, string>) => string): string {
  if (content.includes("[TICKET_ARCHIVED:true]")) return t("tickets.ticketArchivedSystem");
  if (content.includes("[TICKET_ARCHIVED:false]")) return t("tickets.ticketUnarchivedSystem");
  if (content.includes("[SALE_CONFIRMED]")) return t("tickets.saleConfirmed");
  if (content.startsWith("[LANGUAGE_SET:")) {
    const raw = content.replace("[LANGUAGE_SET:", "").replace("]", "");
    const language = languageDisplayLabel(raw, t);
    return t("tickets.languageSet", { language });
  }
  const orderLine = resolveOrderReceivedContent(content, t);
  if (orderLine) return orderLine;
  return content;
}

function isLanguagePickerResolved(
  pickerMsg: TicketMessageEnriched,
  all: TicketMessageEnriched[],
): boolean {
  const t0 = new Date(pickerMsg.created_at).getTime();
  return all.some(
    (m) =>
      m.type === "system" &&
      m.content.trim().startsWith("[LANGUAGE_SET:") &&
      new Date(m.created_at).getTime() > t0,
  );
}

function TicketChatLanguagePicker({
  orderId,
  resolved,
  isTicketOwner,
  canInteract,
  onConfirm,
}: {
  orderId: string;
  resolved: boolean;
  isTicketOwner: boolean;
  canInteract: boolean;
  onConfirm: (code: "fr" | "en" | "other") => Promise<boolean>;
}) {
  const { t } = useTranslations();
  const [choice, setChoice] = useState<"fr" | "en" | "other">("fr");
  const [pending, setPending] = useState(false);

  if (resolved) {
    return (
      <p className="text-center text-muted-foreground">
        {t("tickets.languagePickerDone")}
      </p>
    );
  }

  if (!isTicketOwner) {
    return (
      <p className="text-center text-muted-foreground">
        {t("tickets.languagePickerWaiting")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-snug text-foreground/90">
        {t("tickets.languagePickerPrompt")}
      </p>
      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor={`lang-pick-${orderId}`}
          className="text-xs font-semibold leading-none"
        >
          {t("tickets.languageLabel")}
        </Label>
        <Select
          value={choice}
          onValueChange={(v) => setChoice(v as "fr" | "en" | "other")}
        >
          <SelectTrigger
            id={`lang-pick-${orderId}`}
            className="h-9 w-full bg-background/50"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100] p-2">
            <SelectItem value="fr">{t("tickets.language.french")}</SelectItem>
            <SelectItem value="en">{t("tickets.language.english")}</SelectItem>
            <SelectItem value="other">{t("tickets.language.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={!canInteract || pending}
        onClick={() => {
          void (async () => {
            setPending(true);
            await onConfirm(choice);
            setPending(false);
          })();
        }}
      >
        {t("tickets.languagePickerConfirm")}
      </Button>
    </div>
  );
}

export function TicketChat({
  orderId,
  order: initialOrder,
  initialMessages,
  messagesLoading = false,
  viewerDiscordId: viewerDiscordIdProp,
  viewerAvatarUrl,
  isAdminOrPartner,
  imageUrl,
  onBack,
}: TicketChatProps) {
  const { t } = useTranslations();
  const [messages, setMessages] = useState<TicketMessageEnriched[]>(initialMessages);
  const [viewerDiscordId, setViewerDiscordId] = useState<string | null>(
    viewerDiscordIdProp,
  );
  const [newMessage, setNewMessage] = useState("");
  const [specialKind, setSpecialKind] =
    useState<SpecialMessageKindOrNone>("none");
  const [accountIdentifierDraft, setAccountIdentifierDraft] = useState("");
  const [accountPasswordDraft, setAccountPasswordDraft] = useState("");
  const [accountEmailDraft, setAccountEmailDraft] = useState("");
  const [cheatDownloadDraft, setCheatDownloadDraft] = useState("");
  const [cheatSpooferDraft, setCheatSpooferDraft] = useState("");
  const [cheatNotesDraft, setCheatNotesDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [order, setOrder] = useState(initialOrder);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /** Incrémenté après envoi pour remonter l’Input et appliquer autoFocus sans ref (Input ui sans forwardRef). */
  const [composerRemountKey, setComposerRemountKey] = useState(0);
  const markedAsReadRef = useRef(false);

  const scrollToBottom = useCallback((force = false) => {
    if (!containerRef.current || !messagesEndRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    if (force || isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/shop/tickets/${orderId}/read`, { method: "POST" });
    } catch { /* silent */ }
  }, [orderId]);

  useEffect(() => {
    if (!markedAsReadRef.current) {
      markedAsReadRef.current = true;
      markAsRead();
    }
  }, [markAsRead]);

  useEffect(() => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  useEffect(() => {
    setViewerDiscordId(viewerDiscordIdProp);
  }, [viewerDiscordIdProp]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (isSending) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/shop/tickets/${orderId}/messages`);
        if (!res.ok) return;
        const data = parseMessagesApiPayload(await res.json());
        if (data.viewerDiscordId != null) {
          setViewerDiscordId(data.viewerDiscordId);
        }
        if (data.messages.length > messages.length) {
          setMessages(data.messages);
          setTimeout(() => scrollToBottom(), 50);
          markAsRead();
        }
      } catch { /* silent */ }
    };

    const iv = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(iv);
  }, [orderId, messages.length, isSending, scrollToBottom, markAsRead]);

  async function postTicketMessage(
    rawContent: string,
    opts: { asSystem?: boolean; clearComposer?: boolean } = {},
  ): Promise<boolean> {
    const content = rawContent.trim();
    if (!content || isSending) return false;

    setIsSending(true);
    try {
      const body: Record<string, unknown> = { content };
      if (opts.asSystem) body.type = "system";
      const res = await fetch(`/api/shop/tickets/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const msg = (await res.json()) as TicketMessageEnriched;
      setMessages((prev) => [...prev, msg]);
      if (opts.clearComposer) {
        setNewMessage("");
        setComposerRemountKey((k) => k + 1);
      }
      setTimeout(() => scrollToBottom(true), 50);
      return true;
    } catch {
      showToast({ text: t("tickets.errorSending"), variant: "error" });
      return false;
    } finally {
      setIsSending(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await postTicketMessage(newMessage, { clearComposer: true });
  }

  async function sendSpecialLanguagePickerMessage() {
    const ok = await postTicketMessage(LANGUAGE_PICKER_MARKER, {
      asSystem: true,
    });
    if (ok) closeSpecialPanel();
  }

  async function sendClientLanguageChoice(code: "fr" | "en" | "other") {
    const ok = await postTicketMessage(`[LANGUAGE_SET:${code}]`);
    if (ok) {
      setOrder((o) => ({ ...o, language: code }));
    }
    return ok;
  }

  async function sendSpecialAccountSystem() {
    const payload = buildAccountDeliveryPayload({
      identifier: accountIdentifierDraft,
      password: accountPasswordDraft,
      email: accountEmailDraft,
    });
    const ok = await postTicketMessage(payload, { asSystem: true });
    if (ok) {
      setAccountIdentifierDraft("");
      setAccountPasswordDraft("");
      setAccountEmailDraft("");
      closeSpecialPanel();
    }
  }

  async function sendSpecialCheatSystem() {
    const payload = buildCheatDeliveryPayload({
      downloadUrl: cheatDownloadDraft,
      spooferUrl: cheatSpooferDraft,
      notes: cheatNotesDraft,
    });
    const ok = await postTicketMessage(payload, { asSystem: true });
    if (ok) {
      setCheatDownloadDraft("");
      setCheatSpooferDraft("");
      setCheatNotesDraft("");
      closeSpecialPanel();
    }
  }

  function closeSpecialPanel() {
    setSpecialKind("none");
  }

  const showSpecialPanel = isAdminOrPartner && specialKind !== "none";

  async function handleArchive() {
    const archived = !order.archived;
    try {
      await fetch(`/api/admin/tickets/${orderId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      setOrder((o) => ({ ...o, archived }));
      showToast({
        text: archived ? t("tickets.archiveSuccess") : t("tickets.unarchiveSuccess"),
        variant: "success",
      });
    } catch { /* silent */ }
  }

  async function handleConfirmSale() {
    try {
      await fetch(`/api/admin/tickets/${orderId}/confirm-sale`, { method: "POST" });
      setOrder((o) => ({ ...o, status: "completed" }));
      showToast({ text: t("tickets.saleConfirmed"), variant: "success" });
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!confirm(t("tickets.deleteConfirm"))) return;
    try {
      await fetch(`/api/admin/tickets/${orderId}`, { method: "DELETE" });
      showToast({ text: t("tickets.deleteSuccess"), variant: "success" });
      onBack();
    } catch { /* silent */ }
  }

  const canSend = !order.archived || isAdminOrPartner;

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Chat area — thème sombre forcé pour le contraste */}
      <div className="lg:col-span-7">
        <div className="dark h-full min-h-0">
          <Card className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-xl border-border/60 bg-card py-0 text-card-foreground shadow-sm">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border/60 p-4">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold">
                  Ticket #{order.ticket_number ?? 1}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {t(`tickets.status.${order.status}`)}
                </Badge>
                {order.archived && (
                  <Badge variant="destructive" className="text-xs">
                    {t("tickets.archived")}
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {order.product_type === "support"
                  ? t("tickets.supportTicketProductName")
                  : (order.product?.name ?? "")}
              </p>
            </div>
            {isAdminOrPartner && (
              <div className="flex shrink-0 gap-1">
                {order.status !== "completed" && (
                  <Button variant="ghost" size="icon-sm" onClick={handleConfirmSale} title={t("tickets.confirmSale")}>
                    <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4 text-green-500" />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={handleArchive} title={order.archived ? t("tickets.unarchive") : t("tickets.archive")}>
                  <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={handleDelete} title={t("tickets.delete")}>
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div
            ref={containerRef}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex flex-col justify-end gap-2" style={{ minHeight: "100%" }}>
              {messages.length === 0 && messagesLoading && <MessagesSkeleton />}
              {messages.length === 0 && !messagesLoading && (
                <p className="text-center text-sm text-muted-foreground">{t("tickets.noMessages")}</p>
              )}
              {messages.map((msg, i) => {
                const isOwn = isAdminOrPartner
                  ? msg.type === "admin" || msg.type === "staff"
                  : msg.type === "client";
                const isSystem = msg.type === "system";
                const nextMsg = messages[i + 1];
                const showMessageTimestamp = shouldShowTimestampOnMessage(
                  msg,
                  nextMsg,
                );

                const isOwnLanguagePickerSent =
                  isSystem &&
                  msg.content.trim() === LANGUAGE_PICKER_MARKER &&
                  !isAdminOrPartner &&
                  String(msg.sent_by ?? "").trim() ===
                    String(order.user_id ?? "").trim();

                if (isOwnLanguagePickerSent) {
                  const avatarSrcSelf = messageAvatarSrc(msg, {
                    isOwn: true,
                    viewerAvatarUrl,
                  });
                  const bubbleSelf = (
                    <div className="flex min-w-0 flex-col items-end">
                      <div className="min-w-0 max-w-[min(100%,24rem)] overflow-hidden rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm leading-relaxed text-primary-foreground">
                        <p className="leading-relaxed">
                          {t("tickets.languagePickerSentSelf")}
                        </p>
                      </div>
                      {showMessageTimestamp && (
                        <span className="mt-0.5 px-1 text-[10px] text-muted-foreground/60">
                          {formatTicketMessageTimestamp(msg.created_at)}
                        </span>
                      )}
                    </div>
                  );
                  const avatarSelf = showMessageTimestamp ? (
                    <Avatar className="mt-0.5 size-8 shrink-0 self-end">
                      <AvatarImage
                        src={avatarSrcSelf}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="text-[10px]">
                        {messageAvatarFallbackLabel(msg)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    messageAvatarSpacer()
                  );
                  return (
                    <div
                      key={msg.id}
                      className="flex w-full justify-end"
                    >
                      <div className="flex max-w-full items-end gap-2">
                        {bubbleSelf}
                        {avatarSelf}
                      </div>
                    </div>
                  );
                }

                if (isSystem) {
                  const accountDelivery = parseAccountDeliveryContent(msg.content);
                  if (accountDelivery) {
                    return (
                      <div
                        key={msg.id}
                        className="my-1 flex flex-col items-center justify-center px-2"
                      >
                        <TicketAccountDeliveryBlock
                          data={accountDelivery}
                          t={t}
                        />
                        {showMessageTimestamp && (
                          <span className="mt-1 text-[10px] text-muted-foreground/60">
                            {formatTicketMessageTimestamp(msg.created_at)}
                          </span>
                        )}
                      </div>
                    );
                  }

                  const cheatDelivery = parseCheatDeliveryContent(msg.content);
                  if (cheatDelivery) {
                    return (
                      <div
                        key={msg.id}
                        className="my-1 flex flex-col items-center justify-center px-2"
                      >
                        <TicketCheatDeliveryBlock data={cheatDelivery} t={t} />
                        {showMessageTimestamp && (
                          <span className="mt-1 text-[10px] text-muted-foreground/60">
                            {formatTicketMessageTimestamp(msg.created_at)}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (msg.content.trim() === LANGUAGE_PICKER_MARKER) {
                    const resolved = isLanguagePickerResolved(msg, messages);
                    const isTicketOwner =
                      String(order.user_id ?? "").trim() ===
                        String(viewerDiscordId ?? "").trim() ||
                      (viewerDiscordId == null && !isAdminOrPartner);
                    return (
                      <div key={msg.id} className="my-1 flex justify-center px-2">
                        <div className="w-full max-w-[min(100%,22rem)] rounded-xl border border-border/50 bg-muted/90 px-[1.125rem] py-3 text-left text-xs shadow-sm">
                          <TicketChatLanguagePicker
                            orderId={orderId}
                            resolved={resolved}
                            isTicketOwner={isTicketOwner}
                            canInteract={canSend && !isSending}
                            onConfirm={sendClientLanguageChoice}
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className="my-1 flex flex-col items-center justify-center px-2"
                    >
                      <div className="max-w-[min(100%,22rem)] rounded-xl border border-border/50 bg-muted/90 px-[1.125rem] py-2.5 text-left text-xs shadow-sm">
                        <ForumMarkdown
                          source={processSystemContent(msg.content, t)}
                          compact
                          muted
                          className="break-words [&_a]:break-all [&_code]:break-all [&_pre]:max-w-full"
                        />
                      </div>
                      {showMessageTimestamp && (
                        <span className="mt-1 text-[10px] text-muted-foreground/60">
                          {formatTicketMessageTimestamp(msg.created_at)}
                        </span>
                      )}
                    </div>
                  );
                }

                const avatarSrc = messageAvatarSrc(msg, {
                  isOwn,
                  viewerAvatarUrl,
                });

                const bubbleBlock = (
                  <div
                    className={`flex min-w-0 flex-col ${
                      isOwn ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`min-w-0 max-w-[min(100%,24rem)] overflow-hidden rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                        isOwn
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted"
                      }`}
                    >
                      <ForumMarkdown
                        source={
                          resolveOrderReceivedContent(msg.content, t) ??
                          msg.content
                        }
                        compact
                        inverted={isOwn}
                        className="break-words [&_a]:break-all [&_code]:break-all [&_pre]:max-w-full"
                      />
                    </div>
                    {showMessageTimestamp && (
                      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground/60">
                        {formatTicketMessageTimestamp(msg.created_at)}
                      </span>
                    )}
                  </div>
                );

                const avatarEl = showMessageTimestamp ? (
                  <Avatar className="mt-0.5 size-8 shrink-0 self-end">
                    <AvatarImage
                      src={avatarSrc}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="text-[10px]">
                      {messageAvatarFallbackLabel(msg)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  messageAvatarSpacer()
                );

                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-full items-end gap-2">
                      {isOwn ? (
                        <>
                          {bubbleBlock}
                          {avatarEl}
                        </>
                      ) : (
                        <>
                          {avatarEl}
                          {bubbleBlock}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-border/60">
            <div className="flex flex-col gap-2 px-3 py-3">
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2"
              >
                <Input
                  key={composerRemountKey}
                  autoFocus={composerRemountKey > 0}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    canSend
                      ? t("tickets.typeMessage")
                      : t("tickets.ticketArchivedCannotSend")
                  }
                  disabled={!canSend || isSending}
                  className="min-w-0 flex-1 bg-background/80"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon-lg"
                  className="shrink-0"
                  disabled={!canSend || isSending || !newMessage.trim()}
                >
                  {isSending ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4" />
                  )}
                </Button>
                {isAdminOrPartner ? (
                  <Select
                    key={`special-msg-${orderId}`}
                    value={specialKind}
                    onValueChange={(v) =>
                      setSpecialKind(v as SpecialMessageKindOrNone)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "h-10 shrink-0 gap-2 bg-background/90 px-3 text-xs",
                        specialKind === "none"
                          ? "w-auto min-w-11 justify-center"
                          : "w-[min(11.5rem,42vw)] min-w-0 text-left",
                      )}
                      aria-label={t("tickets.specialMessageTypeLabel")}
                    >
                      {specialKind === "none" ? (
                        <>
                          <span className="sr-only">
                            <SelectValue />
                          </span>
                          <HugeiconsIcon
                            icon={MessageProgrammingIcon}
                            strokeWidth={2}
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        </>
                      ) : (
                        <SelectValue
                          placeholder={t("tickets.message.special.placeholder")}
                        />
                      )}
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="top"
                      sideOffset={8}
                      className="max-h-[min(50vh,320px)] px-2 py-2 sm:px-3"
                    >
                      <SelectItem value="none" className="text-muted-foreground">
                        {t("tickets.specialMessageTypeNone")}
                      </SelectItem>
                      <SelectItem value="language">
                        {t("tickets.specialMessageType.language")}
                      </SelectItem>
                      <SelectItem value="account">
                        {t("tickets.specialMessageType.account")}
                      </SelectItem>
                      <SelectItem value="cheat">
                        {t("tickets.specialMessageType.cheat")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
              </form>
            </div>
          </div>
        </Card>
        </div>
      </div>

      {/* Info panel */}
      <div className="lg:col-span-5">
        <TicketInfoPanel order={order} imageUrl={imageUrl} />
      </div>
    </div>

    {isAdminOrPartner ? (
      <Dialog
        open={showSpecialPanel}
        onOpenChange={(open) => {
          if (!open) closeSpecialPanel();
        }}
      >
        <DialogContent
          className="dark gap-4 sm:max-w-md"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{t("tickets.message.special.panelTitle")}</DialogTitle>
          </DialogHeader>

          {specialKind === "language" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("tickets.languagePickerDialogInfo")}
              </p>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={isSending || !canSend}
                onClick={() => void sendSpecialLanguagePickerMessage()}
              >
                {t("tickets.specialMessageSend")}
              </Button>
            </div>
          )}

          {specialKind === "account" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("tickets.specialMessageAccountHint")}
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={`ticket-acc-id-${orderId}`}
                    className="text-xs font-semibold leading-none"
                  >
                    {t("tickets.accountDelivery.identifier")}
                  </Label>
                  <Input
                    id={`ticket-acc-id-${orderId}`}
                    value={accountIdentifierDraft}
                    onChange={(e) => setAccountIdentifierDraft(e.target.value)}
                    autoComplete="off"
                    placeholder={t("tickets.accountDelivery.identifierPlaceholder")}
                    className="bg-background/80 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={`ticket-acc-pw-${orderId}`}
                    className="text-xs font-semibold leading-none"
                  >
                    {t("tickets.accountDelivery.password")}
                  </Label>
                  <Input
                    id={`ticket-acc-pw-${orderId}`}
                    type="password"
                    value={accountPasswordDraft}
                    onChange={(e) => setAccountPasswordDraft(e.target.value)}
                    autoComplete="new-password"
                    placeholder={t("tickets.accountDelivery.passwordPlaceholder")}
                    className="bg-background/80 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={`ticket-acc-em-${orderId}`}
                    className="text-xs font-semibold leading-none"
                  >
                    {t("tickets.accountDelivery.email")}
                  </Label>
                  <Input
                    id={`ticket-acc-em-${orderId}`}
                    type="email"
                    value={accountEmailDraft}
                    onChange={(e) => setAccountEmailDraft(e.target.value)}
                    autoComplete="email"
                    placeholder={t("tickets.accountDelivery.emailPlaceholder")}
                    className="bg-background/80 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={
                  isSending ||
                  !canSend ||
                  !accountPasswordDraft.trim() ||
                  !accountEmailDraft.trim()
                }
                onClick={() => void sendSpecialAccountSystem()}
              >
                {t("tickets.specialMessageSend")}
              </Button>
            </div>
          )}

          {specialKind === "cheat" && (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("tickets.specialMessageCheatHint")}
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={`ticket-cht-dl-${orderId}`}
                    className="text-xs font-semibold leading-none"
                  >
                    {t("tickets.cheatDelivery.downloadUrl")}
                  </Label>
                  <Input
                    id={`ticket-cht-dl-${orderId}`}
                    type="url"
                    inputMode="url"
                    value={cheatDownloadDraft}
                    onChange={(e) => setCheatDownloadDraft(e.target.value)}
                    autoComplete="off"
                    placeholder={t("tickets.cheatDelivery.downloadPlaceholder")}
                    className="bg-background/80 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={`ticket-cht-sp-${orderId}`}
                    className="text-xs font-semibold leading-none"
                  >
                    {t("tickets.cheatDelivery.spooferUrl")}
                  </Label>
                  <Input
                    id={`ticket-cht-sp-${orderId}`}
                    type="url"
                    inputMode="url"
                    value={cheatSpooferDraft}
                    onChange={(e) => setCheatSpooferDraft(e.target.value)}
                    autoComplete="off"
                    placeholder={t("tickets.cheatDelivery.spooferPlaceholder")}
                    className="bg-background/80 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor={`ticket-cht-notes-${orderId}`}
                    className="text-xs font-semibold leading-none"
                  >
                    {t("tickets.cheatDelivery.notes")}
                  </Label>
                  <Textarea
                    id={`ticket-cht-notes-${orderId}`}
                    value={cheatNotesDraft}
                    onChange={(e) => setCheatNotesDraft(e.target.value)}
                    rows={4}
                    placeholder={t("tickets.cheatDelivery.notesPlaceholder")}
                    className="resize-none bg-background/80 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={
                  isSending || !canSend || !cheatDownloadDraft.trim()
                }
                onClick={() => void sendSpecialCheatSystem()}
              >
                {t("tickets.specialMessageSend")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    ) : null}
    </>
  );
}
