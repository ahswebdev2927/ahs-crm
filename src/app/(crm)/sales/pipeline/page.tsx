"use client"

import * as React from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Plus, Settings2 } from "lucide-react"
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board"
import { LeadDrawer } from "@/features/leads/components/lead-drawer"
import { LeadStageManagerDialog } from "@/features/leads/components/lead-stage-manager-dialog"
import type { LeadItem, LeadStageItem, UserSummary } from "@/features/leads/types/lead.types"

export default function PipelinePage() {
  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([])
  const [stages, setStages] = React.useState<LeadStageItem[]>([])
  const [currentUserRole, setCurrentUserRole] = React.useState<string>("")
  const [currentUserId, setCurrentUserId] = React.useState<string>("")
  
  // Slide-Over Drawer state
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = React.useState(false)
  const [leadToEdit, setLeadToEdit] = React.useState<LeadItem | null>(null)
  const [defaultStageId, setDefaultStageId] = React.useState<number | undefined>(undefined)

  const [isStageManagerOpen, setIsStageManagerOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Fetch session role and user ID
  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.user) {
          if (data.data.user.role?.code) {
            setCurrentUserRole(data.data.user.role.code)
          }
          if (data.data.user.id) {
            setCurrentUserId(data.data.user.id)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Fetch stages for lead drawer & stage manager
  const fetchStages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/leads/stages")
      const data = await res.json()
      if (res.ok && data?.data?.stages) {
        setStages(data.data.stages)
      }
    } catch (_err) {}
  }, [])

  // Fetch team members
  const fetchTeamUsers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/team?limit=100")
      const data = await res.json()
      if (res.ok && data?.data?.items) {
        setTeamUsers(data.data.items)
      }
    } catch (_err) {}
  }, [])

  React.useEffect(() => {
    fetchStages()
    fetchTeamUsers()
  }, [fetchStages, fetchTeamUsers])

  const handleCreateLead = (stageId?: number) => {
    setLeadToEdit(null)
    setDefaultStageId(stageId)
    setIsLeadDrawerOpen(true)
  }

  const handleEditLead = (lead: LeadItem) => {
    setLeadToEdit(lead)
    setDefaultStageId(undefined)
    setIsLeadDrawerOpen(true)
  }

  const isManagerOrAdmin =
    currentUserRole === "super_admin" || currentUserRole === "sales_manager"

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full gap-3 md:gap-4 p-3 md:p-4 xl:p-5 w-full max-w-[1536px] mx-auto overflow-hidden">
      <PageHeader
        title="Sales Pipeline"
        description="Visual deal flow and stage transitions with drag-and-drop Kanban management."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Pipeline" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isManagerOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStageManagerOpen(true)}
                className="h-9 text-xs"
              >
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Manage Stages
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleCreateLead()}
              className="h-9 text-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Create Lead</span>
            </Button>
          </div>
        }
      />

      {/* Main Interactive Kanban Pipeline Board */}
      <PipelineBoard
        key={refreshKey}
        teamUsers={teamUsers}
        onEditLead={handleEditLead}
        onCreateLead={handleCreateLead}
      />

      {/* Global Lead Creation / Edit Slide-Over Drawer & Stage Manager */}
      <React.Fragment>
        <LeadDrawer
          open={isLeadDrawerOpen}
          onOpenChange={setIsLeadDrawerOpen}
          leadToEdit={leadToEdit}
          defaultStageId={defaultStageId}
          currentUserId={currentUserId}
          stages={stages}
          teamUsers={teamUsers}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />

        <LeadStageManagerDialog
          open={isStageManagerOpen}
          onOpenChange={setIsStageManagerOpen}
          stages={stages}
          onSuccess={() => {
            fetchStages()
            setRefreshKey((prev) => prev + 1)
          }}
        />
      </React.Fragment>
    </div>
  )
}
