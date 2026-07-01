"use client"

import { Button } from "@/components/ui/button"
import { CommonTable } from "@/components/commons/table/table"
import { useTranslations } from "@/app/components/i18n-provider"
import { showToast } from "@/components/commons/toasts"
import { truncateText } from "@/lib/truncate-text"
import { useRouter } from "next/navigation"
import { DASHBOARD_REVIEWS_HREF } from "@/lib/site-paths"

const DESCRIPTION_MAX_CHARS = 100

export type GameRow = {
  id: string
  title: string
  description: string
  steam: string | null
  link: string | null
  client: string | null
  action?: React.ReactNode
}

function getGamesColumns(
  t: (key: string) => string,
  goToReviews: () => void,
) {
  return [
    { key: "title" as const, label: t("games.tableHeaders.title") },
    {
      key: "description" as const,
      label: t("games.tableHeaders.description"),
      cellClassName:
        "min-w-0 max-w-[11rem] sm:max-w-[15rem] md:max-w-[18rem] whitespace-normal align-top",
      render: (row: GameRow) => (
        <span
          className="block w-full min-w-0 wrap-break-word"
          title={row.description}
        >
          {truncateText(row.description, DESCRIPTION_MAX_CHARS)}
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
            <a
              href={row.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                showToast({
                  text: t("common.leaveReviewAfterDownload"),
                  action: {
                    label: t("common.addReview"),
                    onClick: goToReviews,
                  },
                })
              }
            >
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
  const router = useRouter()
  const goToReviews = () => router.push(DASHBOARD_REVIEWS_HREF)
  return (
    <CommonTable
      columns={getGamesColumns(t, goToReviews)}
      data={data}
      pageSize={10}
      rowEntranceAnimation
    />
  )
}
