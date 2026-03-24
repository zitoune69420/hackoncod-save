"use client"

import { Button } from "@/components/ui/button"
import { CommonTable } from "@/components/commons/table/table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { useTranslations } from "@/app/components/i18n-provider"

export type VipCheatRow = {
  id: string
  name: string
  game: string
  mode: string
  extension: string
  crack: boolean
  client: string
  link: string
  action?: React.ReactNode
}

function getVipCheatsColumns(t: (key: string) => string) {
  return [
    { key: "name" as const, label: t("vip.tableHeaders.name") },
    { key: "game" as const, label: t("vip.tableHeaders.game") },
    { key: "mode" as const, label: t("vip.tableHeaders.mode") },
    { key: "extension" as const, label: t("vip.tableHeaders.extension") },
    {
      key: "crack" as const,
      label: t("vip.tableHeaders.crack"),
      render: (row: VipCheatRow) =>
        row.crack ? (
          <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-5 text-green-600" />
        ) : (
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5 text-red-600" />
        ),
    },
    {
      key: "client" as const,
      label: t("vip.tableHeaders.client"),
      render: (row: VipCheatRow) =>
        row.client ? (
          <HugeiconsIcon icon={Tick01Icon} strokeWidth={2} className="size-5 text-green-600" />
        ) : (
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-5 text-red-600" />
        ),
    },
    {
      key: "action" as const,
      label: t("vip.tableHeaders.download"),
      render: (row: VipCheatRow) => (
        <div className="flex gap-2">
          {row.link ? (
            <Button size="sm" variant="default" asChild>
              <a href={row.link} target="_blank">
                {t("vip.download")}
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="default" disabled>
              {t("vip.download")}
            </Button>
          )}
        </div>
      ),
    },
  ]
}

export function VipCheatsTable({ data = [] }: { data?: VipCheatRow[] }) {
  const { t } = useTranslations()
  return <CommonTable columns={getVipCheatsColumns(t)} data={data} pageSize={10} />
}
