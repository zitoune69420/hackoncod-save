"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { SearchBar } from "@/components/commons/search-bar"
import { GamesTable, type GameRow } from "@/app/components/pages/client/games"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Refresh01Icon } from "@hugeicons/core-free-icons"
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache"

function fetchGames(): Promise<GameRow[]> {
  return fetch("/api/games").then((res) => res.json())
}

export function GamesPage() {
  const [data, setData] = useState<GameRow[]>([])
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const q = searchQuery.toLowerCase()
    return data.filter(
      (row) =>
        row.title.toLowerCase().includes(q) || row.description.toLowerCase().includes(q)
    )
  }, [data, searchQuery])

  const loadData = useCallback((skipCache = false) => {
    const key = cacheKey("games")
    if (!skipCache) {
      const cached = getCached<GameRow[]>(key)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }
    setLoading(true)
    setProgress(0)
    fetchGames()
      .then((json) => {
        setCached(key, json)
        setData(json)
        setProgress(100)
      })
      .catch(() => setProgress(0))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10))
    }, 200)
    return () => clearInterval(interval)
  }, [loading])

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("games"))
    loadData(true)
  }, [loadData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Games</h1>
        <p className="text-sm text-muted-foreground">Find your favorite games</p>
      </div>
      <div className="flex justify-between">
        <SearchBar value={search} onChange={setSearch} onSearch={() => setSearchQuery(search)} placeholder="Name, mode, extension..." />

        <Button variant="outline" onClick={handleRefresh} className="mr-2">
          <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
          Actualiser
        </Button>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <GamesTable data={filteredData} />
      )}
    </div>
  )
}
