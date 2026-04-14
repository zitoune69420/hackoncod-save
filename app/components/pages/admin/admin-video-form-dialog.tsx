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
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { AdminVideoRow } from "./admin-videos-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: AdminVideoRow | null;
  onSaved: () => void;
};

export function AdminVideoFormDialog({
  open,
  onOpenChange,
  editingRow,
  onSaved,
}: Props) {
  const { t } = useTranslations();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");
  const [link, setLink] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setTitle(editingRow.title);
      setDescription(editingRow.description);
      setImage(editingRow.image);
      setLink(editingRow.link);
    } else {
      setTitle("");
      setDescription("");
      setImage("");
      setLink("");
    }
  }, [open, editingRow]);

  const isEdit = Boolean(editingRow);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast({
        text: t("dashboard.admin.allVideos.dialog.validationTitle"),
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim() || null,
        image: image.trim() || null,
        link: link.trim() || null,
      };

      const url = isEdit
        ? `/api/admin/videos/${editingRow!.id}`
        : "/api/admin/videos";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({
          text:
            typeof json?.error === "string"
              ? json.error
              : t("dashboard.admin.allVideos.dialog.errorSave"),
          variant: "error",
        });
        return;
      }

      showToast({
        text: t("dashboard.admin.allVideos.dialog.success"),
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
          <DialogTitle>
            {isEdit
              ? t("dashboard.admin.allVideos.dialog.editTitle")
              : t("dashboard.admin.allVideos.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.admin.allVideos.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="video-title">{t("dashboard.admin.allVideos.dialog.title")}</Label>
            <Input
              id="video-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-9 min-h-9"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-description">
              {t("dashboard.admin.allVideos.dialog.descriptionField")}
            </Label>
            <Textarea
              id="video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="min-h-20"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="video-image">{t("dashboard.admin.allVideos.dialog.image")}</Label>
              <Input
                id="video-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-link">{t("dashboard.admin.allVideos.dialog.link")}</Label>
              <Input
                id="video-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>
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
              {saving
                ? t("common.loading")
                : isEdit
                  ? t("dashboard.admin.allVideos.dialog.save")
                  : t("dashboard.admin.allVideos.dialog.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
