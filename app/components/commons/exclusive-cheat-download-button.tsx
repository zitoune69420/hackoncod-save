"use client";

import { Button } from "@/components/ui/button";
import { showToast } from "@/components/commons/toasts";
import { useTranslations } from "@/app/components/i18n-provider";
import { useRouter } from "next/navigation";
import { DASHBOARD_REVIEWS_HREF } from "@/lib/site-paths";
import type { ComponentProps } from "react";
import { issuePublicCheatDownloadToken } from "@/app/actions/public-cheat-download";

export type CheatDownloadChannel = "public" | "vip" | "semivip";

function modDownloadApiUrl(cheatId: string, channel: CheatDownloadChannel): string {
  return `/api/cheats/mod-download?cheatId=${encodeURIComponent(cheatId)}&kind=${channel}`;
}

export function CheatDownloadButton({
  cheatId,
  hasFile,
  channel,
  label,
  reviewToastText,
  size = "sm",
}: {
  cheatId: string;
  /** Indique si une entrée `link` existe en base (sans exposer l’URL). */
  hasFile: boolean;
  channel: CheatDownloadChannel;
  label: string;
  reviewToastText: string;
  size?: ComponentProps<typeof Button>["size"];
}) {
  const { t } = useTranslations();
  const router = useRouter();

  const reviewToast = () =>
    showToast({
      text: reviewToastText,
      action: {
        label: t("common.addReview"),
        onClick: () => router.push(DASHBOARD_REVIEWS_HREF),
      },
    });

  const onClick = async () => {
    if (!hasFile) return;

    try {
      let url: string;
      if (channel === "public") {
        const tok = await issuePublicCheatDownloadToken(cheatId);
        if (!tok.ok) {
          showToast({
            text:
              tok.error === "rate_limited"
                ? t("common.exclusiveDownload.rateLimited")
                : t("common.exclusiveDownload.urlError"),
            variant: "error",
          });
          return;
        }
        const q = new URLSearchParams({
          cheatId,
          exp: String(tok.exp),
          sig: tok.sig,
        });
        url = `/api/cheats/public-download?${q.toString()}`;
      } else {
        url = modDownloadApiUrl(cheatId, channel);
      }

      /** Toujours via l’API : relit `cheat.link` en base (évite liens obsolètes depuis le cache liste des cheats). */
      const res = await fetch(url);
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || typeof json.url !== "string") {
        showToast({
          text:
            res.status === 429
              ? t("common.exclusiveDownload.rateLimited")
              : typeof json.error === "string"
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
      disabled={!hasFile}
      onClick={() => void onClick()}
    >
      {label}
    </Button>
  );
}

/** @deprecated Utilisez CheatDownloadButton avec channel — conservé pour imports existants. */
export function ExclusiveCheatDownloadButton({
  cheatId,
  hasFile,
  kind,
  label,
  reviewToastText,
}: {
  cheatId: string;
  hasFile: boolean;
  kind: "vip" | "semivip";
  label: string;
  reviewToastText: string;
}) {
  return (
    <CheatDownloadButton
      cheatId={cheatId}
      hasFile={hasFile}
      channel={kind}
      label={label}
      reviewToastText={reviewToastText}
    />
  );
}
