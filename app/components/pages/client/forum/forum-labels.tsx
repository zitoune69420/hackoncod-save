"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/app/components/i18n-provider";

export function ForumPinnedBadge() {
  const { t } = useTranslations();
  return (
    <Badge variant="secondary" className="shrink-0 text-xs">
      {t("forum.pinnedBadge")}
    </Badge>
  );
}

export function ForumNoThreads() {
  const { t } = useTranslations();
  return <p className="text-sm text-muted-foreground">{t("forum.noThreads")}</p>;
}

export function ForumThreadNotFound() {
  const { t } = useTranslations();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("forum.threadNotFound")}</p>
      <Link
        href="/dashboard?page=forum"
        className="text-sm font-medium text-primary underline"
      >
        {t("forum.backToForumLink")}
      </Link>
    </div>
  );
}

export function ForumCommentsHeading() {
  const { t } = useTranslations();
  return <h2 className="text-lg font-semibold">{t("forum.commentsTitle")}</h2>;
}

export function ForumNoComments() {
  const { t } = useTranslations();
  return <p className="text-sm text-muted-foreground">{t("forum.noComments")}</p>;
}
