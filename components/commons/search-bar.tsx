"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Rechercher...",
}: {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
}) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
      />
      <Button size="icon" onClick={onSearch}>
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
