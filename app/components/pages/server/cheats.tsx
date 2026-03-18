"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "@/app/components/i18n-provider"
import { Progress } from "@/components/ui/progress"
import { SearchBar } from "@/components/commons/search-bar"
import { CheatsTable, CheatsToolbar, type CheatRow } from "@/app/components/pages/client/cheats"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Refresh01Icon } from "@hugeicons/core-free-icons"
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache"
import { showToast } from "@/components/commons/toasts"

function fetchCheats(game: string): Promise<CheatRow[]> {
  return fetch(`/api/cheats?game=${encodeURIComponent(game)}`).then((res) => res.json())
}

export function CheatsPage() {
  const { t } = useTranslations()
  const [data, setData] = useState<CheatRow[]>([])
  const [selectedGame, setSelectedGame] = useState<string>("Call of Duty: Black Ops 3")
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const q = searchQuery.toLowerCase()
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.mode.toLowerCase().includes(q) ||
        row.extension.toLowerCase().includes(q) ||
        row.client.toLowerCase().includes(q)
    )
  }, [data, searchQuery])

  const loadData = useCallback((game: string, skipCache = false) => {
    const key = cacheKey("cheats", game)
    if (!skipCache) {
      const cached = getCached<CheatRow[]>(key)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }
    setLoading(true)
    setProgress(0)
    fetchCheats(game)
      .then((json) => {
        setCached(key, json)
        setData(json)
        setProgress(100)
      })
      .catch(() => {
        setProgress(0)
        showToast({ text: t("cheats.toasts.errorLoading"), variant: "error" })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData(selectedGame)
  }, [selectedGame, loadData])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10))
    }, 200)
    return () => clearInterval(interval)
  }, [loading])

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("cheats", selectedGame))
    loadData(selectedGame, true)
  }, [selectedGame, loadData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("cheats.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("cheats.description")}</p>
      </div>
      <div className="flex justify-between">
        <CheatsToolbar selectedGame={selectedGame} onSelectGame={setSelectedGame} />
        <div className="flex">
          <Button variant="outline" onClick={handleRefresh} className="mr-2">
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("cheats.refresh")}
          </Button>
          <SearchBar value={search} onChange={setSearch} onSearch={() => setSearchQuery(search)} placeholder={t("cheats.searchPlaceholder")} />
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <CheatsTable data={filteredData} />
      )}
    </div>
  )
}
