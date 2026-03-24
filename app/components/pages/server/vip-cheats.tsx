"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "@/app/components/i18n-provider"
import { Progress } from "@/components/ui/progress"
import { SearchBar } from "@/components/commons/search-bar"
import { VipCheatsTable, type VipCheatRow } from "@/app/components/pages/client/vip-cheats"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Refresh01Icon, CrownIcon } from "@hugeicons/core-free-icons"
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache"
import { showToast } from "@/components/commons/toasts"
import { authClient } from "@/lib/auth-client"
import { HowToVipDialog } from "@/app/components/dialogs/how-to-vip"

function fetchVipCheats(): Promise<VipCheatRow[]> {
  return fetch("/api/vip-cheats").then((res) => res.json())
}

export function VipCheatsPage() {
  const { t } = useTranslations()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const user = session?.user

  const [data, setData] = useState<VipCheatRow[]>([])
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [howToVipOpen, setHowToVipOpen] = useState(false)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const q = searchQuery.toLowerCase()
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.game.toLowerCase().includes(q) ||
        row.mode.toLowerCase().includes(q) ||
        row.extension.toLowerCase().includes(q),
    )
  }, [data, searchQuery])

  const loadData = useCallback((skipCache = false) => {
    const key = cacheKey("vip-cheats")
    if (!skipCache) {
      const cached = getCached<VipCheatRow[]>(key)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }
    setLoading(true)
    setProgress(0)
    fetchVipCheats()
      .then((json) => {
        setCached(key, json)
        setData(json)
        setProgress(100)
      })
      .catch(() => {
        setProgress(0)
        showToast({ text: t("vip.toasts.errorLoading"), variant: "error" })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10))
    }, 200)
    return () => clearInterval(interval)
  }, [loading])

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("vip-cheats"))
    loadData(true)
    showToast({ text: t("vip.toasts.cacheCleared"), variant: "success" })
  }, [loadData, t])

  if (sessionPending) {
    return (
      <div className="flex min-h-16 items-center justify-center">
        <Progress value={progress} className="h-1 w-48" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t("vip.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("vip.description")}</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center space-y-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={CrownIcon} className="size-8 text-primary" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t("vip.accessRequired")}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("vip.accessRequiredDescription")}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {t("vip.accessRequiredNote")}
              </p>
            </div>
            <Button onClick={() => setHowToVipOpen(true)}>
              <HugeiconsIcon icon={CrownIcon} strokeWidth={2} />
              {t("vip.howTo.menuLabel")}
            </Button>
          </div>
        </div>
        <HowToVipDialog open={howToVipOpen} onOpenChange={setHowToVipOpen} />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("vip.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("vip.description")}</p>
      </div>
      <div className="flex justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          onSearch={() => setSearchQuery(search)}
          placeholder={t("vip.searchPlaceholder")}
        />
        <Button variant="outline" onClick={handleRefresh} className="ml-2">
          <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
          {t("vip.refresh")}
        </Button>
      </div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <VipCheatsTable data={filteredData} />
      )}
    </div>
  )
}
