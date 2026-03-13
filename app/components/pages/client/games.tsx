"use client"

import { Button } from "@/components/ui/button"
import { CommonTable } from "@/components/commons/table/table"

export type GameRow = {
  id: string
  title: string
  description: string
  steam: string | null
  link: string | null
  client: string | null
  action?: React.ReactNode
}

const GAMES_COLUMNS = [
  { key: "title" as const, label: "Titre" },
  {
    key: "description" as const,
    label: "Description",
    render: (row: GameRow) => (
      <span className="line-clamp-2 max-w-md" title={row.description}>
        {row.description}
      </span>
    ),
  },
  {
    key: "action" as const,
    label: "Action",
    render: (row: GameRow) => (
      <div className="flex gap-2">
        {row.steam ? (
          <Button size="sm" variant="outline" asChild>
            <a href={row.steam} target="_blank" rel="noopener noreferrer">
              Steam
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            Steam
          </Button>
        )}
        {row.link ? (
          <Button size="sm" variant="default" asChild>
            <a href={row.link} target="_blank" rel="noopener noreferrer">
              Télécharger
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="default" disabled>
            Télécharger
          </Button>
        )}
        {row.client ? (
          <Button size="sm" variant="outline" asChild>
            <a href={row.client} target="_blank" rel="noopener noreferrer">
              Client
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            Client
          </Button>
        )}
      </div>
    ),
  },
]

export function GamesTable({ data = [] }: { data?: GameRow[] }) {
  return <CommonTable columns={GAMES_COLUMNS} data={data} pageSize={10} />
}
