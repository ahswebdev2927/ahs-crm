import * as React from "react"
import { cn } from "@/lib/utils"

export type CRMStatus =
  // User status
  | "active"
  | "inactive"
  | "suspended"
  // Lead Priority
  | "high"
  | "medium"
  | "low"
  | "hot"
  | "warm"
  | "cold"
  // Lead / Pipeline stages
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"
  // Payment / Invoice statuses
  | "paid"
  | "partial"
  | "pending"
  | "overdue"
  | "draft"
  | "sent"
  | "void"
  // Tasks
  | "in_progress"
  | "completed"
  | "deferred"
  | string

export interface StatusBadgeProps {
  status: CRMStatus
  className?: string
}

interface BadgeConfig {
  label: string
  bgClass: string
  textClass: string
  dotClass: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normStatus = status.toLowerCase().replace(/[\s_-]+/g, "")

  let config: BadgeConfig = {
    label: status,
    bgClass: "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800",
    textClass: "text-zinc-700 dark:text-zinc-300",
    dotClass: "bg-zinc-400 dark:bg-zinc-500",
  }

  // Define styling mappings for various CRM statuses
  switch (normStatus) {
    // Green (Success / High Activity)
    case "active":
    case "won":
    case "paid":
    case "completed":
      config = {
        label: status === "in_progress" ? "In Progress" : status,
        bgClass: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30",
        textClass: "text-emerald-700 dark:text-emerald-400",
        dotClass: "bg-emerald-500",
      }
      break

    // Yellow / Orange (Pending / Progress / Caution)
    case "pending":
    case "partial":
    case "sent":
    case "inprogress":
    case "warm":
    case "medium":
      config = {
        label: status === "inprogress" ? "In Progress" : status,
        bgClass: "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30",
        textClass: "text-amber-700 dark:text-amber-400",
        dotClass: "bg-amber-500",
      }
      break

    // Red / High Priority (Danger / Immediate Attention)
    case "suspended":
    case "lost":
    case "overdue":
    case "high":
    case "hot":
      config = {
        label: status,
        bgClass: "bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30",
        textClass: "text-rose-700 dark:text-rose-400",
        dotClass: "bg-rose-500",
      }
      break

    // Blue (Workflows / Progress Pipelines)
    case "new":
    case "contacted":
    case "qualified":
    case "proposal":
    case "negotiation":
      config = {
        label: status,
        bgClass: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30",
        textClass: "text-sky-700 dark:text-sky-400",
        dotClass: "bg-sky-500",
      }
      break

    // Gray / Muted (Inactive / Static states)
    case "inactive":
    case "draft":
    case "void":
    case "low":
    case "cold":
    case "deferred":
      config = {
        label: status,
        bgClass: "bg-zinc-500/10 border-zinc-500/20 dark:bg-zinc-500/15 dark:border-zinc-500/30",
        textClass: "text-zinc-600 dark:text-zinc-400",
        dotClass: "bg-zinc-400 dark:bg-zinc-500",
      }
      break
  }

  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold select-none capitalize leading-none tracking-wide transition-all",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)} aria-hidden="true" />
      {config.label}
    </span>
  )
}
