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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { AdminBlacklistRow } from "./admin-blacklist-types";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

type BanMode = "discord" | "ip";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: AdminBlacklistRow | null;
  onSaved: () => void;
  /** Onglet ouvert à la création (ignoré en édition). */
  defaultCreateMode?: BanMode;
};

export function AdminBlacklistFormDialog({
  open,
  onOpenChange,
  editingRow,
  onSaved,
  defaultCreateMode = "discord",
}: Props) {
  const { t } = useTranslations();

  const [banMode, setBanMode] = React.useState<BanMode>("discord");
  const [userId, setUserId] = React.useState("");
  const [banIp, setBanIp] = React.useState("");
  const [ipOptionalDiscord, setIpOptionalDiscord] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setUserId(editingRow.user_id ?? "");
      setReason(editingRow.reason ?? "");
      setBanIp("");
      setIpOptionalDiscord("");
      setBanMode("discord");
    } else {
      setUserId("");
      setBanIp("");
      setIpOptionalDiscord("");
      setReason("");
      setBanMode(defaultCreateMode);
    }
  }, [open, editingRow, defaultCreateMode]);

  const persistedDbId = editingRow?.db_row_id?.trim() ?? "";
  const isPersistedInDb = Boolean(persistedDbId);
  const isCreate = !editingRow;

  const handleSubmit = async () => {
    if (editingRow) {
      const trimmedUser = userId.trim();
      if (!DISCORD_SNOWFLAKE_RE.test(trimmedUser)) {
        showToast({
          text: t(
            "dashboard.admin.allBlacklist.dialog.validationUserIdSnowflake",
          ),
          variant: "error",
        });
        return;
      }

      setSaving(true);
      try {
        const payload = {
          user_id: trimmedUser,
          reason: reason.trim() || null,
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
      return;
    }

    /* Création */
    if (banMode === "ip") {
      const ip = banIp.trim();
      if (!ip) {
        showToast({
          text: t("dashboard.admin.allBlacklist.dialog.validationIpRequired"),
          variant: "error",
        });
        return;
      }
      const optD = ipOptionalDiscord.trim();
      if (optD && !DISCORD_SNOWFLAKE_RE.test(optD)) {
        showToast({
          text: t(
            "dashboard.admin.allBlacklist.dialog.validationOptionalDiscord",
          ),
          variant: "error",
        });
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/admin/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "ip",
            ip,
            ...(optD ? { discord_user_id: optD } : {}),
            reason: reason.trim() || null,
          }),
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
          text: optD
            ? t("dashboard.admin.allBlacklist.dialog.successIpDiscord")
            : t("dashboard.admin.allBlacklist.dialog.successIp"),
          variant: "success",
        });
        onSaved();
        onOpenChange(false);
      } finally {
        setSaving(false);
      }
      return;
    }

    const trimmedUser = userId.trim();
    if (!DISCORD_SNOWFLAKE_RE.test(trimmedUser)) {
      showToast({
        text: t(
          "dashboard.admin.allBlacklist.dialog.validationUserIdSnowflake",
        ),
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: trimmedUser,
          reason: reason.trim() || null,
        }),
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
            {editingRow
              ? t("dashboard.admin.allBlacklist.dialog.description")
              : t("dashboard.admin.allBlacklist.dialog.descriptionCreate")}
          </DialogDescription>
        </DialogHeader>

        {isCreate ? (
          <Tabs
            value={banMode}
            onValueChange={(v) => setBanMode(v as BanMode)}
            className="w-full gap-3"
          >
            <TabsList className="h-9 justify-start">
              <TabsTrigger value="discord" className="flex-1 sm:flex-none">
                {t("dashboard.admin.allBlacklist.dialog.tabDiscord")}
              </TabsTrigger>
              <TabsTrigger value="ip" className="flex-1 sm:flex-none">
                {t("dashboard.admin.allBlacklist.dialog.tabIp")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="discord" className="mt-0 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bl-user-id">
                  {t("dashboard.admin.allBlacklist.dialog.userId")}
                </Label>
                <Input
                  id="bl-user-id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bl-reason-discord">
                  {t("dashboard.admin.allBlacklist.dialog.reason")}
                </Label>
                <Textarea
                  id="bl-reason-discord"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </div>
            </TabsContent>
            <TabsContent value="ip" className="mt-0 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bl-ip">
                  {t("dashboard.admin.allBlacklist.dialog.ipLabel")}
                </Label>
                <Input
                  id="bl-ip"
                  value={banIp}
                  onChange={(e) => setBanIp(e.target.value)}
                  autoComplete="off"
                  placeholder={t(
                    "dashboard.admin.allBlacklist.dialog.ipPlaceholder",
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bl-ip-discord">
                  {t("dashboard.admin.allBlacklist.dialog.ipOptionalDiscord")}
                </Label>
                <Input
                  id="bl-ip-discord"
                  value={ipOptionalDiscord}
                  onChange={(e) => setIpOptionalDiscord(e.target.value)}
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder={t(
                    "dashboard.admin.allBlacklist.dialog.ipOptionalDiscordPlaceholder",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.admin.allBlacklist.dialog.ipOptionalDiscordHint")}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bl-reason-ip">
                  {t("dashboard.admin.allBlacklist.dialog.reason")}
                </Label>
                <Textarea
                  id="bl-reason-ip"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="bl-user-id-edit">
                {t("dashboard.admin.allBlacklist.dialog.userId")}
              </Label>
              <Input
                id="bl-user-id-edit"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="off"
                inputMode="numeric"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bl-reason-edit">
                {t("dashboard.admin.allBlacklist.dialog.reason")}
              </Label>
              <Textarea
                id="bl-reason-edit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>
          </div>
        )}

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
