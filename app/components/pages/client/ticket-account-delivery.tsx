"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/components/commons/toasts";
import { Copy } from "lucide-react";

export const ACCOUNT_DELIVERY_MARKER = "[ACCOUNT_DELIVERY_V1]";

export type TicketAccountDeliveryData = {
  identifier?: string;
  password: string;
  email: string;
};

export function buildAccountDeliveryPayload(input: {
  identifier: string;
  password: string;
  email: string;
}): string {
  const identifier = input.identifier.trim();
  const payload: Record<string, string> = {
    password: input.password.trim(),
    email: input.email.trim(),
  };
  if (identifier) payload.identifier = identifier;
  return `${ACCOUNT_DELIVERY_MARKER}\n${JSON.stringify(payload)}`;
}

export function parseAccountDeliveryContent(
  content: string,
): TicketAccountDeliveryData | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith(ACCOUNT_DELIVERY_MARKER)) return null;
  const jsonPart = trimmed.slice(ACCOUNT_DELIVERY_MARKER.length).trim();
  try {
    const o = JSON.parse(jsonPart) as Record<string, unknown>;
    const password = typeof o.password === "string" ? o.password : "";
    const email = typeof o.email === "string" ? o.email : "";
    if (!password.trim() || !email.trim()) return null;
    const idRaw = typeof o.identifier === "string" ? o.identifier.trim() : "";
    return {
      identifier: idRaw || undefined,
      password: password.trim(),
      email: email.trim(),
    };
  } catch {
    return null;
  }
}

function AccountFieldRow({
  label,
  value,
  type,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
}: {
  label: string;
  value: string;
  type: "text" | "password";
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
          type={type}
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
        <Copy className="size-3.5" strokeWidth={2} aria-hidden />
      </Button>
    </div>
  );
}

export function TicketAccountDeliveryBlock({
  data,
  t,
}: {
  data: TicketAccountDeliveryData;
  t: (key: string) => string;
}) {
  return (
    <div className="w-full max-w-[min(100%,22rem)] space-y-3 rounded-xl border border-border/50 bg-muted/90 px-[1rem] py-4 text-left shadow-sm">
      <p className="text-[11px] font-semibold leading-tight text-foreground">
        {t("tickets.accountDelivery.title")}
      </p>
      {data.identifier ? (
        <AccountFieldRow
          label={t("tickets.accountDelivery.identifier")}
          value={data.identifier}
          type="text"
          copyLabel={t("tickets.accountDelivery.copy")}
          copiedLabel={t("tickets.accountDelivery.copied")}
          copyFailedLabel={t("tickets.accountDelivery.copyFailed")}
        />
      ) : null}
      <AccountFieldRow
        label={t("tickets.accountDelivery.password")}
        value={data.password}
        type="password"
        copyLabel={t("tickets.accountDelivery.copy")}
        copiedLabel={t("tickets.accountDelivery.copied")}
        copyFailedLabel={t("tickets.accountDelivery.copyFailed")}
      />
      <AccountFieldRow
        label={t("tickets.accountDelivery.email")}
        value={data.email}
        type="text"
        copyLabel={t("tickets.accountDelivery.copy")}
        copiedLabel={t("tickets.accountDelivery.copied")}
        copyFailedLabel={t("tickets.accountDelivery.copyFailed")}
      />
    </div>
  );
}
