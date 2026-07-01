"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "@/app/components/i18n-provider";

export type AccountInfoUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function initialsFromUser(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

type AccountInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccountInfoUser;
};

export function AccountInfoDialog({
  open,
  onOpenChange,
  user,
}: AccountInfoDialogProps) {
  const { t } = useTranslations();
  const displayName = user.name?.trim() || user.email || "—";
  const displayEmail = user.email?.trim() || "—";
  const fallback = initialsFromUser(user.name, user.email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("settings.account.title")}</DialogTitle>
          <DialogDescription>{t("settings.account.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          <Avatar className="size-16 rounded-xl">
            <AvatarImage src={user.image ?? undefined} alt={displayName} />
            <AvatarFallback className="rounded-xl text-lg">{fallback}</AvatarFallback>
          </Avatar>

          <dl className="w-full space-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">
                {t("settings.account.username")}
              </dt>
              <dd className="break-words font-medium">{displayName}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">{t("settings.account.email")}</dt>
              <dd className="break-words font-medium">{displayEmail}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">{t("settings.account.userId")}</dt>
              <dd className="break-all font-mono text-xs text-muted-foreground">
                {user.id}
              </dd>
            </div>
          </dl>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
