"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "@/app/components/i18n-provider";
import { useForumMotion } from "@/app/components/pages/client/forum/forum-motion";

type Props = {
  variant: "list" | "thread";
};

export function ForumPageHeader({ variant }: Props) {
  const { t } = useTranslations();
  const { blockIn, sectionStagger } = useForumMotion();

  if (variant === "list") {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("forum.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("forum.description")}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-2"
      variants={sectionStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={blockIn}>
        <Link
          href="/dashboard?page=forum"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 shrink-0" />
          {t("forum.backToList")}
        </Link>
      </motion.div>
      <motion.div variants={blockIn}>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("forum.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("forum.description")}
        </p>
      </motion.div>
    </motion.div>
  );
}
