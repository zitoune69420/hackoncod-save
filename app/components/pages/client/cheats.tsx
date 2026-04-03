"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export type CheatRow = {
  id: string;
  name: string;
  mode: string;
  extension: string;
  crack: boolean;
  client: string;
  link: string;
  action?: React.ReactNode;
};

function getCheatsColumns(t: (key: string) => string) {
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
            link={row.link}
            channel="public"
            label={t("cheats.download")}
            reviewToastText={t("common.leaveReviewAfterDownload")}
            size="default"
          />
          <Button variant="outline">
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
        <DropdownMenuContent className="max-h-80 w-72 overflow-y-auto">
          {others.map((game) => (
            <DropdownMenuItem
              key={game.value}
              onClick={() => onSelectGameAction(game.label)}
            >
              <Image
                src={`/games/icons/${game.icon}`}
                alt={game.label}
                width={24}
                height={24}
                className="mr-2 rounded-[5px]"
              />
              {game.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CheatsTable({ data = [] }: { data?: CheatRow[] }) {
  const { t } = useTranslations();
  return (
    <CommonTable
      columns={getCheatsColumns(t)}
      data={data}
      pageSize={10}
      rowEntranceAnimation
    />
  );
}
