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
import { Alert02Icon, DiscordIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

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

  const headerBlock = (
    <>
      <div className="flex gap-3.5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            "bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
          )}
          aria-hidden
        >
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <DialogTitle className="text-left text-lg font-semibold leading-snug tracking-tight">
            {t("cheats.reportDialog.title")}
          </DialogTitle>
          <p className="text-left text-sm leading-relaxed text-muted-foreground">
            {t("cheats.reportDialog.descriptionLead")}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-5 rounded-xl border border-border/70 bg-muted/40 px-4 py-3.5",
          "dark:border-border/50 dark:bg-muted/25",
        )}
      >
        <div className="grid gap-0.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("cheats.reportDialog.cheatContextLabel")}
          </span>
          <span className="truncate text-base font-semibold text-foreground" title={cheatName}>
            {cheatName}
          </span>
        </div>
        <div className="mt-3 grid gap-0.5 border-t border-border/50 pt-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("cheats.reportDialog.gameContextLabel")}
          </span>
          <span className="truncate text-sm text-muted-foreground" title={gameTitle}>
            {gameTitle}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          sessionPending || loggedOut
            ? "sm:max-w-md"
            : "max-h-[min(90vh,640px)] gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-[440px]",
        )}
        showCloseButton
      >
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
          <>
            <DialogHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-6 pb-6 pt-6 text-left dark:from-muted/15">
              {headerBlock}
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="space-y-5 px-6 py-6">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="report-reason"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("cheats.reportDialog.reasonLabel")}
                  </Label>
                  <Select
                    value={reasonKey || undefined}
                    onValueChange={setReasonKey}
                    disabled={submitting}
                    required
                  >
                    <SelectTrigger
                      id="report-reason"
                      className="h-11 w-full text-left text-sm shadow-sm"
                    >
                      <SelectValue placeholder={t("cheats.reportDialog.reasonPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CHEAT_REPORT_REASON_KEYS.map((key) => (
                        <SelectItem key={key} value={key} className="text-sm">
                          {t(`cheats.reportDialog.reasons.${key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label
                    htmlFor="report-comment"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("cheats.reportDialog.commentLabel")}
                  </Label>
                  <Textarea
                    id="report-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("cheats.reportDialog.commentPlaceholder")}
                    className="min-h-[128px] resize-y text-sm leading-relaxed shadow-sm"
                    maxLength={2000}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    {comment.length} / 2000
                  </p>
                </div>
              </div>

              <DialogFooter className="flex-row justify-end gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 dark:bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[5.5rem]"
                  disabled={submitting}
                  onClick={() => handleOpenChange(false)}
                >
                  {t("cheats.reportDialog.cancel")}
                </Button>
                <Button type="submit" className="min-w-[9rem] font-medium shadow-sm" disabled={submitting}>
                  {t("cheats.reportDialog.submit")}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
