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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { ShopReview } from "@/lib/supabase/shop-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: ShopReview | null;
  onSaved: () => void;
};

const NOTE_VALUES = [5, 4, 3, 2, 1] as const;

export function AdminShopReviewFormDialog({
  open,
  onOpenChange,
  editingRow,
  onSaved,
}: Props) {
  const { t } = useTranslations();

  const [comment, setComment] = React.useState("");
  const [rating, setRating] = React.useState<string>("5");
  const [visible, setVisible] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !editingRow) return;
    setComment(editingRow.comment ?? "");
    setRating(String(editingRow.rating));
    setVisible(editingRow.is_visible);
  }, [open, editingRow]);

  const handleSubmit = async () => {
    if (!editingRow) return;

    const trimmed = comment.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
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

    const noteNum = Number.parseInt(rating, 10);
    if (!Number.isInteger(noteNum) || noteNum < 1 || noteNum > 5) {
      showToast({
        text: t("dashboard.admin.allReviews.dialog.validationNote"),
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/reviews/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: trimmed === "" ? null : trimmed,
          rating: noteNum,
          is_visible: visible,
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
            {t("dashboard.admin.shopReviewsAdmin.dialogDescription")}
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
              <Label>{t("dashboard.admin.shopReviewsAdmin.productType")}</Label>
              <p className="text-sm text-muted-foreground">{editingRow.product_type}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shop-review-comment">
                {t("dashboard.admin.allReviews.dialog.messageLabel")}
              </Label>
              <Textarea
                id="shop-review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
                className="min-h-28"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shop-review-rating">
                {t("dashboard.admin.allReviews.dialog.noteLabel")}
              </Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger id="shop-review-rating" className="w-full" size="default">
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

            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <Label htmlFor="shop-review-visible" className="cursor-pointer">
                {t("dashboard.admin.shopReviewsAdmin.visibleLabel")}
              </Label>
              <Switch
                id="shop-review-visible"
                checked={visible}
                onCheckedChange={setVisible}
              />
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
