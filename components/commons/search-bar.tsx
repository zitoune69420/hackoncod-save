"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  /** Par défaut largeur max réduite ; passez p.ex. `max-w-md` ou `max-w-none` pour l’admin. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full max-w-xs gap-2 sm:max-w-sm",
        className,
      )}
    >
      <Input
        className="h-9 min-w-0 flex-1 px-3 text-base md:text-base"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
      />
      <Button size="icon-lg" className="shrink-0" onClick={onSearch}>
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </Button>
    </div>
  );
}
