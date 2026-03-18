"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"
import { useTranslations } from "@/app/components/i18n-provider"
import { injectors, tools } from "@/data/misc"
import Image from "next/image"

function ToolCard({ title, link, image }: { title: string; link: string; image?: string }) {
  const { t } = useTranslations()
  return (
    <Card className="flex flex-col transition-colors hover:bg-muted/50 overflow-hidden pt-0">
      {image && (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-xl bg-muted">
          <Image src={image} alt={title} className="object-fit w-full h-full" width={320} height={180} priority />
        </div>
      )}
      <CardHeader className="flex-1">
        <span className="font-medium">{title}</span>
      </CardHeader>
      <CardContent className="flex items-center justify-end pt-0">
        <a
          href={link}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <HugeiconsIcon icon={Download01Icon} className="size-4" strokeWidth={2} />
          {t("misc.clickToDownload")} {t("misc.download")}
        </a>
      </CardContent>
    </Card>
  )
}

export function MiscPage() {
  const { t } = useTranslations()
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("misc.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("misc.description")}</p>
      </div>

      <section className="space-y-4 max-w-6xl w-full">
        <h2 className="text-lg font-medium">{t("misc.injectors")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {injectors.map((item) => (
            <ToolCard key={item.key} title={t(`misc.items.${item.key}`)} link={item.link} image={item.image} />
          ))}
        </div>
      </section>

      <section className="space-y-4 max-w-6xl w-full">
        <h2 className="text-lg font-medium">{t("misc.tools")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((item) => (
            <ToolCard key={item.key} title={t(`misc.items.${item.key}`)} link={item.link} image={item.image} />
          ))}
        </div>
      </section>
    </div>
  )
}
