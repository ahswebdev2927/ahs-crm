"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GripVertical, MoreHorizontal, Building2, Phone, Mail, History, ExternalLink, Pencil, Users } from "lucide-react"
import { KanbanCard } from "@/components/shared/kanban"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { LeadItem } from "@/features/leads/types/lead.types"

export interface PipelineLeadCardContentProps {
  lead: LeadItem
  attributes?: Record<string, any>
  listeners?: Record<string, any>
  isDragging?: boolean
  isOverlay?: boolean
  onViewLead?: (lead: LeadItem) => void
  onEdit?: (lead: LeadItem) => void
  onViewHistory?: (lead: LeadItem) => void
  className?: string
}

export function PipelineLeadCardContent({
  lead,
  attributes,
  listeners,
  isDragging = false,
  isOverlay = false,
  onViewLead,
  onEdit,
  onViewHistory,
  className,
}: PipelineLeadCardContentProps) {
  const router = useRouter()

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
          return
        }
        if (onViewLead) {
          onViewLead(lead)
        } else {
          onEdit?.(lead)
        }
      }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-border/80 bg-card p-3.5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs dark:bg-card/90 cursor-pointer",
        getPriorityBorderClass(lead.priority),
        isDragging && "opacity-40 ring-2 ring-primary/40",
        isOverlay && "shadow-2xl border-primary/60 ring-2 ring-primary/30",
        className
      )}
    >
      {/* Card Header & Drag Handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/60 hover:text-foreground focus:outline-hidden"
            aria-label="Drag lead card"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onViewLead) {
                onViewLead(lead)
              } else {
                onEdit?.(lead)
              }
            }}
            className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate text-left cursor-pointer"
          >
            {lead.name}
          </button>
        </div>

        {/* Quick Actions Dropdown (Only rendered when not actively dragging overlay) */}
        {!isOverlay && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-accent-foreground focus:outline-hidden"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Lead options</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  if (onViewLead) {
                    onViewLead(lead)
                  } else {
                    router.push(`/sales/leads/${lead.id}`)
                  }
                }}
                className="cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                <span>View Workspace</span>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(lead)} className="cursor-pointer">
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  <span>Edit Lead</span>
                </DropdownMenuItem>
              )}
              {onViewHistory && (
                <DropdownMenuItem onClick={() => onViewHistory(lead)} className="cursor-pointer">
                  <History className="h-3.5 w-3.5 mr-2" />
                  <span>Stage History</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Company Name */}
      {lead.company && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-6">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}

      {/* Badges & Meta */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-6">
        <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-semibold py-0 px-1.5", getPriorityBadgeClass(lead.priority))}>
          {lead.priority}
        </Badge>

        {lead.source && (
          <Badge variant="secondary" className="text-[10px] font-normal py-0 px-1.5">
            {lead.source}
          </Badge>
        )}

        {lead.partners && lead.partners.length > 0 && (
          <Badge variant="outline" className="text-[10px] font-normal border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 py-0 px-1.5 flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />
            <span>{lead.partners.length} Partner{lead.partners.length > 1 ? "s" : ""}</span>
          </Badge>
        )}
      </div>

      {/* Card Footer: Owner & Contact preview */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 mt-1 border-t border-border/40 pl-6">
        <div className="flex items-center gap-1.5 truncate">
          <div className="h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
            {lead.owner ? lead.owner.name.charAt(0).toUpperCase() : "?"}
          </div>
          <span className="truncate text-[11px]">{lead.owner ? lead.owner.name : "Unassigned"}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {lead.phone && <Phone className="h-3 w-3 text-muted-foreground/70" />}
          {lead.email && <Mail className="h-3 w-3 text-muted-foreground/70" />}
        </div>
      </div>
    </div>
  )
}

interface PipelineLeadCardProps {
  lead: LeadItem
  onViewLead?: (lead: LeadItem) => void
  onEdit?: (lead: LeadItem) => void
  onViewHistory?: (lead: LeadItem) => void
  className?: string
}

export function PipelineLeadCard({
  lead,
  onViewLead,
  onEdit,
  onViewHistory,
  className,
}: PipelineLeadCardProps) {
  return (
    <KanbanCard id={lead.id} data={{ type: "Lead", lead }} className={className}>
      {({ attributes, listeners, isDragging }) => (
        <PipelineLeadCardContent
          lead={lead}
          attributes={attributes}
          listeners={listeners}
          isDragging={isDragging}
          onViewLead={onViewLead}
          onEdit={onEdit}
          onViewHistory={onViewHistory}
        />
      )}
    </KanbanCard>
  )
}

function getPriorityBorderClass(priority: string) {
  switch (priority) {
    case "critical":
      return "border-l-4 border-l-red-500"
    case "high":
      return "border-l-4 border-l-amber-500"
    case "medium":
      return "border-l-4 border-l-blue-500"
    case "low":
    default:
      return "border-l-4 border-l-zinc-300 dark:border-l-zinc-700"
  }
}

function getPriorityBadgeClass(priority: string) {
  switch (priority) {
    case "critical":
      return "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
    case "high":
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
    case "medium":
      return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300"
    case "low":
    default:
      return "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
  }
}
