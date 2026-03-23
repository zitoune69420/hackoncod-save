"use client"

import * as React from "react"
import { Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import type { CommonTableProps } from "./types"

function CommonTableFallback() {
  return (
    <div
      className="h-40 w-full animate-pulse rounded-lg bg-muted/50"
      aria-hidden
    />
  )
}

function CommonTableInner<T>({ columns, data, pageSize = 10 }: CommonTableProps<T>) {
  const { t } = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [page, setPage] = React.useState(1)
  const totalPages = Math.ceil(data.length / pageSize) || 1
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize)

  const prevDataLengthRef = React.useRef<number | null>(null)

  /** Synchronise l’état depuis `?pagination=` (uniquement chiffres). Sinon ne rien faire. */
  React.useEffect(() => {
    const raw = searchParams.get("pagination")
    const parsed = parsePaginationQueryParam(raw)
    if (parsed === null) return
    const clamped = Math.max(1, Math.min(parsed, totalPages))
    setPage(clamped)
    if (String(clamped) !== raw) {
      const params = new URLSearchParams(searchParams.toString())
      if (totalPages <= 1) params.delete("pagination")
      else params.set("pagination", String(clamped))
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [searchParams, totalPages, pathname, router])

  /** Réinitialise la page quand les données changent (pas au premier montage). */
  React.useEffect(() => {
    if (prevDataLengthRef.current === null) {
      prevDataLengthRef.current = data.length
      return
    }
    if (prevDataLengthRef.current === data.length) return
    prevDataLengthRef.current = data.length

    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    if (params.has("pagination")) {
      params.delete("pagination")
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [data.length, pathname, router, searchParams])

  const setPageAndUrl = React.useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(totalPages, next))
      setPage(clamped)
      const params = new URLSearchParams(searchParams.toString())
      if (totalPages <= 1) {
        params.delete("pagination")
      } else {
        params.set("pagination", String(clamped))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams, totalPages],
  )

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, i) => (
            <TableRow key={(row as { id?: string }).id ?? i}>
              {columns.map((col) => (
                <TableCell key={String(col.key)}>
                  {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.length > pageSize && (
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
            {(() => {
              const getPageNumbers = () => {
                if (totalPages <= 7) {
                  return Array.from({ length: totalPages }, (_, i) => i + 1)
                }
                const pages: (number | "ellipsis")[] = []
                if (page > 3) pages.push(1, "ellipsis")
                const start = Math.max(1, page - 2)
                const end = Math.min(totalPages, page + 2)
                for (let p = start; p <= end; p++) pages.push(p)
                if (page < totalPages - 2) pages.push("ellipsis", totalPages)
                return pages
              }
              return getPageNumbers().map((p, i) =>
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
              )
            })()}
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
