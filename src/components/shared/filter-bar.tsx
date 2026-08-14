import * as React from "react"
import { RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface FilterBarProps {
  children?: React.ReactNode
  onReset?: () => void
  showReset?: boolean
  className?: string
}

export function FilterBar({
  children,
  onReset,
  showReset = false,
  className,
}: FilterBarProps) {
  return (
    <div
      data-slot="filter-bar"
      className={cn(
        "flex flex-col gap-3 px-6 py-4 border-b border-border bg-background/30 backdrop-blur-xs md:flex-row md:items-center md:justify-between dark:border-input/10",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center min-w-0">
        {children}
      </div>

      {showReset && onReset && (
        <div className="flex shrink-0 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 px-3 border-border hover:bg-muted dark:border-input dark:hover:bg-input/50"
          >
            <RotateCcw className="size-3 text-muted-foreground" />
            <span>Reset Filters</span>
          </Button>
        </div>
      )}
    </div>
  )
}
