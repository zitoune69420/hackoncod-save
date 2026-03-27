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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { AdminCheatRow } from "./admin-cheats-types";

type GameOption = { id: string; title: string };

function clientColumnToBool(raw: string): boolean {
  const s = raw?.trim().toLowerCase();
  return s === "true" || s === "1" || (s !== "" && s !== "false" && s !== "0");
}

const MODE_OPTIONS = [
  "Zombies",
  "Multiplayer",
  "Campaign",
  "Zombies + Multiplayer",
  "All Modes",
  "Other",
] as const;

const EXTENSION_OPTIONS = ["EXE", "GSC", "DLL", "ZIP", "RAR", "Unknown"] as const;

const STATUT_OPTIONS = ["Working", "Undetected", "Detected", "Patched"] as const;

const PLATFORM_OPTIONS = ["PC", "XBOX", "PLAY"] as const;

function coerceSelectValue<T extends readonly string[]>(
  value: string,
  options: T,
  fallback: T[number],
): T[number] {
  return (options as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création */
  editingRow: AdminCheatRow | null;
  games: GameOption[];
  onSaved: () => void;
};

export function AdminCheatFormDialog({
  open,
  onOpenChange,
  editingRow,
  games,
  onSaved,
}: Props) {
  const { t } = useTranslations();

  const [gameId, setGameId] = React.useState("");
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState("");
  const [platform, setPlatform] = React.useState("");
  const [extension, setExtension] = React.useState("");
  const [hasClient, setHasClient] = React.useState(false);
  const [statut, setStatut] = React.useState("");
  const [crack, setCrack] = React.useState(false);
  const [vip, setVip] = React.useState(false);
  const [semiVip, setSemiVip] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setGameId(editingRow.game_id);
      setName(editingRow.name);
      setMode(coerceSelectValue(editingRow.mode ?? "", MODE_OPTIONS, "Other"));
      setPlatform(
        coerceSelectValue(editingRow.platform ?? "", PLATFORM_OPTIONS, "PC"),
      );
      setExtension(
        coerceSelectValue(editingRow.extension ?? "", EXTENSION_OPTIONS, "Unknown"),
      );
      setHasClient(clientColumnToBool(String(editingRow.client ?? "")));
      setStatut(
        coerceSelectValue(editingRow.statut ?? "", STATUT_OPTIONS, "Working"),
      );
      setCrack(Boolean(editingRow.crack));
      setVip(Boolean(editingRow.vip));
      setSemiVip(Boolean(editingRow.semi_vip));
    } else {
      setGameId(games[0]?.id ?? "");
      setName("");
      setMode("Other");
      setPlatform("PC");
      setExtension("Unknown");
      setHasClient(false);
      setStatut("Working");
      setCrack(false);
      setVip(false);
      setSemiVip(false);
    }
    setFile(null);
  }, [open, editingRow, games]);

  const isEdit = Boolean(editingRow);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const gid = gameId.trim();
    if (!gid || !trimmedName) {
      showToast({
        text: t("dashboard.admin.allCheats.dialog.validationGameName"),
        variant: "error",
      });
      return;
    }

    if (!isEdit && !file) {
      showToast({
        text: t("dashboard.admin.allCheats.dialog.validationFile"),
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/admin/mods/upload", {
          method: "POST",
          body: fd,
        });
        const upJson = await up.json().catch(() => ({}));
        if (!up.ok) {
          showToast({
            text:
              typeof upJson?.error === "string"
                ? upJson.error
                : t("dashboard.admin.allCheats.dialog.errorUpload"),
            variant: "error",
          });
          return;
        }
      }

      const basePayload: Record<string, unknown> = {
        game_id: gid,
        name: trimmedName,
        mode,
        platform,
        extension,
        crack,
        client: hasClient ? "true" : "false",
        /** Pas d’URL externe : le fichier vit dans le bucket Supabase `mods`. */
        link: "",
        statut,
        vip,
        semi_vip: semiVip,
      };

      const url = isEdit
        ? `/api/admin/cheats/${editingRow!.id}`
        : "/api/admin/cheats";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({
          text:
            typeof json?.error === "string"
              ? json.error
              : t("dashboard.admin.allCheats.dialog.errorSave"),
          variant: "error",
        });
        return;
      }

      showToast({ text: t("dashboard.admin.allCheats.dialog.success") });
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
              ? t("dashboard.admin.allCheats.dialog.editTitle")
              : t("dashboard.admin.allCheats.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.admin.allCheats.dialog.description")}
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
            <Label htmlFor="cheat-game">{t("dashboard.admin.allCheats.dialog.game")}</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger id="cheat-game" className="h-9 w-full min-w-0">
                <SelectValue placeholder={t("dashboard.admin.allCheats.dialog.gamePlaceholder")} />
              </SelectTrigger>
              <SelectContent className="p-2">
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cheat-name">{t("dashboard.admin.allCheats.dialog.name")}</Label>
            <Input
              id="cheat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
              className="h-9 min-h-9"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cheat-mode">{t("dashboard.admin.allCheats.dialog.mode")}</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="cheat-mode" className="h-9 w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  {MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cheat-platform">
                {t("dashboard.admin.allCheats.dialog.platform")}
              </Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="cheat-platform" className="h-9 w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cheat-extension">
                {t("dashboard.admin.allCheats.dialog.extension")}
              </Label>
              <Select value={extension} onValueChange={setExtension}>
                <SelectTrigger id="cheat-extension" className="h-9 w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  {EXTENSION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cheat-statut">{t("dashboard.admin.allCheats.dialog.statut")}</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger id="cheat-statut" className="h-9 w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  {STATUT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cheat-file">{t("dashboard.admin.allCheats.dialog.fileLabel")}</Label>
            <Input
              id="cheat-file"
              key={`cheat-file-${open ? (editingRow?.id ?? "create") : "closed"}`}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-9 min-h-9 cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              {t("dashboard.admin.allCheats.dialog.fileHint")}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-input bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cheat-client" className="cursor-pointer font-normal">
                {t("dashboard.admin.allCheats.dialog.client")}
              </Label>
              <Switch
                id="cheat-client"
                checked={hasClient}
                onCheckedChange={setHasClient}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cheat-crack" className="cursor-pointer font-normal">
                {t("dashboard.admin.allCheats.dialog.crack")}
              </Label>
              <Switch id="cheat-crack" checked={crack} onCheckedChange={setCrack} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cheat-vip" className="cursor-pointer font-normal">
                {t("dashboard.admin.allCheats.dialog.vip")}
              </Label>
              <Switch id="cheat-vip" checked={vip} onCheckedChange={setVip} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cheat-semivip" className="cursor-pointer font-normal">
                {t("dashboard.admin.allCheats.dialog.semivip")}
              </Label>
              <Switch
                id="cheat-semivip"
                checked={semiVip}
                onCheckedChange={setSemiVip}
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
                  ? t("dashboard.admin.allCheats.dialog.save")
                  : t("dashboard.admin.allCheats.dialog.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
