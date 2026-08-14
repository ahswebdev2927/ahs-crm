import * as React from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-background/25 py-12 dark:border-input/10",
        className
      )}
    >
      {/* Icon Frame */}
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground select-none pointer-events-none mb-4 dark:bg-zinc-900/50">
          <Icon className="h-6 w-6" />
        </div>
      )}

      {/* Title & Description */}
      <h3 className="text-base font-semibold text-foreground tracking-tight select-none">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground leading-normal max-w-sm">
        {description}
      </p>

      {/* Call to Action */}
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            onClick={onAction}
            className="gap-1.5 px-4 font-medium"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
