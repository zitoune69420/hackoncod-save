"use client";

import { useState, type FormEvent } from "react";
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
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

type UnbanResponse = {
  error?: string;
  report?: { ips: number; fingerprints: number; blacklist: number; siteBans: number };
  discordUnbanned?: boolean;
};

export function AdminUnbanDialog({
  open,
  onOpenChange,
  onUnbanned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnbanned: () => void;
}) {
  const { t } = useTranslations();
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = target.trim();
    if (!value) return;
    setSaving(true);
    try {
      const body = DISCORD_SNOWFLAKE_RE.test(value)
        ? { discordId: value }
        : { ip: value };
      const res = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as UnbanResponse;
      if (!res.ok || !json.report) {
        throw new Error(json.error ?? t("dashboard.admin.unban.error"));
      }
      const r = json.report;
      showToast({
        text: t("dashboard.admin.unban.success", {
          ips: r.ips,
          fingerprints: r.fingerprints,
          blacklist: r.blacklist,
          siteBans: r.siteBans,
          discord: json.discordUnbanned ? "✓" : "—",
        }),
        variant: "success",
      });
      setTarget("");
      onUnbanned();
      onOpenChange(false);
    } catch (err) {
      showToast({
        text: err instanceof Error ? err.message : t("dashboard.admin.unban.error"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("dashboard.admin.unban.title")}</DialogTitle>
          <DialogDescription>{t("dashboard.admin.unban.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unban-target">{t("dashboard.admin.unban.target")}</Label>
            <Input
              id="unban-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="123456789012345678 / 203.0.113.7"
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || !target.trim()}>
            {saving ? t("dashboard.admin.unban.submitting") : t("dashboard.admin.unban.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
