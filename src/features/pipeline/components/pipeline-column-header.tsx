"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { PipelineStageColumn } from "@/features/leads/types/lead.types"

interface PipelineColumnHeaderProps {
  stage: PipelineStageColumn
  onAddLead?: (stageId: number) => void
}

export function PipelineColumnHeader({
  stage,
  onAddLead,
}: PipelineColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-1">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-3 w-3 rounded-full shrink-0 shadow-xs"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="font-semibold text-sm text-foreground truncate">
          {stage.name}
        </h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-bold rounded-full">
          {stage.totalCount}
        </Badge>
      </div>

      {onAddLead && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => onAddLead(stage.id)}
          title={`Add lead to ${stage.name}`}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add lead to {stage.name}</span>
        </Button>
      )}
    </div>
  )
}
