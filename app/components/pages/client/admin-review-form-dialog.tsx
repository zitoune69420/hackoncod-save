"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { AdminReviewRow } from "./admin-reviews-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: AdminReviewRow | null;
  onSaved: () => void;
};

const NOTE_VALUES = [5, 4, 3, 2, 1] as const;

export function AdminReviewFormDialog({
  open,
  onOpenChange,
  editingRow,
  onSaved,
}: Props) {
  const { t } = useTranslations();

  const [message, setMessage] = React.useState("");
  const [note, setNote] = React.useState<string>("5");
  const [authorName, setAuthorName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !editingRow) return;
    setMessage(editingRow.message);
    setNote(String(editingRow.note));
    setAuthorName(editingRow.author_name);
  }, [open, editingRow]);

  const handleSubmit = async () => {
    if (!editingRow) return;

    const trimmed = message.trim();
    if (trimmed.length < 3) {
      showToast({
        text: t("dashboard.admin.allReviews.dialog.validationMessage"),
        variant: "error",
      });
      return;
    }
    if (trimmed.length > 4000) {
      showToast({
        text: t("dashboard.admin.allReviews.dialog.validationMessageMax"),
        variant: "error",
      });
      return;
    }

    const noteNum = Number.parseInt(note, 10);
    if (!Number.isInteger(noteNum) || noteNum < 1 || noteNum > 5) {
      showToast({
        text: t("dashboard.admin.allReviews.dialog.validationNote"),
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reviews/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          note: noteNum,
          author_name: authorName.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({
          text:
            typeof json?.error === "string"
              ? json.error
              : t("dashboard.admin.allReviews.dialog.errorSave"),
          variant: "error",
        });
        return;
      }

      showToast({
        text: t("dashboard.admin.allReviews.dialog.success"),
        variant: "success",
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{t("dashboard.admin.allReviews.dialog.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.admin.allReviews.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {editingRow ? (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="review-admin-user-id">
                {t("dashboard.admin.allReviews.dialog.userId")}
              </Label>
              <Input
                id="review-admin-user-id"
                value={editingRow.user_id}
                readOnly
                className="h-9 min-h-9 font-mono text-xs text-muted-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="review-admin-author">
                {t("dashboard.admin.allReviews.dialog.authorNameLabel")}
              </Label>
              <Input
                id="review-admin-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={t("dashboard.admin.allReviews.dialog.authorNamePlaceholder")}
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="review-admin-message">
                {t("dashboard.admin.allReviews.dialog.messageLabel")}
              </Label>
              <Textarea
                id="review-admin-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="min-h-28"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="review-admin-note">{t("dashboard.admin.allReviews.dialog.noteLabel")}</Label>
              <Select value={note} onValueChange={setNote}>
                <SelectTrigger id="review-admin-note" className="w-full" size="default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_VALUES.map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {t(`reviews.form.note${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.loading") : t("dashboard.admin.allReviews.dialog.save")}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
