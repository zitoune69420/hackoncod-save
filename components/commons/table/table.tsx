"use client"

import * as React from "react"
import { Suspense } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useTranslations } from "@/app/components/i18n-provider"
import { parsePaginationQueryParam } from "@/lib/pagination-url"
import { cn } from "@/lib/utils"
import type { CommonTableProps } from "./types"

/** Au-delà de 7 pages : 1, 2, …, page courante (si besoin), …, dernière page. */
function getPaginationItems(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const set = new Set<number>([1, 2, totalPages])
  if (page > 2 && page < totalPages) {
    set.add(page)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | "ellipsis")[] = []
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!
    if (i > 0 && n - sorted[i - 1]! > 1) {
      out.push("ellipsis")
    }
    out.push(n)
  }
  return out
}

function CommonTableFallback() {
  return (
    <div
      className="h-40 w-full animate-pulse rounded-lg bg-muted/50"
      aria-hidden
    />
  )
}

const tableRowClassName =
  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"

const rowEntranceContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
}

const rowEntranceItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 24,
      mass: 0.85,
    },
  },
}

function CommonTableInner<T>({
  columns,
  data,
  pageSize = 10,
  rowEntranceAnimation = false,
}: CommonTableProps<T>) {
  const { t } = useTranslations()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reduceMotion = useReducedMotion()

  const safeData: T[] = Array.isArray(data) ? data : []
  const totalPages = Math.ceil(safeData.length / pageSize) || 1

  /**
   * Page = dérivée de l'URL. Évite la race condition entre le clic local
   * (`setPage`) et la sync URL→state via useEffect, qui provoquait :
   *   1. flash sur l'ancienne page après remount (Suspense / force-dynamic)
   *   2. animation d'entrée qui se déclenchait deux fois.
   * Source de vérité unique = `?pagination=`.
   */
  const rawPagination = searchParams.get("pagination")
  const parsedPagination = parsePaginationQueryParam(rawPagination)
  const page =
    parsedPagination === null
      ? 1
      : Math.max(1, Math.min(parsedPagination, totalPages))

  const paginatedData = safeData.slice((page - 1) * pageSize, page * pageSize)

  const paginatedRowsKey = React.useMemo(
    () =>
      `${page}:${paginatedData
        .map((row) => (row as { id?: string }).id ?? "")
        .join("|")}`,
    [paginatedData, page],
  )

  const useRowEntrance = rowEntranceAnimation && !reduceMotion

  /**
   * Mise à jour shallow de l'URL : la pagination est un état purement client.
   * `router.replace` déclencherait un re-render RSC (routes force-dynamic) et,
   * sur /dashboard, un remount complet de la zone contenu (key ErrorHandler).
   */
  const replaceUrlShallow = React.useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString()
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname],
  )

  const prevDataLengthRef = React.useRef<number | null>(null)

  /**
   * Quand la dataset change de taille (parent refresh / filtre) : nettoyer le param URL.
   * `page` se reclampe automatiquement via le calcul dérivé ci-dessus.
   */
  React.useEffect(() => {
    if (prevDataLengthRef.current === null) {
      prevDataLengthRef.current = safeData.length
      return
    }
    if (prevDataLengthRef.current === safeData.length) return
    prevDataLengthRef.current = safeData.length

    const params = new URLSearchParams(searchParams.toString())
    if (params.has("pagination")) {
      params.delete("pagination")
      replaceUrlShallow(params)
    }
  }, [safeData.length, replaceUrlShallow, searchParams])

  /**
   * Si l'URL pointe vers une page hors limites (totalPages a chuté), corrige le param.
   * Ne touche au router que si vraiment nécessaire (évite re-renders en cascade).
   */
  React.useEffect(() => {
    if (parsedPagination === null) return
    if (parsedPagination >= 1 && parsedPagination <= totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    if (totalPages <= 1) params.delete("pagination")
    else params.set("pagination", String(Math.min(parsedPagination, totalPages)))
    replaceUrlShallow(params)
  }, [parsedPagination, totalPages, replaceUrlShallow, searchParams])

  const setPageAndUrl = React.useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(totalPages, next))
      const params = new URLSearchParams(searchParams.toString())
      if (totalPages <= 1 || clamped === 1) {
        params.delete("pagination")
      } else {
        params.set("pagination", String(clamped))
      }
      replaceUrlShallow(params)
    },
    [replaceUrlShallow, searchParams, totalPages],
  )

  return (
    <div className="space-y-4 [&_button]:cursor-pointer [&_[data-slot=pagination-link]]:cursor-pointer">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {useRowEntrance ? (
          <motion.tbody
            key={paginatedRowsKey}
            data-slot="table-body"
            className="[&_tr:last-child]:border-0"
            variants={rowEntranceContainer}
            initial="hidden"
            animate="show"
          >
            {paginatedData.map((row, i) => (
              <motion.tr
                key={(row as { id?: string }).id ?? i}
                variants={rowEntranceItem}
                className={cn(tableRowClassName)}
              >
                {columns.map((col) => (
                  <TableCell
                    key={String(col.key)}
                    className={cn(col.cellClassName)}
                  >
                    {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </motion.tbody>
        ) : (
          <TableBody>
            {paginatedData.map((row, i) => (
              <TableRow key={(row as { id?: string }).id ?? i}>
                {columns.map((col) => (
                  <TableCell
                    key={String(col.key)}
                    className={cn(col.cellClassName)}
                  >
                    {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        )}
      </Table>

      {safeData.length > pageSize && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text={t("common.previous")}
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPageAndUrl(page - 1)
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {getPaginationItems(page, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={page === p}
                    onClick={(e) => {
                      e.preventDefault()
                      setPageAndUrl(p)
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                text={t("common.next")}
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) setPageAndUrl(page + 1)
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

export function CommonTable<T>(props: CommonTableProps<T>) {
  return (
    <Suspense fallback={<CommonTableFallback />}>
      <CommonTableInner {...props} />
    </Suspense>
  )
}
