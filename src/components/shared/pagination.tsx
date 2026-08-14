"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const range = 1 // adjacent pages around active page

    pages.push(1)

    if (currentPage - range > 2) {
      pages.push("...")
    }

    const start = Math.max(2, currentPage - range)
    const end = Math.min(totalPages - 1, currentPage + range)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage + range < totalPages - 1) {
      pages.push("...")
    }

    pages.push(totalPages)

    return pages
  }

  return (
    <nav
      data-slot="pagination"
      aria-label="Pagination"
      className={cn(
        "flex items-center justify-between px-6 py-4 border-t border-border bg-background/30 select-none dark:border-input/10",
        className
      )}
    >
      {/* Mobile view info */}
      <div className="flex sm:hidden text-xs text-muted-foreground font-medium">
        Page {currentPage} of {totalPages}
      </div>

      {/* Desktop view info */}
      <div className="hidden sm:flex text-sm text-muted-foreground font-medium">
        Showing page <span className="text-foreground font-semibold px-1">{currentPage}</span> of{" "}
        <span className="text-foreground font-semibold px-1">{totalPages}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* First page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="hidden sm:inline-flex"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Numbered page buttons (Desktop) */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="flex size-7 items-center justify-center text-sm text-muted-foreground select-none pointer-events-none"
                >
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <Button
                key={`page-${pageNum}`}
                variant={isActive ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(isActive && "pointer-events-none font-semibold")}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          className="hidden sm:inline-flex"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
