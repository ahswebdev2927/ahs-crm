"use client"

import * as React from "react"
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanBoard, KanbanColumn } from "@/components/shared/kanban"
import { PipelineColumnHeader } from "./pipeline-column-header"
import { PipelineLeadCard, PipelineLeadCardContent } from "./pipeline-lead-card"
import { PipelineFilters, type PipelineFilterValues } from "./pipeline-filters"
import { PipelineStageHistoryDialog } from "./pipeline-stage-history-dialog"
import { LeadDialog } from "@/features/leads/components/lead-dialog"
import { Loader2, Kanban, AlertCircle } from "lucide-react"
import type {
  PipelineBoardData,
  PipelineStageColumn,
  LeadItem,
  LeadStageItem,
  UserSummary,
} from "@/features/leads/types/lead.types"

interface PipelineBoardProps {
  initialBoardData?: PipelineBoardData
  teamUsers: UserSummary[]
  onEditLead?: (lead: LeadItem) => void
  onCreateLead?: (stageId?: number) => void
}

export function PipelineBoard({
  initialBoardData,
  teamUsers,
  onEditLead,
  onCreateLead,
}: PipelineBoardProps) {
  const [stages, setStages] = React.useState<PipelineStageColumn[]>(initialBoardData?.stages || [])
  const [loading, setLoading] = React.useState(!initialBoardData)
  const [error, setError] = React.useState<string | null>(null)
  const [activeLead, setActiveLead] = React.useState<LeadItem | null>(null)
  const snapshotRef = React.useRef<PipelineStageColumn[]>(stages)

  // Filters state
  const [filters, setFilters] = React.useState<PipelineFilterValues>({
    search: "",
    ownerId: "",
    priority: "",
    source: "",
  })

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedLeadForEdit, setSelectedLeadForEdit] = React.useState<LeadItem | null>(null)
  const [targetStageIdForAdd, setTargetStageIdForAdd] = React.useState<number | undefined>(undefined)

  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false)
  const [selectedLeadForHistory, setSelectedLeadForHistory] = React.useState<LeadItem | null>(null)

  // Fetch pipeline data when filters change
  const fetchBoardData = React.useCallback(async (filterValues: PipelineFilterValues) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (filterValues.search) query.set("search", filterValues.search)
      if (filterValues.ownerId) query.set("ownerId", filterValues.ownerId)
      if (filterValues.priority) query.set("priority", filterValues.priority)
      if (filterValues.source) query.set("source", filterValues.source)

      const res = await fetch(`/api/leads/pipeline?${query.toString()}`)
      const data = await res.json()

      if (!res.ok || (!data.status && !data.success)) {
        throw new Error(data.message || "Failed to load pipeline board data.")
      }

      setStages(data.data.stages || [])
      snapshotRef.current = data.data.stages || []
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading the pipeline.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchBoardData(filters)
  }, [filters, fetchBoardData])

  // Flattened array of all lead stages for dialog selects
  const leadStagesList: LeadStageItem[] = React.useMemo(() => {
    return stages.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color,
      order: s.order,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
  }, [stages])

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeLeadId = String(active.id)

    // Save snapshot for optimistic rollback
    snapshotRef.current = structuredClone(stages)

    // Find active lead object
    for (const stage of stages) {
      const found = stage.leads.find((l) => l.id === activeLeadId)
      if (found) {
        setActiveLead(found)
        break
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeLeadId = String(active.id)
    const overId = String(over.id)

    // Find source column
    const sourceStage = stages.find((stage) =>
      stage.leads.some((l) => l.id === activeLeadId)
    )

    // Find destination column (overId could be a column ID or another card ID)
    let destStage = stages.find((stage) => String(stage.id) === overId)
    if (!destStage) {
      destStage = stages.find((stage) =>
        stage.leads.some((l) => l.id === overId)
      )
    }

    if (!sourceStage || !destStage) return

    // Same-stage reordering
    if (sourceStage.id === destStage.id) {
      const oldIndex = sourceStage.leads.findIndex((l) => l.id === activeLeadId)
      const newIndex = sourceStage.leads.findIndex((l) => l.id === overId)

      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        setStages((prevStages) =>
          prevStages.map((stage) => {
            if (stage.id === sourceStage.id) {
              const reordered = arrayMove(stage.leads, oldIndex, newIndex)
              return { ...stage, leads: reordered }
            }
            return stage
          })
        )
      }
      return
    }

    // Cross-stage movement
    setStages((prevStages) => {
      return prevStages.map((stage) => {
        if (stage.id === sourceStage.id) {
          const updatedLeads = stage.leads.filter((l) => l.id !== activeLeadId)
          return { ...stage, leads: updatedLeads, totalCount: updatedLeads.length }
        }
        if (stage.id === destStage.id) {
          const activeLeadObj = sourceStage.leads.find((l) => l.id === activeLeadId)
          if (!activeLeadObj) return stage

          const overIndex = stage.leads.findIndex((l) => l.id === overId)
          const insertIndex = overIndex >= 0 ? overIndex : stage.leads.length
          const updatedLeadObj = { ...activeLeadObj, stageId: destStage.id }

          const updatedLeads = [
            ...stage.leads.slice(0, insertIndex),
            updatedLeadObj,
            ...stage.leads.slice(insertIndex),
          ]

          return { ...stage, leads: updatedLeads, totalCount: updatedLeads.length }
        }
        return stage
      })
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)

    if (!over) {
      setStages(snapshotRef.current)
      return
    }

    const activeLeadId = String(active.id)

    // Find original stage from snapshot
    const originalStage = snapshotRef.current.find((s) =>
      s.leads.some((l) => l.id === activeLeadId)
    )
    if (!originalStage) return

    // Find final stage in current state
    const currentStage = stages.find((s) =>
      s.leads.some((l) => l.id === activeLeadId)
    )
    if (!currentStage) return

    // Same stage reorder
    if (originalStage.id === currentStage.id) {
      const oldOrderIds = originalStage.leads.map((l) => l.id)
      const newOrderIds = currentStage.leads.map((l) => l.id)

      const hasOrderChanged =
        oldOrderIds.length !== newOrderIds.length ||
        oldOrderIds.some((id, idx) => id !== newOrderIds[idx])

      if (hasOrderChanged) {
        try {
          const leadOrders = currentStage.leads.map((lead, idx) => ({
            leadId: lead.id,
            position: idx,
          }))

          const res = await fetch("/api/leads/pipeline/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stageId: currentStage.id,
              leadOrders,
            }),
          })

          const data = await res.json()

          if (!res.ok || (!data.status && !data.success)) {
            throw new Error(data.message || "Failed to persist reorder.")
          }

          // Update snapshot reference to current state after successful persist
          snapshotRef.current = structuredClone(stages)
        } catch (err: any) {
          // Rollback on failure
          setStages(snapshotRef.current)
          setError(err.message || "Failed to save lead order. Changes were rolled back.")
        }
      }
      return
    }

    // Cross-stage movement
    const newPosition = currentStage.leads.findIndex((l) => l.id === activeLeadId)

    try {
      const res = await fetch("/api/leads/pipeline/move-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeLeadId,
          fromStageId: originalStage.id,
          toStageId: currentStage.id,
          newPosition: newPosition >= 0 ? newPosition : 0,
          reason: `Moved from ${originalStage.name} to ${currentStage.name} via Kanban`,
        }),
      })

      const data = await res.json()

      if (!res.ok || (!data.status && !data.success)) {
        throw new Error(data.message || "Failed to update lead stage.")
      }

      // Update snapshot reference after successful move
      snapshotRef.current = structuredClone(stages)
    } catch (err: any) {
      // Rollback optimistic update
      setStages(snapshotRef.current)
      setError(err.message || "Failed to move lead stage. Changes rolled back.")
    }
  }

  const handleOpenAddLeadForStage = (stageId: number) => {
    if (onCreateLead) {
      onCreateLead(stageId)
    } else {
      setTargetStageIdForAdd(stageId)
      setCreateDialogOpen(true)
    }
  }

  const handleOpenEdit = (lead: LeadItem) => {
    if (onEditLead) {
      onEditLead(lead)
    } else {
      setSelectedLeadForEdit(lead)
      setEditDialogOpen(true)
    }
  }

  const handleOpenHistory = (lead: LeadItem) => {
    setSelectedLeadForHistory(lead)
    setHistoryDialogOpen(true)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full w-full max-w-full gap-4 overflow-hidden">
      {/* Filters */}
      <PipelineFilters
        filters={filters}
        onFilterChange={setFilters}
        teamUsers={teamUsers}
        isLoading={loading}
      />

      {/* Error alert banner */}
      {error && (
        <div className="flex items-center justify-between gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && stages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Loading Sales Pipeline...</p>
        </div>
      ) : stages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl bg-card/40 p-8 text-center">
          <Kanban className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold">No Lead Stages Configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            There are no pipeline stages available. Ask a Sales Manager or SuperAdmin to configure lead stages.
          </p>
        </div>
      ) : (
        /* Kanban Board Container */
        <div className="flex-1 min-h-0 min-w-0 w-full max-w-full flex flex-col overflow-hidden rounded-xl border border-border/60 bg-zinc-100/40 dark:bg-zinc-900/20 p-2.5">
          <KanbanBoard
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveLead(null)
              setStages(snapshotRef.current)
            }}
            activeId={activeLead?.id}
            renderDragOverlay={() =>
              activeLead ? (
                <div className="w-[300px] shadow-2xl rotate-2">
                  <PipelineLeadCardContent lead={activeLead} isOverlay />
                </div>
              ) : null
            }
          >
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                id={stage.id}
                items={stage.leads.map((l) => l.id)}
                header={
                  <PipelineColumnHeader
                    stage={stage}
                    onAddLead={handleOpenAddLeadForStage}
                  />
                }
              >
                {stage.leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border/40 rounded-lg text-center p-3">
                    <p className="text-xs font-medium text-muted-foreground/60">No leads in stage</p>
                  </div>
                ) : (
                  stage.leads.map((lead) => (
                    <PipelineLeadCard
                      key={lead.id}
                      lead={lead}
                      onEdit={handleOpenEdit}
                      onViewHistory={handleOpenHistory}
                    />
                  ))
                )}
              </KanbanColumn>
            ))}
          </KanbanBoard>
        </div>
      )}

      {/* Dialog Portals Wrapped in Fragment */}
      <React.Fragment>
        <LeadDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          stages={leadStagesList}
          teamUsers={teamUsers}
          onSuccess={() => fetchBoardData(filters)}
        />

        <LeadDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          leadToEdit={selectedLeadForEdit}
          stages={leadStagesList}
          teamUsers={teamUsers}
          onSuccess={() => fetchBoardData(filters)}
        />

        <PipelineStageHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          lead={selectedLeadForHistory}
        />
      </React.Fragment>
    </div>
  )
}
