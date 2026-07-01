"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/app/components/i18n-provider";
import Image from "next/image";

const LS_KEY = "hackoncod_site_blocked";

export function BannedClient() {
  const { t } = useTranslations();
  const search = useSearchParams();
  const reason = search.get("reason")?.trim() || null;

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {
      /* ignore */
    }
    document.cookie = `${LS_KEY}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-16 text-center">
      <Image src="/haha.png" alt="Hackoncod" width={200} height={200} className="mx-auto rounded-lg" />
      <h1 className="text-2xl font-semibold">
        {t("common.siteBan.title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("common.siteBan.description")}
      </p>
      {reason ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <span className="font-medium">{t("common.siteBan.reasonLabel")}</span>
          {": "}
          <span className="wrap-break-word">{reason}</span>
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t("common.siteBan.clearHint")}
      </p>
    </div>
  );
}
