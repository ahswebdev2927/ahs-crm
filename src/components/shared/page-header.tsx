import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-4 border-b border-border bg-background/50 px-6 py-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between dark:border-input/10",
        className
      )}
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground select-none mb-1"
          >
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="size-3 shrink-0 opacity-60" />}
                  {isLast || !item.href ? (
                    <span className={cn(isLast && "text-foreground font-semibold truncate")}>
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="hover:text-foreground transition-colors truncate"
                    >
                      {item.label}
                    </Link>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        )}

        {/* Title & Description */}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl truncate">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-normal max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  )
}
