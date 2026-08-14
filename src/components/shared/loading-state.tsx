import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export interface LoadingStateProps {
  type?: "table" | "form" | "cards" | "spinner"
  count?: number
  className?: string
}

export function LoadingState({
  type = "spinner",
  count = 5,
  className,
}: LoadingStateProps) {
  if (type === "spinner") {
    return (
      <div
        data-slot="loading-spinner"
        className={cn("flex flex-1 items-center justify-center py-12 select-none", className)}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-80" />
      </div>
    )
  }

  if (type === "table") {
    return (
      <div
        data-slot="loading-table"
        className={cn("w-full divide-y divide-border/50 animate-pulse px-6 py-2 select-none dark:divide-input/10", className)}
      >
        {/* Table header skeleton */}
        <div className="flex h-10 items-center gap-4 py-2">
          <div className="h-4 w-1/4 rounded bg-muted/60 dark:bg-zinc-800" />
          <div className="h-4 w-1/4 rounded bg-muted/60 dark:bg-zinc-800" />
          <div className="h-4 w-1/6 rounded bg-muted/60 dark:bg-zinc-800" />
          <div className="ml-auto h-4 w-1/12 rounded bg-muted/60 dark:bg-zinc-800" />
        </div>
        {/* Table row skeletons */}
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex h-12 items-center gap-4 py-3">
            <div className="h-4.5 w-1/3 rounded bg-muted/30 dark:bg-zinc-900" />
            <div className="h-4.5 w-1/4 rounded bg-muted/30 dark:bg-zinc-900" />
            <div className="h-4.5 w-1/6 rounded bg-muted/30 dark:bg-zinc-900" />
            <div className="ml-auto h-5 w-14 rounded-full bg-muted/40 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    )
  }

  if (type === "cards") {
    return (
      <div
        data-slot="loading-cards"
        className={cn("grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse select-none", className)}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-3 rounded-xl border border-border p-4 bg-background dark:border-input/10"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted/40 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted/50 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-muted/30 dark:bg-zinc-900" />
              </div>
            </div>
            <div className="mt-2 space-y-2">
              <div className="h-3.5 w-full rounded bg-muted/20 dark:bg-zinc-900" />
              <div className="h-3.5 w-5/6 rounded bg-muted/20 dark:bg-zinc-900" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="h-5 w-16 rounded-full bg-muted/30 dark:bg-zinc-900" />
              <div className="h-7 w-20 rounded bg-muted/45 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "form") {
    return (
      <div
        data-slot="loading-form"
        className={cn("space-y-5 p-6 animate-pulse select-none", className)}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted/50 dark:bg-zinc-800" />
            <div className="h-8 w-full rounded bg-muted/25 dark:bg-zinc-900" />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-4">
          <div className="h-8 w-20 rounded bg-muted/30 dark:bg-zinc-900" />
          <div className="h-8 w-28 rounded bg-muted/65 dark:bg-zinc-800" />
        </div>
      </div>
    )
  }

  return null
}
