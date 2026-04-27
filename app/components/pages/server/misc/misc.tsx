"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"
import { motion, useReducedMotion } from "framer-motion"
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
  const reduceMotion = useReducedMotion()

  const blockIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.18, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  }

  const cardIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.16, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 380, damping: 28 },
    },
  }

  const sectionStagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.04 : 0.08,
      },
    },
  }

  const gridStagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.04 : 0.06,
        delayChildren: reduceMotion ? 0 : 0.03,
      },
    },
  }

  const pageStagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.05 : 0.1,
      },
    },
  }

  return (
    <motion.div
      className="space-y-8"
      variants={pageStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={blockIn}>
        <h1 className="text-2xl font-semibold">{t("misc.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("misc.description")}</p>
      </motion.div>

      <motion.section
        className="space-y-4 max-w-6xl w-full"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.h2 variants={blockIn} className="text-lg font-medium">
          {t("misc.injectors")}
        </motion.h2>
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridStagger}
        >
          {injectors.map((item) => (
            <motion.div key={item.key} variants={cardIn} className="min-w-0">
              <ToolCard
                title={t(`misc.items.${item.key}`)}
                link={item.link}
                image={item.image}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="space-y-4 max-w-6xl w-full"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.h2 variants={blockIn} className="text-lg font-medium">
          {t("misc.tools")}
        </motion.h2>
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridStagger}
        >
          {tools.map((item) => (
            <motion.div key={item.key} variants={cardIn} className="min-w-0">
              <ToolCard
                title={t(`misc.items.${item.key}`)}
                link={item.link}
                image={item.image}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
