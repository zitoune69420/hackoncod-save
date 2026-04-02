"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createForumThreadAction } from "@/app/actions/forum-thread";
import { useTranslations } from "@/app/components/i18n-provider";
import { ForumMarkdown } from "@/app/components/pages/client/forum-markdown";
import { showToast } from "@/components/commons/toasts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

type Props = {
  className?: string;
};

export function ForumNewThreadDialog({ className }: Props) {
  const { t } = useTranslations();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setContent("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const titleTrim = title.trim();
    const contentTrim = content.trim();
    if (!titleTrim || !contentTrim) {
      showToast({ text: t("forum.threadValidationError"), variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createForumThreadAction({
        title: titleTrim,
        content: contentTrim,
      });
      if (!result.ok) {
        if (result.error === "unauthorized") {
          showToast({ text: t("forum.mustBeLoggedInToPost"), variant: "warning" });
        } else if (result.error === "invalid") {
          showToast({ text: t("forum.threadValidationError"), variant: "warning" });
        } else {
          showToast({ text: t("forum.threadCreateError"), variant: "error" });
        }
        return;
      }
      showToast({ text: t("forum.threadCreated"), variant: "success" });
      setOpen(false);
      reset();
      router.push(
        `/dashboard?page=forum&thread=${encodeURIComponent(result.threadId)}`,
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const loggedOut = !sessionPending && !session?.user;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className={cn("gap-1.5", className)}
          disabled={sessionPending || loggedOut}
          title={loggedOut ? t("forum.mustBeLoggedInToPost") : undefined}
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
          {t("forum.newThread")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton
      >
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[min(90vh,720px)] flex-col gap-4 overflow-y-auto p-6"
        >
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle>{t("forum.newThreadDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("forum.newThreadDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 space-y-2">
            <Label htmlFor="forum-new-thread-title">{t("forum.threadTitleLabel")}</Label>
            <Input
              id="forum-new-thread-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("forum.threadTitlePlaceholder")}
              autoComplete="off"
              disabled={submitting}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <Label>{t("forum.threadBodyLabel")}</Label>
            <Tabs defaultValue="edit" className="flex flex-1 flex-col gap-2">
              <TabsList className="h-9 w-full shrink-0 justify-start sm:w-auto">
                <TabsTrigger value="edit">{t("forum.composeTab")}</TabsTrigger>
                <TabsTrigger value="preview">{t("forum.previewTab")}</TabsTrigger>
              </TabsList>
              <TabsContent
                value="edit"
                className="mt-0 min-h-[200px] flex-1 data-[state=inactive]:hidden"
              >
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("forum.threadBodyPlaceholder")}
                  disabled={submitting}
                  className="min-h-[220px] max-h-[36vh] resize-y text-sm"
                />
              </TabsContent>
              <TabsContent
                value="preview"
                className="mt-0 min-h-[220px] max-h-[36vh] flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 data-[state=inactive]:hidden"
              >
                {content.trim() ? (
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <ForumMarkdown source={content} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("forum.previewEmpty")}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {t("forum.cancelNewThread")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("forum.publishingThread") : t("forum.publishThread")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
