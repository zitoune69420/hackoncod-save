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
import type { ShopService, ShopProductCreator } from "@/lib/supabase/shop-types";

export type AdminShopServiceTableRow = ShopService & {
  creator: ShopProductCreator | null;
  actions?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AdminShopServiceTableRow | null;
  onSaved: () => void;
};

export function AdminShopServiceEditDialog({ open, onOpenChange, row, onSaved }: Props) {
  const { t } = useTranslations();
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");
  const [platform, setPlatform] = React.useState("");
  const [game, setGame] = React.useState("");
  const [deliveryType, setDeliveryType] = React.useState("");
  const [eta, setEta] = React.useState("");
  const [revolut, setRevolut] = React.useState("");
  const [paypal, setPaypal] = React.useState("");
  const [createdBy, setCreatedBy] = React.useState("");
  const [requiresChat, setRequiresChat] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
    setImage(row.image ?? "");
    setPlatform(row.platform ?? "");
    setGame(row.game ?? "");
    setDeliveryType(row.delivery_type ?? "");
    setEta(
      row.estimated_delivery_minutes != null ? String(row.estimated_delivery_minutes) : "",
    );
    setRevolut(row.revolut ?? "");
    setPaypal(row.paypal ?? "");
    setCreatedBy(row.created_by ?? "");
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
    let estimated_delivery_minutes: number | null = null;
    const etaT = eta.trim();
    if (etaT !== "") {
      const n = Number.parseInt(etaT, 10);
      if (!Number.isInteger(n) || n < 0) {
        showToast({ text: t("dashboard.admin.shopCatalog.validationEta"), variant: "error" });
        return;
      }
      estimated_delivery_minutes = n;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/services/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          slug: sl,
          description: description.trim() || null,
          image: image.trim() || null,
          platform: platform.trim() || null,
          game: game.trim() || null,
          delivery_type: deliveryType.trim() || null,
          estimated_delivery_minutes,
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
          <DialogTitle>{t("dashboard.admin.shopCatalog.serviceDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ss-name">{t("dashboard.admin.shopCatalog.fieldName")}</Label>
            <Input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-slug">{t("dashboard.admin.shopCatalog.fieldSlug")}</Label>
            <Input id="ss-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-desc">{t("dashboard.admin.shopCatalog.fieldDescription")}</Label>
            <Textarea id="ss-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-img">{t("dashboard.admin.shopCatalog.fieldImageUrl")}</Label>
            <Input id="ss-img" value={image} onChange={(e) => setImage(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-plat">{t("dashboard.admin.allCheats.table.platform")}</Label>
            <Input id="ss-plat" value={platform} onChange={(e) => setPlatform(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-game">{t("dashboard.admin.allCheats.table.game")}</Label>
            <Input id="ss-game" value={game} onChange={(e) => setGame(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-del">{t("dashboard.admin.shopCatalog.fieldDeliveryType")}</Label>
            <Input id="ss-del" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-eta">{t("dashboard.admin.shopCatalog.fieldEtaMinutes")}</Label>
            <Input id="ss-eta" inputMode="numeric" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-cb">{t("dashboard.admin.shopCatalog.fieldCreatedBy")}</Label>
            <Input id="ss-cb" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-rev">{t("dashboard.admin.shopCatalog.fieldRevolut")}</Label>
            <Input id="ss-rev" value={revolut} onChange={(e) => setRevolut(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ss-pay">{t("dashboard.admin.shopCatalog.fieldPaypal")}</Label>
            <Input id="ss-pay" value={paypal} onChange={(e) => setPaypal(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
            <Label htmlFor="ss-chat" className="cursor-pointer text-sm font-normal">
              {t("dashboard.admin.shopCatalog.fieldRequiresChat")}
            </Label>
            <Switch id="ss-chat" checked={requiresChat} onCheckedChange={(c) => setRequiresChat(c === true)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
            <Label htmlFor="ss-act" className="cursor-pointer text-sm font-normal">
              {t("shop.common.active")}
            </Label>
            <Switch id="ss-act" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
          </div>
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
