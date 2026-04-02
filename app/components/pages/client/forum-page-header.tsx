"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "@/app/components/i18n-provider";

type Props = {
  variant: "list" | "thread";
};

export function ForumPageHeader({ variant }: Props) {
  const { t } = useTranslations();
  return (
    <div className="space-y-2">
      {variant === "thread" ? (
        <Link
          href="/dashboard?page=forum"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 shrink-0" />
          {t("forum.backToList")}
        </Link>
      ) : null}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("forum.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("forum.description")}
        </p>
      </div>
    </div>
  );
}
