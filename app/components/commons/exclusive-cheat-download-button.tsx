"use client";

import { Button } from "@/components/ui/button";
import { showToast } from "@/components/commons/toasts";
import { useTranslations } from "@/app/components/i18n-provider";
import { useRouter } from "next/navigation";
import { DASHBOARD_REVIEWS_HREF } from "@/lib/site-paths";
import type { ComponentProps } from "react";

export type CheatDownloadChannel = "public" | "vip" | "semivip";

function downloadApiUrl(cheatId: string, channel: CheatDownloadChannel): string {
  if (channel === "public") {
    return `/api/cheats/public-download?cheatId=${encodeURIComponent(cheatId)}`;
  }
  return `/api/cheats/mod-download?cheatId=${encodeURIComponent(cheatId)}&kind=${channel}`;
}

export function CheatDownloadButton({
  cheatId,
  link,
  channel,
  label,
  reviewToastText,
  size = "sm",
}: {
  cheatId: string;
  link: string;
  channel: CheatDownloadChannel;
  label: string;
  reviewToastText: string;
  size?: ComponentProps<typeof Button>["size"];
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const trimmed = link?.trim() ?? "";

  const reviewToast = () =>
    showToast({
      text: reviewToastText,
      action: {
        label: t("common.addReview"),
        onClick: () => router.push(DASHBOARD_REVIEWS_HREF),
      },
    });

  const onClick = async () => {
    if (!trimmed) return;

    try {
      /** Toujours via l’API : relit `cheat.link` en base (évite liens obsolètes depuis le cache liste des cheats). */
      const res = await fetch(downloadApiUrl(cheatId, channel));
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || typeof json.url !== "string") {
        showToast({
          text:
            typeof json.error === "string"
              ? json.error
              : t("common.exclusiveDownload.urlError"),
          variant: "error",
        });
        return;
      }
      window.open(json.url, "_blank", "noopener,noreferrer");
      reviewToast();
    } catch {
      showToast({
        text: t("common.exclusiveDownload.networkError"),
        variant: "error",
      });
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant="default"
      disabled={!trimmed}
      onClick={() => void onClick()}
    >
      {label}
    </Button>
  );
}

/** @deprecated Utilisez CheatDownloadButton avec channel — conservé pour imports existants. */
export function ExclusiveCheatDownloadButton({
  cheatId,
  link,
  kind,
  label,
  reviewToastText,
}: {
  cheatId: string;
  link: string;
  kind: "vip" | "semivip";
  label: string;
  reviewToastText: string;
}) {
  return (
    <CheatDownloadButton
      cheatId={cheatId}
      link={link}
      channel={kind}
      label={label}
      reviewToastText={reviewToastText}
    />
  );
}
