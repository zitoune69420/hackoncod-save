"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "@/app/components/i18n-provider";
import { authClient } from "@/lib/auth-client";
import { CHEAT_REPORT_REASON_KEYS } from "@/lib/cheat-report-reasons";
import { showToast } from "@/components/commons/toasts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import { DiscordIcon } from "@hugeicons/core-free-icons";

type Props = {
  cheatId: string;
  cheatName: string;
  gameTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportCheatDialog({
  cheatId,
  cheatName,
  gameTitle,
  open,
  onOpenChange,
}: Props) {
  const { t } = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [reasonKey, setReasonKey] = useState<string>("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signInCallbackUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const signInWithDiscord = useCallback(async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: signInCallbackUrl,
      });
    } catch {
      /* silencieux */
    } finally {
      setIsSigningIn(false);
    }
  }, [signInCallbackUrl]);

  useEffect(() => {
    if (open) {
      setReasonKey("");
      setComment("");
    }
  }, [open, cheatId]);

  const reset = () => {
    setReasonKey("");
    setComment("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || sessionPending) return;
    if (!session?.user) {
      return;
    }
    if (!reasonKey) {
      showToast({
        text: t("cheats.reportDialog.pickReason"),
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/cheats/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cheatId,
          reasonKey,
          comment,
        }),
      });
      if (!res.ok) {
        showToast({
          text:
            res.status === 401
              ? t("cheats.reportDialog.mustBeLoggedIn")
              : t("cheats.reportDialog.error"),
          variant: "error",
        });
        return;
      }

      showToast({
        text: t("cheats.reportDialog.success"),
        variant: "success",
      });
      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const loggedIn = Boolean(session?.user);
  const loggedOut = !sessionPending && !loggedIn;

  const contextLine = `${cheatName} · ${gameTitle}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        {sessionPending ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("cheats.reportDialog.title")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </>
        ) : loggedOut ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("reviews.loginDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("reviews.loginDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                className="w-full gap-2 sm:w-auto"
                disabled={isSigningIn}
                onClick={() => void signInWithDiscord()}
              >
                <HugeiconsIcon icon={DiscordIcon} strokeWidth={2} className="size-4" />
                {isSigningIn ? t("navUser.signingIn") : t("navUser.signIn")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle>{t("cheats.reportDialog.title")}</DialogTitle>
              <DialogDescription
                className="truncate text-left"
                title={contextLine}
              >
                {contextLine}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="report-reason" className="text-sm font-medium">
                  {t("cheats.reportDialog.reasonLabel")}
                </Label>
                <Select
                  value={reasonKey || undefined}
                  onValueChange={setReasonKey}
                  disabled={submitting}
                  required
                >
                  <SelectTrigger id="report-reason" className="w-full text-left">
                    <SelectValue placeholder={t("cheats.reportDialog.reasonPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="p-2">
                    {CHEAT_REPORT_REASON_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`cheats.reportDialog.reasons.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="report-comment" className="text-sm font-medium">
                  {t("cheats.reportDialog.commentLabel")}
                </Label>
                <Textarea
                  id="report-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("cheats.reportDialog.commentPlaceholder")}
                  className="min-h-[4.5rem] resize-none text-sm"
                  rows={3}
                  maxLength={2000}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {comment.length} / 2000
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                {t("cheats.reportDialog.cancel")}
              </Button>
              <Button type="submit" disabled={submitting} className="mr-2">
                {t("cheats.reportDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
