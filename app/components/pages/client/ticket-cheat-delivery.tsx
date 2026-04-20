"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/components/commons/toasts";
import { ForumMarkdown } from "@/app/components/pages/client/forum-markdown";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";

export const CHEAT_DELIVERY_MARKER = "[CHEAT_DELIVERY_V1]";

export type TicketCheatDeliveryData = {
  downloadUrl: string;
  spooferUrl?: string;
  notes?: string;
};

export function buildCheatDeliveryPayload(input: {
  downloadUrl: string;
  spooferUrl: string;
  notes: string;
}): string {
  const downloadUrl = input.downloadUrl.trim();
  const spooferUrl = input.spooferUrl.trim();
  const notes = input.notes.trim();
  const payload: Record<string, string> = { downloadUrl };
  if (spooferUrl) payload.spooferUrl = spooferUrl;
  if (notes) payload.notes = notes;
  return `${CHEAT_DELIVERY_MARKER}\n${JSON.stringify(payload)}`;
}

export function parseCheatDeliveryContent(
  content: string,
): TicketCheatDeliveryData | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith(CHEAT_DELIVERY_MARKER)) return null;
  const jsonPart = trimmed.slice(CHEAT_DELIVERY_MARKER.length).trim();
  try {
    const o = JSON.parse(jsonPart) as Record<string, unknown>;
    const downloadUrl =
      typeof o.downloadUrl === "string" ? o.downloadUrl.trim() : "";
    if (!downloadUrl) return null;
    const spRaw = typeof o.spooferUrl === "string" ? o.spooferUrl.trim() : "";
    const notesRaw = typeof o.notes === "string" ? o.notes.trim() : "";
    return {
      downloadUrl,
      spooferUrl: spRaw || undefined,
      notes: notesRaw || undefined,
    };
  } catch {
    return null;
  }
}

function LinkCopyRow({
  label,
  value,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      showToast({ text: copiedLabel, variant: "success" });
    } catch {
      showToast({ text: copyFailedLabel, variant: "error" });
    }
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-[10px] font-medium leading-none text-muted-foreground">
          {label}
        </Label>
        <Input
          readOnly
          value={value}
          className="h-9 bg-background/60 font-mono text-xs"
          aria-label={label}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        title={copyLabel}
        aria-label={`${copyLabel} — ${label}`}
        onClick={() => void handleCopy()}
      >
        <HugeiconsIcon
          icon={Download01Icon}
          className="size-3.5"
          strokeWidth={2}
          aria-hidden
        />
      </Button>
    </div>
  );
}

export function TicketCheatDeliveryBlock({
  data,
  t,
}: {
  data: TicketCheatDeliveryData;
  t: (key: string) => string;
}) {
  return (
    <div className="w-full max-w-[min(100%,22rem)] space-y-3 rounded-xl border border-border/50 bg-muted/90 px-[1.125rem] py-4 text-left shadow-sm">
      <p className="text-[11px] font-semibold leading-tight text-foreground">
        {t("tickets.cheatDelivery.title")}
      </p>
      <LinkCopyRow
        label={t("tickets.cheatDelivery.downloadUrl")}
        value={data.downloadUrl}
        copyLabel={t("tickets.cheatDelivery.copy")}
        copiedLabel={t("tickets.cheatDelivery.copied")}
        copyFailedLabel={t("tickets.cheatDelivery.copyFailed")}
      />
      {data.spooferUrl ? (
        <LinkCopyRow
          label={t("tickets.cheatDelivery.spooferUrl")}
          value={data.spooferUrl}
          copyLabel={t("tickets.cheatDelivery.copy")}
          copiedLabel={t("tickets.cheatDelivery.copied")}
          copyFailedLabel={t("tickets.cheatDelivery.copyFailed")}
        />
      ) : null}
      {data.notes ? (
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] font-medium leading-none text-muted-foreground">
            {t("tickets.cheatDelivery.notes")}
          </Label>
          <div className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2 text-xs leading-relaxed">
            <ForumMarkdown
              source={data.notes}
              compact
              muted
              className="break-words [&_a]:break-all [&_code]:break-all [&_pre]:max-w-full"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
