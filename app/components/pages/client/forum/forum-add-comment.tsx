"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postForumCommentAction } from "@/app/actions/forum-comment";
import { useTranslations } from "@/app/components/i18n-provider";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/components/commons/toasts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ForumAddCommentProps = {
  threadId: string;
  /** Réponse à un commentaire : affiche d’abord le bouton « Répondre ». */
  parentId?: string | null;
  replyTrigger?: boolean;
  className?: string;
};

export function ForumAddComment({
  threadId,
  parentId = null,
  replyTrigger = false,
  className,
}: ForumAddCommentProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [open, setOpen] = useState(!replyTrigger);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const isReply = Boolean(parentId);
  const submitLabel = isReply ? t("forum.postReply") : t("forum.postComment");
  const postingLabel = isReply ? t("forum.postingComment") : t("forum.postingComment");
  const placeholder = isReply
    ? t("forum.replyPlaceholder")
    : t("forum.addCommentPlaceholder");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = message.trim();
    if (!body || posting) return;

    setPosting(true);
    try {
      const result = await postForumCommentAction({
        threadId,
        message: body,
        parentId: parentId ?? null,
      });
      if (!result.ok) {
        if (result.error === "unauthorized") {
          showToast({ text: t("forum.mustBeLoggedInToComment"), variant: "warning" });
        } else if (result.error === "invalid") {
          showToast({ text: t("forum.commentValidationError"), variant: "warning" });
        } else if (result.error === "not_found") {
          showToast({ text: t("forum.threadNotFound"), variant: "error" });
        } else {
          showToast({ text: t("forum.commentError"), variant: "error" });
        }
        return;
      }
      setMessage("");
      if (replyTrigger) setOpen(false);
      showToast({
        text: isReply ? t("forum.replySuccess") : t("forum.commentSuccess"),
        variant: "success",
      });
      router.refresh();
    } finally {
      setPosting(false);
    }
  };

  if (sessionPending) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {t("forum.loadingComments")}
      </p>
    );
  }

  if (!session?.user) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {t("forum.mustBeLoggedInToComment")}
      </p>
    );
  }

  if (replyTrigger && !open) {
    return (
      <div className={cn("pt-2", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          {t("forum.reply")}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-2", replyTrigger ? "pt-2 border-t border-border mt-2" : "", className)}
    >
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={replyTrigger ? 3 : 4}
        disabled={posting}
        className="min-h-[80px] resize-y text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={posting || !message.trim()}>
          {posting ? postingLabel : submitLabel}
        </Button>
        {replyTrigger ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={posting}
            onClick={() => {
              setOpen(false);
              setMessage("");
            }}
          >
            {t("forum.cancelReply")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
