"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/app/components/i18n-provider";
import { cn } from "@/lib/utils";

const DISCORD_INVITE = "https://discord.gg/cod-fr";

type HowToVipDialogProps = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
};

export function HowToVipDialog({
  open,
  onOpenChangeAction,
}: HowToVipDialogProps) {
  const { t } = useTranslations();

  const steps = [
    {
      image: "/vip/join.png",
      titleKey: "vip.howTo.step1Title",
      descKey: "vip.howTo.step1Description",
      altKey: "vip.howTo.step1ImageAlt",
    },
    {
      image: "/vip/nitro.png",
      titleKey: "vip.howTo.step2Title",
      descKey: "vip.howTo.step2Description",
      altKey: "vip.howTo.step2ImageAlt",
    },
    {
      image: "/vip/boost.png",
      titleKey: "vip.howTo.step3Title",
      descKey: "vip.howTo.step3Description",
      altKey: "vip.howTo.step3ImageAlt",
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] w-full max-w-[min(100%,32rem)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-[min(100%,32rem)]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 sm:px-6 sm:pt-5">
          <DialogHeader className="shrink-0 space-y-2.5 p-0 text-left">
            <DialogTitle className="text-base font-semibold leading-tight">
              {t("vip.howTo.title")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug text-muted-foreground">
              {t("vip.howTo.subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "scrollbar-dialog mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2",
              "-mr-px",
            )}
          >
            <ol className="space-y-5 pb-1">
              {steps.map((step, index) => (
                <li key={step.titleKey}>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground sm:size-7 sm:text-xs"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm font-medium leading-snug">
                        {t(step.titleKey)}
                      </h3>
                      <p className="text-[13px] leading-snug text-muted-foreground">
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-2.5 h-28 w-full overflow-hidden rounded-lg sm:h-52">
                    <Image
                      src={step.image}
                      alt={t(step.altKey)}
                      fill
                      className="object-cover p-1 rounded-lg"
                      sizes="(max-width: 768px) 100vw, 384px"
                      priority={index === 0}
                    />
                  </div>
                </li>
              ))}

              <li>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground sm:size-7 sm:text-xs"
                    aria-hidden
                  >
                    4
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm font-medium leading-snug">
                      {t("vip.howTo.step4Title")}
                    </h3>
                    <p className="text-[13px] leading-snug text-muted-foreground">
                      {t("vip.howTo.step4Description")}
                    </p>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div className="flex shrink-0 justify-end px-5 pb-4 pt-2 sm:px-6 sm:pb-5">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => onOpenChangeAction(false)}
          >
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
