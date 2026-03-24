"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { hasPermissions } from "@/lib/permissions";
import { useUserRole } from "@/hooks/use-user-role";
import { showToast } from "@/components/commons/toasts";
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
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MailSend01Icon,
  Add01Icon,
  Cancel01Icon,
  Diamond02Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmbedField = {
  name: string;
  value: string;
  inline: boolean;
};

type DiscordEmbed = {
  title: string;
  description: string;
  color: string;
  footer: string;
  thumbnail: string;
  image: string;
  author: { name: string; icon_url: string };
  fields: EmbedField[];
};

type MessageHistory = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  status: "success" | "error";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = "partners-message-history";

const EMPTY_EMBED: DiscordEmbed = {
  title: "",
  description: "",
  color: "#5865F2",
  footer: "",
  thumbnail: "",
  image: "",
  author: { name: "", icon_url: "" },
  fields: [],
};

const PARTNERS = [
  { value: "infarcted", label: "Infarcted" },
  { value: "amibot", label: "Amibot" },
  { value: "guysmodz", label: "Guyzmods" },
  { value: "nolove", label: "nolove" },
] as const;

// ─── URL validator ────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// ─── Discord embed live preview ───────────────────────────────────────────────

function EmbedPreview({
  embed,
  mentionEveryone,
}: {
  embed: DiscordEmbed;
  mentionEveryone: boolean;
}) {
  const hasContent =
    embed.title ||
    embed.description ||
    embed.footer ||
    embed.thumbnail ||
    embed.image ||
    embed.author.name ||
    embed.fields.some((f) => f.name && f.value);

  return (
    <div className="min-h-24 rounded-md border bg-muted/30">
      {!hasContent ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          —
        </div>
      ) : (
        <div className="p-4">
          {mentionEveryone && (
            <p className="mb-2 text-sm font-medium text-blue-500">@everyone</p>
          )}
          <div
            className="rounded-md border-l-4 bg-neutral-50 p-4 dark:bg-neutral-900"
            style={{ borderColor: embed.color }}
          >
            {/* Thumbnail */}
            {embed.thumbnail && isValidUrl(embed.thumbnail) && (
              <div className="relative float-right ml-4 mb-2 size-20 shrink-0 overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={embed.thumbnail}
                  alt="thumbnail"
                  className="size-full object-cover"
                />
              </div>
            )}

            {/* Author */}
            {embed.author.name && (
              <div className="mb-2 flex items-center gap-2">
                {embed.author.icon_url && isValidUrl(embed.author.icon_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={embed.author.icon_url}
                    alt="author"
                    className="size-5 rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium">{embed.author.name}</span>
              </div>
            )}

            {/* Title */}
            {embed.title && <p className="mb-1 font-semibold">{embed.title}</p>}

            {/* Description */}
            {embed.description && (
              <p className="mb-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {embed.description}
              </p>
            )}

            {/* Fields */}
            {embed.fields.filter((f) => f.name && f.value).length > 0 && (
              <div className="mb-2 grid gap-2">
                {embed.fields
                  .filter((f) => f.name && f.value)
                  .map((field, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{field.name}</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {field.value}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* Image */}
            {embed.image && isValidUrl(embed.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={embed.image}
                alt="embed"
                className="mt-2 max-w-full rounded"
              />
            )}

            {/* Footer */}
            {embed.footer && (
              <p className="mt-2 text-xs text-muted-foreground">
                {embed.footer}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History list ─────────────────────────────────────────────────────────────

function HistoryList({ history }: { history: MessageHistory[] }) {
  const { t } = useTranslations();

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("partners.noMessages")}
      </p>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {history.map((msg) => (
        <div key={msg.id} className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium">{msg.title}</p>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  msg.status === "success"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {msg.status === "success" ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="size-3"
                    strokeWidth={2}
                  />
                ) : (
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    className="size-3"
                    strokeWidth={2}
                  />
                )}
                {msg.status === "success"
                  ? t("partners.sent")
                  : t("partners.error")}
              </span>
              <span className="text-xs text-muted-foreground">
                {msg.timestamp.toLocaleString()}
              </span>
            </div>
          </div>
          {msg.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {msg.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PartnersPage() {
  const { t } = useTranslations();
  const { isAuthenticated, isLoading, role } = useUserRole();
  const canAccess = hasPermissions(role, ["partner"]);

  const [embed, setEmbed] = useState<DiscordEmbed>(EMPTY_EMBED);
  const [mentionEveryone, setMentionEveryone] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>("infarcted");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<MessageHistory[]>([]);

  // Hydrate history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = (JSON.parse(raw) as MessageHistory[]).map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setHistory(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Persist history
  const historyRef = useRef(history);
  historyRef.current = history;

  const pushHistory = useCallback(
    (entry: Omit<MessageHistory, "id" | "timestamp">) => {
      const next: MessageHistory = {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      setHistory((prev) => {
        const updated = [next, ...prev].slice(0, 50);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch {
          /* quota */
        }
        return updated;
      });
    },
    [],
  );

  // ── Embed field helpers ──────────────────────────────────────────────────────

  const updateEmbed = useCallback(
    <K extends keyof DiscordEmbed>(key: K, value: DiscordEmbed[K]) =>
      setEmbed((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const updateAuthor = useCallback(
    (key: keyof DiscordEmbed["author"], value: string) =>
      setEmbed((prev) => ({
        ...prev,
        author: { ...prev.author, [key]: value },
      })),
    [],
  );

  const addField = useCallback(() => {
    setEmbed((prev) => ({
      ...prev,
      fields: [...prev.fields, { name: "", value: "", inline: false }],
    }));
  }, []);

  const updateField = useCallback(
    (index: number, key: keyof EmbedField, value: string | boolean) => {
      setEmbed((prev) => ({
        ...prev,
        fields: prev.fields.map((f, i) =>
          i === index ? { ...f, [key]: value } : f,
        ),
      }));
    },
    [],
  );

  const removeField = useCallback((index: number) => {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!embed.title && !embed.description) {
      showToast({
        text: t("partners.toasts.titleOrDescriptionRequired"),
        variant: "error",
      });
      return;
    }
    if (embed.thumbnail && !isValidUrl(embed.thumbnail)) {
      showToast({
        text: t("partners.toasts.invalidThumbnailUrl"),
        variant: "error",
      });
      return;
    }
    if (embed.image && !isValidUrl(embed.image)) {
      showToast({
        text: t("partners.toasts.invalidImageUrl"),
        variant: "error",
      });
      return;
    }
    if (embed.author.icon_url && !isValidUrl(embed.author.icon_url)) {
      showToast({
        text: t("partners.toasts.invalidAvatarUrl"),
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/partners/send-embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner: selectedPartner,
          mentionEveryone,
          embed,
        }),
      });

      const historyEntry = {
        title: embed.title || t("partners.messageWithoutTitle"),
        description:
          embed.description || t("partners.messageWithoutDescription"),
      };

      if (res.ok) {
        showToast({
          text: t("partners.toasts.messageSent"),
          variant: "success",
        });
        pushHistory({ ...historyEntry, status: "success" });
        setEmbed(EMPTY_EMBED);
        setMentionEveryone(false);
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = err.error ?? t("partners.toasts.errorSending");
        showToast({
          text: t("partners.toasts.errorSendingWithMessage").replace(
            "{{message}}",
            msg,
          ),
          variant: "error",
        });
        pushHistory({ ...historyEntry, status: "error" });
      }
    } catch {
      showToast({ text: t("partners.toasts.errorSending"), variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [embed, mentionEveryone, selectedPartner, t, pushHistory]);

  // ── Auth gate ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("partners.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("partners.description")}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center space-y-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon
              icon={Diamond02Icon}
              className="size-8 text-primary"
              strokeWidth={2}
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              {t("partners.accessDenied")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("partners.accessDeniedDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t("partners.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("partners.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: form ───────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-1">
          <SectionTitle>{t("partners.createMessage")}</SectionTitle>

          {/* Partner selector */}
          <FormRow label={t("partners.partner")} htmlFor="partner">
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger id="partner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTNERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <Separator />

          {/* Title */}
          <FormRow label={t("partners.titleLabel")} htmlFor="embed-title">
            <Input
              id="embed-title"
              placeholder={t("partners.titlePlaceholder")}
              value={embed.title}
              onChange={(e) => updateEmbed("title", e.target.value)}
            />
          </FormRow>

          {/* Description */}
          <FormRow label={t("partners.descriptionLabel")} htmlFor="embed-desc">
            <Textarea
              id="embed-desc"
              placeholder={t("partners.descriptionPlaceholder")}
              value={embed.description}
              onChange={(e) => updateEmbed("description", e.target.value)}
              rows={4}
            />
          </FormRow>

          {/* Color */}
          <FormRow label={t("partners.colorLabel")} htmlFor="embed-color">
            <div className="flex items-center gap-2">
              <input
                id="embed-color"
                type="color"
                value={embed.color}
                onChange={(e) => updateEmbed("color", e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <span className="text-sm text-muted-foreground font-mono">
                {embed.color}
              </span>
            </div>
          </FormRow>

          {/* Mention @everyone */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={mentionEveryone}
              onChange={(e) => setMentionEveryone(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">{t("partners.mentionEveryone")}</span>
          </label>

          <Separator />

          {/* Footer */}
          <FormRow label={t("partners.footerLabel")} htmlFor="embed-footer">
            <Input
              id="embed-footer"
              placeholder={t("partners.footerPlaceholder")}
              value={embed.footer}
              onChange={(e) => updateEmbed("footer", e.target.value)}
            />
          </FormRow>

          {/* Thumbnail */}
          <FormRow
            label={t("partners.thumbnailLabel")}
            htmlFor="embed-thumbnail"
          >
            <Input
              id="embed-thumbnail"
              type="url"
              placeholder={t("partners.thumbnailPlaceholder")}
              value={embed.thumbnail}
              onChange={(e) => updateEmbed("thumbnail", e.target.value)}
            />
          </FormRow>

          {/* Image */}
          <FormRow label={t("partners.imageLabel")} htmlFor="embed-image">
            <Input
              id="embed-image"
              type="url"
              placeholder={t("partners.imagePlaceholder")}
              value={embed.image}
              onChange={(e) => updateEmbed("image", e.target.value)}
            />
          </FormRow>

          <Separator />

          {/* Author */}
          <div className="space-y-1.5">
            <Label>{t("partners.authorLabel")}</Label>
            <Input
              placeholder={t("partners.authorNamePlaceholder")}
              value={embed.author.name}
              onChange={(e) => updateAuthor("name", e.target.value)}
            />
            <Input
              placeholder={t("partners.authorAvatarPlaceholder")}
              value={embed.author.icon_url}
              onChange={(e) => updateAuthor("icon_url", e.target.value)}
            />
          </div>

          <Separator />

          {/* Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("partners.fieldsLabel")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                {t("partners.addField")}
              </Button>
            </div>

            {embed.fields.map((field, index) => (
              <div key={index} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("partners.field")} {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => removeField(index)}
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      strokeWidth={2}
                      className="size-4"
                    />
                  </Button>
                </div>
                <Input
                  placeholder={t("partners.fieldNamePlaceholder")}
                  value={field.name}
                  onChange={(e) => updateField(index, "name", e.target.value)}
                />
                <Textarea
                  placeholder={t("partners.fieldValuePlaceholder")}
                  value={field.value}
                  onChange={(e) => updateField(index, "value", e.target.value)}
                  rows={2}
                />
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.inline}
                    onChange={(e) =>
                      updateField(index, "inline", e.target.checked)
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">{t("partners.inline")}</span>
                </label>
              </div>
            ))}
          </div>

          {/* Send button */}
          <Button
            onClick={() => void handleSend()}
            disabled={loading}
            className="w-full"
          >
            <HugeiconsIcon
              icon={MailSend01Icon}
              strokeWidth={2}
              className="size-4"
            />
            {loading ? t("partners.sending") : t("partners.send")}
          </Button>
        </div>

        {/* ── Right: preview + history ──────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Preview */}
          <div className="space-y-3">
            <SectionTitle>{t("partners.preview")}</SectionTitle>
            <EmbedPreview embed={embed} mentionEveryone={mentionEveryone} />
          </div>

          <Separator />

          {/* History */}
          <div className="space-y-3">
            <SectionTitle>{t("partners.historyTitle")}</SectionTitle>
            <HistoryList history={history} />
          </div>
        </div>
      </div>
    </div>
  );
}
