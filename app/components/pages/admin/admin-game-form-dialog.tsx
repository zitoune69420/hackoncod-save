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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { AdminGameRow } from "./admin-games-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: AdminGameRow | null;
  onSaved: () => void;
};

export function AdminGameFormDialog({
  open,
  onOpenChange,
  editingRow,
  onSaved,
}: Props) {
  const { t } = useTranslations();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");
  const [steam, setSteam] = React.useState("");
  const [link, setLink] = React.useState("");
  const [client, setClient] = React.useState("");
  const [displayed, setDisplayed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setTitle(editingRow.title);
      setDescription(editingRow.description);
      setImage(editingRow.image);
      setSteam(editingRow.steam);
      setLink(editingRow.link);
      setClient(editingRow.client);
      setDisplayed(editingRow.displayed);
    } else {
      setTitle("");
      setDescription("");
      setImage("");
      setSteam("");
      setLink("");
      setClient("");
      setDisplayed(true);
    }
  }, [open, editingRow]);

  const isEdit = Boolean(editingRow);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast({
        text: t("dashboard.admin.allGames.dialog.validationTitle"),
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
        steam: steam.trim() || null,
        link: link.trim() || null,
        client: client.trim() || null,
        displayed,
      };

      const url = isEdit
        ? `/api/admin/games/${editingRow!.id}`
        : "/api/admin/games";
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
              : t("dashboard.admin.allGames.dialog.errorSave"),
          variant: "error",
        });
        return;
      }

      showToast({ text: t("dashboard.admin.allGames.dialog.success"), variant: "success" });
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
              ? t("dashboard.admin.allGames.dialog.editTitle")
              : t("dashboard.admin.allGames.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.admin.allGames.dialog.description")}
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
            <Label htmlFor="game-title">{t("dashboard.admin.allGames.dialog.title")}</Label>
            <Input
              id="game-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-9 min-h-9"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="game-description">
              {t("dashboard.admin.allGames.dialog.descriptionField")}
            </Label>
            <Textarea
              id="game-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="min-h-20"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="game-image">{t("dashboard.admin.allGames.dialog.image")}</Label>
              <Input
                id="game-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="game-steam">{t("dashboard.admin.allGames.dialog.steam")}</Label>
              <Input
                id="game-steam"
                value={steam}
                onChange={(e) => setSteam(e.target.value)}
                placeholder="https://…"
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="game-link">{t("dashboard.admin.allGames.dialog.link")}</Label>
              <Input
                id="game-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="game-client">{t("dashboard.admin.allGames.dialog.client")}</Label>
              <Input
                id="game-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="https://…"
                className="h-9 min-h-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-input bg-muted/30 p-3">
            <Label htmlFor="game-displayed" className="cursor-pointer font-normal">
              {t("dashboard.admin.allGames.dialog.displayed")}
            </Label>
            <Switch
              id="game-displayed"
              checked={displayed}
              onCheckedChange={setDisplayed}
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
              {saving
                ? t("common.loading")
                : isEdit
                  ? t("dashboard.admin.allGames.dialog.save")
                  : t("dashboard.admin.allGames.dialog.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
