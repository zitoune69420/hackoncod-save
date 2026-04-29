"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { ShopCheat, ShopProductCreator } from "@/lib/supabase/shop-types";

export type AdminShopCheatTableRow = ShopCheat & {
  creator: ShopProductCreator | null;
  actions?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AdminShopCheatTableRow | null;
  onSaved: () => void;
};

export function AdminShopCheatEditDialog({ open, onOpenChange, row, onSaved }: Props) {
  const { t } = useTranslations();
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [game, setGame] = React.useState("");
  const [platform, setPlatform] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [image, setImage] = React.useState("");
  const [revolut, setRevolut] = React.useState("");
  const [paypal, setPaypal] = React.useState("");
  const [createdBy, setCreatedBy] = React.useState("");
  const [requiresSpoofer, setRequiresSpoofer] = React.useState(false);
  const [requiresChat, setRequiresChat] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
    setGame(row.game ?? "");
    setPlatform(row.platform ?? "");
    setStatus(row.status ?? "");
    setImage(row.image ?? "");
    setRevolut(row.revolut ?? "");
    setPaypal(row.paypal ?? "");
    setCreatedBy(row.created_by ?? "");
    setRequiresSpoofer(row.requires_spoofer);
    setRequiresChat(row.requires_chat);
    setIsActive(row.is_active);
  }, [open, row]);

  const submit = async () => {
    if (!row) return;
    const nm = name.trim();
    const sl = slug.trim();
    if (!nm || !sl) {
      showToast({ text: t("dashboard.admin.shopCatalog.validationNameSlug"), variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/cheats/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          slug: sl,
          description: description.trim() || null,
          game: game.trim() || null,
          platform: platform.trim() || null,
          status: status.trim() || null,
          image: image.trim() || null,
          requires_spoofer: requiresSpoofer,
          requires_chat: requiresChat,
          is_active: isActive,
          revolut: revolut.trim() || null,
          paypal: paypal.trim() || null,
          created_by: createdBy.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({
          text: typeof json?.error === "string" ? json.error : t("dashboard.admin.shopCatalog.saveError"),
          variant: "error",
        });
        return;
      }
      showToast({ text: t("dashboard.admin.shopCatalog.saveSuccess"), variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dashboard.admin.shopCatalog.cheatDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label={t("dashboard.admin.shopCatalog.fieldName")} id="sc-name" value={name} onChange={setName} />
          <Field label={t("dashboard.admin.shopCatalog.fieldSlug")} id="sc-slug" value={slug} onChange={setSlug} />
          <div className="grid gap-1.5">
            <Label htmlFor="sc-desc">{t("dashboard.admin.shopCatalog.fieldDescription")}</Label>
            <Textarea id="sc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Field label={t("dashboard.admin.allCheats.table.game")} id="sc-game" value={game} onChange={setGame} />
          <Field label={t("dashboard.admin.allCheats.table.platform")} id="sc-plat" value={platform} onChange={setPlatform} />
          <Field label={t("dashboard.admin.shopCatalog.fieldStatus")} id="sc-st" value={status} onChange={setStatus} />
          <Field label={t("dashboard.admin.shopCatalog.fieldImageUrl")} id="sc-img" value={image} onChange={setImage} />
          <Field label={t("dashboard.admin.shopCatalog.fieldCreatedBy")} id="sc-cb" value={createdBy} onChange={setCreatedBy} />
          <Field label={t("dashboard.admin.shopCatalog.fieldRevolut")} id="sc-rev" value={revolut} onChange={setRevolut} />
          <Field label={t("dashboard.admin.shopCatalog.fieldPaypal")} id="sc-pay" value={paypal} onChange={setPaypal} />
          <BoolRow id="sc-spoofer" label={t("dashboard.admin.shopCatalog.fieldRequiresSpoofer")} checked={requiresSpoofer} onCheckedChange={setRequiresSpoofer} />
          <BoolRow id="sc-chat" label={t("dashboard.admin.shopCatalog.fieldRequiresChat")} checked={requiresChat} onCheckedChange={setRequiresChat} />
          <BoolRow id="sc-act" label={t("shop.common.active")} checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("dashboard.admin.shopCatalog.cancel")}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? t("dashboard.admin.shopCatalog.saving") : t("dashboard.admin.shopCatalog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function BoolRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={(c) => onCheckedChange(c === true)} />
    </div>
  );
}
