"use client";

import { useState } from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (orderId: string) => void;
};

export function CreateGeneralTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const { t } = useTranslations();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => setMessage("");

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      showToast({
        text: t("tickets.createTicket.validationTooShort"),
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/shop/tickets/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        orderId?: string;
        code?: string;
        error?: string;
      };

      if (!res.ok) {
        if (json.code === "too_short") {
          showToast({
            text: t("tickets.createTicket.validationTooShort"),
            variant: "warning",
          });
        } else if (json.code === "too_long") {
          showToast({
            text: t("tickets.createTicket.validationTooLong"),
            variant: "warning",
          });
        } else {
          showToast({
            text: t("tickets.createTicket.error"),
            variant: "error",
          });
        }
        return;
      }

      if (typeof json.orderId !== "string" || !json.orderId) {
        showToast({
          text: t("tickets.createTicket.error"),
          variant: "error",
        });
        return;
      }

      showToast({ text: t("tickets.createTicket.success"), variant: "success" });
      reset();
      handleOpenChange(false);
      onCreated(json.orderId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" showCloseButton>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("tickets.createTicket.title")}</DialogTitle>
            <DialogDescription>
              {t("tickets.createTicket.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="general-ticket-message">
              {t("tickets.createTicket.messageLabel")}
            </Label>
            <Textarea
              id="general-ticket-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("tickets.createTicket.placeholder")}
              className="min-h-[140px] resize-y"
              maxLength={8000}
              disabled={submitting}
              required
            />
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              {t("tickets.createTicket.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t("tickets.createTicket.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
