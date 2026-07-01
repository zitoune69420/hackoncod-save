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
import type { ShopAccount, ShopProductCreator } from "@/lib/supabase/shop-types";

export type AdminShopAccountTableRow = ShopAccount & {
  creator: ShopProductCreator | null;
  actions?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AdminShopAccountTableRow | null;
  onSaved: () => void;
};

export function AdminShopAccountEditDialog({ open, onOpenChange, row, onSaved }: Props) {
  const { t } = useTranslations();
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");
  const [games, setGames] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [login, setLogin] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [revolut, setRevolut] = React.useState("");
  const [paypal, setPaypal] = React.useState("");
  const [createdBy, setCreatedBy] = React.useState("");
  const [lastActivity, setLastActivity] = React.useState("");
  const [twoFa, setTwoFa] = React.useState(false);
  const [isRanked, setIsRanked] = React.useState(false);
  const [requiresChat, setRequiresChat] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
    setImage(row.image ?? "");
    setGames(row.games ?? "");
    setRegion(row.region ?? "");
    setLogin(row.login ?? "");
    setEmail(row.email ?? "");
    setPassword(row.password ?? "");
    setLevel(row.level != null ? String(row.level) : "");
    setPrice(String(row.price));
    setCurrency(row.currency ?? "");
    setRevolut(row.revolut ?? "");
    setPaypal(row.paypal ?? "");
    setCreatedBy(row.created_by ?? "");
    setLastActivity(row.last_activity ?? "");
    setTwoFa(row.two_fa);
    setIsRanked(row.is_ranked);
    setRequiresChat(row.requires_chat);
    setIsActive(row.is_active !== false);
  }, [open, row]);

  const submit = async () => {
    if (!row) return;
    const nm = name.trim();
    const sl = slug.trim();
    if (!nm || !sl) {
      showToast({ text: t("dashboard.admin.shopCatalog.validationNameSlug"), variant: "error" });
      return;
    }
    const priceN = Number.parseFloat(price.trim());
    if (!Number.isFinite(priceN) || priceN < 0) {
      showToast({ text: t("dashboard.admin.shopCatalog.saveError"), variant: "error" });
      return;
    }
    let levelN: number | null = null;
    const lv = level.trim();
    if (lv !== "") {
      const n = Number.parseInt(lv, 10);
      if (!Number.isInteger(n) || n < 0) {
        showToast({ text: t("dashboard.admin.shopCatalog.saveError"), variant: "error" });
        return;
      }
      levelN = n;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/accounts/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          slug: sl,
          description: description.trim() || null,
          image: image.trim() || null,
          games: games.trim() || null,
          region: region.trim() || null,
          login: login.trim() || null,
          email: email.trim() || null,
          password: password.trim() || null,
          level: levelN,
          price: priceN,
          currency: currency.trim() || null,
          last_activity: lastActivity.trim() || null,
          two_fa: twoFa,
          is_ranked: isRanked,
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
          <DialogTitle>{t("dashboard.admin.shopCatalog.accountDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sa-name">{t("dashboard.admin.shopCatalog.fieldName")}</Label>
            <Input id="sa-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-slug">{t("dashboard.admin.shopCatalog.fieldSlug")}</Label>
            <Input id="sa-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-desc">{t("dashboard.admin.shopCatalog.fieldDescription")}</Label>
            <Textarea id="sa-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-img">{t("dashboard.admin.shopCatalog.fieldImageUrl")}</Label>
            <Input id="sa-img" value={image} onChange={(e) => setImage(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-games">{t("dashboard.admin.shopCatalog.fieldGames")}</Label>
            <Input id="sa-games" value={games} onChange={(e) => setGames(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-region">{t("dashboard.admin.shopCatalog.fieldRegion")}</Label>
            <Input id="sa-region" value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-login">{t("dashboard.admin.shopCatalog.fieldLogin")}</Label>
            <Input id="sa-login" value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-email">{t("dashboard.admin.shopCatalog.fieldEmail")}</Label>
            <Input id="sa-email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-pw">{t("dashboard.admin.shopCatalog.fieldPassword")}</Label>
            <Input id="sa-pw" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-lv">{t("dashboard.admin.shopCatalog.fieldLevel")}</Label>
            <Input id="sa-lv" inputMode="numeric" value={level} onChange={(e) => setLevel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sa-price">{t("dashboard.admin.shopCatalog.fieldPrice")}</Label>
              <Input id="sa-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sa-cur">{t("dashboard.admin.shopCatalog.fieldCurrency")}</Label>
              <Input id="sa-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-cb">{t("dashboard.admin.shopCatalog.fieldCreatedBy")}</Label>
            <Input id="sa-cb" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-la">{t("dashboard.admin.shopCatalog.fieldLastActivity")}</Label>
            <Input id="sa-la" value={lastActivity} onChange={(e) => setLastActivity(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-rev">{t("dashboard.admin.shopCatalog.fieldRevolut")}</Label>
            <Input id="sa-rev" value={revolut} onChange={(e) => setRevolut(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sa-pay">{t("dashboard.admin.shopCatalog.fieldPaypal")}</Label>
            <Input id="sa-pay" value={paypal} onChange={(e) => setPaypal(e.target.value)} />
          </div>
          <BoolRow id="sa-2fa" label={t("dashboard.admin.shopCatalog.fieldTwoFa")} checked={twoFa} onChange={setTwoFa} />
          <BoolRow id="sa-rk" label={t("dashboard.admin.shopCatalog.fieldRanked")} checked={isRanked} onChange={setIsRanked} />
          <BoolRow id="sa-ch" label={t("dashboard.admin.shopCatalog.fieldRequiresChat")} checked={requiresChat} onChange={setRequiresChat} />
          <BoolRow id="sa-ac" label={t("shop.common.active")} checked={isActive} onChange={setIsActive} />
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

function BoolRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
    </div>
  );
}
