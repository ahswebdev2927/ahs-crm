"use client";

import * as React from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";
import { LeadDrawer } from "@/features/leads/components/lead-drawer";
import { LeadDialog } from "@/features/leads/components/lead-dialog";
import { LeadStageManagerDialog } from "@/features/leads/components/lead-stage-manager-dialog";
import type { LeadItem, LeadStageItem, UserSummary } from "@/features/leads/types/lead.types";

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([]);
  const [stages, setStages] = React.useState<LeadStageItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = React.useState<string>("");

  // URL-aware Lead Workspace Drawer state
  const leadQueryParam = searchParams.get("lead");
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(leadQueryParam);

  React.useEffect(() => {
    setSelectedLeadId(leadQueryParam);
  }, [leadQueryParam]);

  // Create Lead Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState<boolean>(false);
  const [defaultStageId, setDefaultStageId] = React.useState<number | undefined>(undefined);

  const [isStageManagerOpen, setIsStageManagerOpen] = React.useState<boolean>(false);
  const [refreshKey, setRefreshKey] = React.useState<number>(0);

  // Fetch session role
  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.user?.role?.code) {
          setCurrentUserRole(data.data.user.role.code);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch stages for stage manager & create dialog
  const fetchStages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/leads/stages");
      const data = await res.json();
      if (res.ok && data?.data?.stages) {
        setStages(data.data.stages);
      }
    } catch (_err) {}
  }, []);

  // Fetch team members
  const fetchTeamUsers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/team?limit=100");
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        setTeamUsers(data.data.items);
      }
    } catch (_err) {}
  }, []);

  React.useEffect(() => {
    fetchStages();
    fetchTeamUsers();
  }, [fetchStages, fetchTeamUsers]);

  const handleViewLead = (lead: LeadItem) => {
    setSelectedLeadId(lead.id);
    const params = new URLSearchParams(window.location.search);
    params.set("lead", lead.id);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  const handleCloseLeadDrawer = () => {
    setSelectedLeadId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("lead");
    const searchString = params.toString();
    const newUrl = searchString ? `${pathname}?${searchString}` : pathname;
    window.history.pushState(null, "", newUrl);
  };

  const handleCreateLead = (stageId?: number) => {
    setDefaultStageId(stageId);
    setIsCreateDialogOpen(true);
  };

  const isManagerOrAdmin =
    currentUserRole === "super_admin" || currentUserRole === "sales_manager";

  return (
    <div className="flex flex-col min-w-0 w-full max-w-full p-3 sm:p-4 lg:p-5 gap-3 md:gap-4 overflow-x-hidden">
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
              className="h-9 text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Create Lead</span>
            </Button>
          </div>
        }
      />

      {/* Main Interactive Kanban Pipeline Sticky Workspace Container */}
      <div className="sticky top-0 z-10 flex flex-col h-[calc(100vh-4rem-1.5rem)] sm:h-[calc(100vh-4rem-2rem)] lg:h-[calc(100vh-4rem-2.5rem)] shrink-0 min-w-0 w-full max-w-full overflow-x-hidden bg-zinc-50/40 dark:bg-zinc-950/20 pt-1 pb-1">
        <PipelineBoard
          key={refreshKey}
          teamUsers={teamUsers}
          onViewLead={handleViewLead}
          onCreateLead={handleCreateLead}
        />
      </div>

      {/* Unified Lead Workspace Drawer */}
      <React.Fragment>
        <LeadDrawer
          leadId={selectedLeadId}
          open={Boolean(selectedLeadId)}
          onOpenChange={(open) => {
            if (!open) handleCloseLeadDrawer();
          }}
          onLeadUpdated={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Create Lead Dialog */}
        <LeadDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          defaultStageId={defaultStageId}
          stages={stages}
          teamUsers={teamUsers}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Stage Manager Dialog */}
        <LeadStageManagerDialog
          open={isStageManagerOpen}
          onOpenChange={setIsStageManagerOpen}
          stages={stages}
          onSuccess={() => {
            fetchStages();
            setRefreshKey((prev) => prev + 1);
          }}
        />
      </React.Fragment>
    </div>
  );
}
