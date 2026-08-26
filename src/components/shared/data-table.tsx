"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { Pagination } from "@/components/shared/pagination"

export interface ColumnDef<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  align?: "left" | "center" | "right"
  className?: string
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading?: boolean
  // Empty state configurations
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ComponentType<{ className?: string }>
  emptyActionLabel?: string
  onEmptyAction?: () => void
  // Pagination configurations
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  // Callbacks & styling
  onRowClick?: (row: T) => void
  className?: string
  rowClassName?: string
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display in this list.",
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  currentPage,
  totalPages,
  onPageChange,
  onRowClick,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const showPagination =
    currentPage !== undefined &&
    totalPages !== undefined &&
    totalPages > 1 &&
    onPageChange !== undefined

  return (
    <div
      data-slot="data-table-container"
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-background shadow-xs dark:border-input/10",
        className
      )}
    >
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 dark:bg-zinc-900/30">
              {columns.map((col, idx) => {
                const alignClass =
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                    ? "text-right"
                    : "text-left"

                return (
                  <TableHead
                    key={col.key || idx}
                    className={cn(
                      "h-9 sm:h-10 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none py-2.5 px-4 sm:px-5 xl:px-6",
                      alignClass,
                      col.className
                    )}
                  >
                    {col.header}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0 border-none">
                  <LoadingState type="table" count={5} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8 border-none">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    icon={emptyIcon}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    "transition-colors hover:bg-muted/30 dark:hover:bg-zinc-900/30",
                    onRowClick && "cursor-pointer",
                    rowClassName
                  )}
                >
                  {columns.map((col, colIdx) => {
                    const alignClass =
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : "text-left"

                    return (
                      <TableCell
                        key={col.key || colIdx}
                        className={cn(
                          "py-2.5 sm:py-3 px-4 sm:px-5 xl:px-6 text-xs sm:text-sm text-foreground",
                          alignClass,
                          col.className
                        )}
                      >
                        {col.render ? col.render(row, rowIdx) : (row[col.key as keyof T] as React.ReactNode)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
