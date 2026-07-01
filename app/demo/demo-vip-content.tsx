"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CrownIcon,
  FlashIcon,
  InformationCircleIcon,
  LockPasswordIcon,
  Refresh01Icon,
  Tick01Icon,
  WorkflowCircle03Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommonTable } from "@/components/commons/table/table";
import { useTranslations } from "@/app/components/i18n-provider";
import { DEMO_VIP_CHEATS, type DemoVipCheat } from "@/lib/demo/vip-sample-data";

function DemoBanner({ onOpenHowToVip }: { onOpenHowToVip: () => void }) {
  const { t } = useTranslations();
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:gap-4"
      role="status"
    >
      <HugeiconsIcon
        icon={InformationCircleIcon}
        strokeWidth={2}
        className="mt-0.5 size-5 shrink-0 text-primary"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("demo.banner.title")}</p>
        <p className="text-sm text-muted-foreground">
          {t("demo.banner.description")}
        </p>
      </div>
      <Button onClick={onOpenHowToVip} className="shrink-0 gap-2">
        <HugeiconsIcon icon={CrownIcon} strokeWidth={2} />
        {t("demo.banner.cta")}
      </Button>
    </div>
  );
}

function DemoBenefits() {
  const { t } = useTranslations();
  const items = [
    {
      icon: CrownIcon,
      title: t("demo.benefits.item1.title"),
      desc: t("demo.benefits.item1.description"),
    },
    {
      icon: FlashIcon,
      title: t("demo.benefits.item2.title"),
      desc: t("demo.benefits.item2.description"),
    },
    {
      icon: WorkflowCircle03Icon,
      title: t("demo.benefits.item3.title"),
      desc: t("demo.benefits.item3.description"),
    },
  ];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("demo.benefits.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("demo.benefits.subtitle")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={item.icon} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DemoFinalCta({ onOpenHowToVip }: { onOpenHowToVip: () => void }) {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
      <HugeiconsIcon
        icon={CrownIcon}
        strokeWidth={2}
        className="size-10 text-primary"
      />
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{t("demo.cta.title")}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t("demo.cta.description")}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onOpenHowToVip} className="gap-2">
          <HugeiconsIcon icon={CrownIcon} strokeWidth={2} />
          {t("vip.howTo.menuLabel")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("demo.cta.goDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}

export function DemoVipContent({
  onOpenHowToVip,
}: {
  onOpenHowToVip: () => void;
}) {
  const { t } = useTranslations();

  const columns = [
    { key: "name" as const, label: t("vip.tableHeaders.name") },
    { key: "game" as const, label: t("vip.tableHeaders.game") },
    { key: "mode" as const, label: t("vip.tableHeaders.mode") },
    { key: "extension" as const, label: t("vip.tableHeaders.extension") },
    {
      key: "crack" as const,
      label: t("vip.tableHeaders.crack"),
      render: (row: DemoVipCheat) =>
        row.crack ? (
          <HugeiconsIcon
            icon={Tick01Icon}
            strokeWidth={2}
            className="size-5 text-green-600"
          />
        ) : (
          <HugeiconsIcon
            icon={Cancel01Icon}
            strokeWidth={2}
            className="size-5 text-red-600"
          />
        ),
    },
    {
      key: "client" as const,
      label: t("vip.tableHeaders.client"),
      render: (row: DemoVipCheat) =>
        row.client ? (
          <HugeiconsIcon
            icon={Tick01Icon}
            strokeWidth={2}
            className="size-5 text-green-600"
          />
        ) : (
          <HugeiconsIcon
            icon={Cancel01Icon}
            strokeWidth={2}
            className="size-5 text-red-600"
          />
        ),
    },
    {
      key: "id" as const,
      label: t("vip.tableHeaders.download"),
      render: () => (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-1.5 opacity-80"
          aria-label={t("demo.downloadLocked")}
        >
          <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} />
          {t("demo.downloadLocked")}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DemoBanner onOpenHowToVip={onOpenHowToVip} />

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <HugeiconsIcon
            icon={CrownIcon}
            strokeWidth={2}
            className="size-6 text-primary"
          />
          {t("vip.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("vip.description")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          disabled
          placeholder={t("vip.searchPlaceholder")}
          className="h-10 max-w-sm"
        />
        <Button size="lg" variant="outline" disabled className="gap-2">
          <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
          {t("vip.refresh")}
        </Button>
      </div>

      <CommonTable
        columns={columns}
        data={DEMO_VIP_CHEATS}
        pageSize={10}
        rowEntranceAnimation
      />

      <DemoBenefits />

      <DemoFinalCta onOpenHowToVip={onOpenHowToVip} />
    </div>
  );
}
