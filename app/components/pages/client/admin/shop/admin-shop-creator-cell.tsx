"use client";

import Image from "next/image";
import type { ShopProductCreator } from "@/lib/supabase/shop-types";

type Props = {
  creator: ShopProductCreator | null;
  rawId: string | null;
  unknownLabel: string;
};

export function AdminShopCreatorCell({ creator, rawId, unknownLabel }: Props) {
  const name = creator?.displayName?.trim() || null;
  const avatar = creator?.avatarUrl?.trim() || null;
  const raw = rawId?.trim() || "";

  if (!raw) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (!name && !avatar) {
    return (
      <div className="min-w-0 max-w-[14rem]">
        <span className="block font-mono text-[11px] text-muted-foreground break-all">
          {raw.length > 24 ? `${raw.slice(0, 20)}…` : raw}
        </span>
        <span className="text-[11px] text-muted-foreground/80">{unknownLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-[14rem] items-center gap-2">
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="size-8 shrink-0 rounded-full bg-muted" aria-hidden />
      )}
      <span className="min-w-0 truncate text-sm font-medium">{name ?? unknownLabel}</span>
    </div>
  );
}
