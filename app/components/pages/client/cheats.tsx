"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommonTable } from "@/components/commons/table/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { useTranslations } from "@/app/components/i18n-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COD_GAMES } from "@/lib/cod-games";
import { CheatDownloadButton } from "@/app/components/commons/exclusive-cheat-download-button";
import { ReportCheatDialog } from "@/app/components/pages/client/cheats/report-cheat-dialog";
import { cn } from "@/lib/utils";

export type CheatRow = {
  id: string;
  name: string;
  mode: string;
  extension: string;
  crack: boolean;
  client: string;
  hasFile: boolean;
  action?: React.ReactNode;
};

function getCheatsColumns(
  t: (key: string, params?: Record<string, string | number>) => string,
  onReport: (row: CheatRow) => void,
) {
  return [
    { key: "name" as const, label: t("cheats.tableHeaders.name") },
    { key: "mode" as const, label: t("cheats.tableHeaders.mode") },
    { key: "extension" as const, label: t("cheats.tableHeaders.extension") },
    {
      key: "crack" as const,
      label: t("cheats.tableHeaders.crack"),
      render: (row: CheatRow) =>
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
      label: t("cheats.tableHeaders.client"),
      render: (row: CheatRow) =>
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
      key: "action" as const,
      label: t("cheats.tableHeaders.action"),
      render: (row: CheatRow) => (
        <div className="flex gap-2">
          <CheatDownloadButton
            cheatId={row.id}
            hasFile={row.hasFile}
            channel="public"
            label={t("cheats.download")}
            reviewToastText={t("common.leaveReviewAfterDownload")}
            size="default"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onReport(row)}
          >
            {t("cheats.report")}
          </Button>
        </div>
      ),
    },
  ];
}

export function CheatsToolbar({
  selectedGame,
  onSelectGameAction,
}: {
  selectedGame: string;
  onSelectGameAction: (game: string) => void;
}) {
  const pinned = COD_GAMES.filter((g) => g.pinned);
  const others = COD_GAMES.filter((g) => !g.pinned);
  const { t } = useTranslations();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pinned.map((game) => (
        <Button
          key={game.value}
          variant={selectedGame === game.label ? "default" : "outline"}
          onClick={() => onSelectGameAction(game.label)}
          className="px-3 gap-2"
          size="lg"
        >
          <Image
            src={`/games/icons/${game.icon}`}
            alt={game.label}
            width={20}
            height={20}
            className="rounded-[5px]"
          />
          {game.label}
        </Button>
      ))}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="px-3 gap-2" size="lg">
                ...
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("common.more")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="max-h-80 w-76 overflow-y-auto">
          <DropdownMenuRadioGroup
            value={
              others.some((g) => g.label === selectedGame)
                ? selectedGame
                : undefined
            }
            onValueChange={(label) => {
              if (label) onSelectGameAction(label);
            }}
          >
            {others.map((game) => (
              <DropdownMenuRadioItem
                key={game.value}
                value={game.label}
                className={cn(
                  "gap-2 pl-2 pr-8",
                  "data-[state=checked]:bg-primary/15 data-[state=checked]:font-medium data-[state=checked]:text-foreground",
                  "dark:data-[state=checked]:bg-primary/25",
                  "data-[state=checked]:focus:bg-primary/20 data-[state=checked]:data-highlighted:bg-primary/20",
                )}
              >
                <Image
                  src={`/games/icons/${game.icon}`}
                  alt={game.label}
                  width={24}
                  height={24}
                  className="shrink-0 rounded-[5px]"
                />
                {game.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CheatsTable({
  data = [],
  gameTitle,
}: {
  data?: CheatRow[];
  gameTitle: string;
}) {
  const { t } = useTranslations();
  const [reportTarget, setReportTarget] = useState<CheatRow | null>(null);

  return (
    <>
      <ReportCheatDialog
        cheatId={reportTarget?.id ?? ""}
        cheatName={reportTarget?.name ?? ""}
        gameTitle={gameTitle}
        open={reportTarget !== null}
        onOpenChange={(next) => {
          if (!next) setReportTarget(null);
        }}
      />
      <CommonTable
        columns={getCheatsColumns(t, (row) => setReportTarget(row))}
        data={data}
        pageSize={10}
        rowEntranceAnimation
      />
    </>
  );
}
