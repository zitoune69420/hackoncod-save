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
          {row.link ? (
            <Button size="sm" variant="default" asChild>
              <a href={row.link} target="_blank">
                {t("cheats.download")}
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="default" disabled>
              {t("cheats.download")}
            </Button>
          )}
          <Button size="sm" variant="outline">
            {t("cheats.report")}
          </Button>
        </div>
      ),
    },
  ];
}

const GAMES = [
  {
    label: "Call of Duty: Black Ops",
    icon: "cod-bo1.png",
    value: "cod-bo1",
    pinned: false,
  },
  {
    label: "Call of Duty: Black Ops 2",
    icon: "cod-bo2.png",
    value: "cod-bo2",
    pinned: false,
  },
  {
    label: "Call of Duty: Black Ops 3",
    icon: "cod-bo3.png",
    value: "cod-bo3",
    pinned: true,
  },
  {
    label: "Call of Duty: Black Ops 4",
    icon: "cod-bo4.png",
    value: "cod-bo4",
    pinned: false,
  },
  {
    label: "Call of Duty: Black Ops Cold War",
    icon: "cod-bocw.png",
    value: "cod-bocw",
    pinned: true,
  },
  {
    label: "Call of Duty: Ghosts",
    icon: "cod-ghosts.png",
    value: "cod-ghosts",
    pinned: false,
  },
  {
    label: "Call of Duty: Infinite Warfare",
    icon: "cod-iw.png",
    value: "cod-iw",
    pinned: true,
  },
  {
    label: "Call of Duty 4: Modern Warfare",
    icon: "cod4.png",
    value: "cod4",
    pinned: false,
  },
  {
    label: "Call of Duty: Modern Warfare 2",
    icon: "cod-mw2.png",
    value: "cod-mw2",
    pinned: false,
  },
  {
    label: "Call of Duty: Modern Warfare 3",
    icon: "cod-mw3.png",
    value: "cod-mw3",
    pinned: false,
  },
  {
    label: "Call of Duty: World at War",
    icon: "cod-waw.png",
    value: "cod-waw",
    pinned: false,
  },
  {
    label: "Call of Duty: World War 2",
    icon: "cod-ww2.png",
    value: "cod-ww2",
    pinned: false,
  },
];

export function CheatsToolbar({
  selectedGame,
  onSelectGameAction,
}: {
  selectedGame: string;
  onSelectGameAction: (game: string) => void;
}) {
  const pinned = GAMES.filter((g) => g.pinned);
  const others = GAMES.filter((g) => !g.pinned);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pinned.map((game) => (
        <Button
          key={game.value}
          variant={selectedGame === game.label ? "default" : "outline"}
          onClick={() => onSelectGameAction(game.label)}
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
        <DropdownMenuTrigger asChild>
          <Button variant="outline">...</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-80 w-68 overflow-y-auto">
          {others.map((game) => (
            <DropdownMenuItem
              key={game.value}
              onClick={() => onSelectGameAction(game.label)}
            >
              <Image
                src={`/games/icons/${game.icon}`}
                alt={game.label}
                width={20}
                height={20}
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
    <CommonTable columns={getCheatsColumns(t)} data={data} pageSize={10} />
  );
}
