"use client"

import * as React from "react"
import { AlertCircle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export interface ErrorStateProps {
  title?: string
  message?: string
  error?: Error | { message?: string; digest?: string }
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this content.",
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <div
      data-slot="error-state"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-rose-500/20 rounded-xl bg-rose-500/5 py-12 dark:border-rose-500/10 dark:bg-rose-500/2",
        className
      )}
    >
      {/* Error Icon Frame */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 select-none pointer-events-none mb-4 dark:bg-rose-500/20 dark:text-rose-400">
        <AlertCircle className="h-6 w-6" />
      </div>

      {/* Title & Description */}
      <h3 className="text-base font-semibold text-rose-950 tracking-tight dark:text-rose-200 select-none">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-rose-800/80 leading-normal max-w-sm dark:text-rose-300/80">
        {message}
      </p>

      {/* Developer Log context */}
      {isDev && error && (
        <div className="mt-4 w-full max-w-md overflow-x-auto rounded-lg bg-zinc-950 p-3 text-left font-mono text-[0.8rem] text-zinc-400 border border-zinc-800">
          <p className="font-semibold text-rose-400">Developer Log:</p>
          <p className="mt-1 whitespace-pre-wrap">{error.message || "Unknown error details"}</p>
          {typeof error === "object" && "digest" in error && error.digest && (
            <p className="mt-1 text-[0.75rem] text-zinc-500">Digest: {error.digest}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="destructive"
            className="gap-1.5 px-4 font-medium"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        )}

        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "gap-1.5 px-4 font-medium border-border hover:bg-muted dark:border-input dark:hover:bg-input/50"
          )}
        >
          <Home className="h-4 w-4 text-muted-foreground" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
