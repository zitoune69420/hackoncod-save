"use client"

import { Button } from "@/components/ui/button"
import { CommonTable } from "@/components/commons/table/table"
import { useTranslations } from "@/app/components/i18n-provider"

export type GameRow = {
  id: string
  title: string
  description: string
  steam: string | null
  link: string | null
  client: string | null
  action?: React.ReactNode
}

function getGamesColumns(t: (key: string) => string) {
  return [
    { key: "title" as const, label: t("games.tableHeaders.title") },
    {
      key: "description" as const,
      label: t("games.tableHeaders.description"),
      render: (row: GameRow) => (
      <span className="line-clamp-2 max-w-md" title={row.description}>
        {row.description}
      </span>
    ),
  },
  {
    key: "action" as const,
    label: t("games.tableHeaders.action"),
    render: (row: GameRow) => (
      <div className="flex gap-2">
        {row.steam ? (
          <Button variant="outline" asChild>
            <a href={row.steam} target="_blank" rel="noopener noreferrer">
              {t("games.steam")}
            </a>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            {t("games.steam")}
          </Button>
        )}
        {row.link ? (
          <Button variant="default" asChild>
            <a href={row.link} target="_blank" rel="noopener noreferrer">
              {t("games.download")}
            </a>
          </Button>
        ) : (
          <Button variant="default" disabled>
            {t("games.download")}
          </Button>
        )}
        {row.client ? (
          <Button variant="outline" asChild>
            <a href={row.client} target="_blank" rel="noopener noreferrer">
              {t("games.client")}
            </a>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            {t("games.client")}
          </Button>
        )}
      </div>
    ),
  },
  ]
}

export function GamesTable({ data = [] }: { data?: GameRow[] }) {
  const { t } = useTranslations()
  return <CommonTable columns={getGamesColumns(t)} data={data} pageSize={10} />
}
