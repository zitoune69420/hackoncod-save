"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        className="h-9 min-w-72 flex-1 px-3 text-base md:min-w-80 md:text-base"
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
