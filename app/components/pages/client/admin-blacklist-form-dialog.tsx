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
import type { AdminBlacklistRow } from "./admin-blacklist-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: AdminBlacklistRow | null;
  onSaved: () => void;
};

export function AdminBlacklistFormDialog({
  open,
  onOpenChange,
  editingRow,
  onSaved,
}: Props) {
  const { t } = useTranslations();

  const [userId, setUserId] = React.useState("");
  const [discord, setDiscord] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [addedBy, setAddedBy] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setUserId(editingRow.user_id);
      setDiscord(
        editingRow.discord.trim()
          ? editingRow.discord
          : editingRow.discord_display,
      );
      setReason(editingRow.reason);
      setAddedBy(editingRow.added_by);
    } else {
      setUserId("");
      setDiscord("");
      setReason("");
      setAddedBy("");
    }
  }, [open, editingRow]);

  const persistedDbId = editingRow?.db_row_id?.trim() ?? "";
  const isPersistedInDb = Boolean(persistedDbId);

  const handleSubmit = async () => {
    const trimmedUser = userId.trim();
    const trimmedDiscord = discord.trim();
    if (!trimmedUser && !trimmedDiscord) {
      showToast({
        text: t("dashboard.admin.allBlacklist.dialog.validationIdentifier"),
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: trimmedUser || null,
        discord: trimmedDiscord || null,
        reason: reason.trim() || null,
        added_by: addedBy.trim() || null,
      };

      const url = isPersistedInDb
        ? `/api/admin/blacklist/${persistedDbId}`
        : "/api/admin/blacklist";
      const method = isPersistedInDb ? "PATCH" : "POST";

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
              : t("dashboard.admin.allBlacklist.dialog.errorSave"),
          variant: "error",
        });
        return;
      }

      showToast({
        text: t("dashboard.admin.allBlacklist.dialog.success"),
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
            {editingRow
              ? isPersistedInDb
                ? t("dashboard.admin.allBlacklist.dialog.editTitle")
                : t("dashboard.admin.allBlacklist.dialog.saveToDbTitle")
              : t("dashboard.admin.allBlacklist.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.admin.allBlacklist.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="bl-user-id">
              {t("dashboard.admin.allBlacklist.dialog.userId")}
            </Label>
            <Input
              id="bl-user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bl-discord">
              {t("dashboard.admin.allBlacklist.dialog.discord")}
            </Label>
            <Input
              id="bl-discord"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bl-reason">
              {t("dashboard.admin.allBlacklist.dialog.reason")}
            </Label>
            <Textarea
              id="bl-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-y"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bl-added-by">
              {t("dashboard.admin.allBlacklist.dialog.addedBy")}
            </Label>
            <Input
              id="bl-added-by"
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving
              ? t("common.loading")
              : editingRow
                ? isPersistedInDb
                  ? t("dashboard.admin.allBlacklist.dialog.save")
                  : t("dashboard.admin.allBlacklist.dialog.saveToDb")
                : t("dashboard.admin.allBlacklist.dialog.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
