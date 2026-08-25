"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { LeadDetailWorkspace } from "@/features/leads/components/lead-detail-workspace";
import { LeadDrawer } from "@/features/leads/components/lead-drawer";
import { LeadAssignDialog } from "@/features/leads/components/lead-assign-dialog";
import { LeadStageDialog } from "@/features/leads/components/lead-stage-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import type { LeadDetail, LeadStageItem, UserSummary } from "@/features/leads/types/lead.types";

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [lead, setLead] = React.useState<LeadDetail | null>(null);
  const [stages, setStages] = React.useState<LeadStageItem[]>([]);
  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Drawer / Modals state
  const [isEditDrawerOpen, setIsEditDrawerOpen] = React.useState<boolean>(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState<boolean>(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = React.useState<boolean>(false);

  const fetchLeadDetails = React.useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load lead details.");
      }
      setLead(data.data.lead);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred loading lead workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  const fetchStages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/leads/stages");
      const data = await res.json();
      if (res.ok && data?.data?.stages) {
        setStages(data.data.stages);
      }
    } catch (_err) {}
  }, []);

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
    fetchLeadDetails();
    fetchStages();
    fetchTeamUsers();
  }, [fetchLeadDetails, fetchStages, fetchTeamUsers]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading Lead Workspace...</p>
      </div>
    );
  }

  if (errorMsg || !lead) {
    return (
      <div className="flex-1 p-6 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4 shadow-xs">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Lead Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {errorMsg || "The lead record you requested could not be found or you may not have authorization to view it."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title={`Lead: ${lead.name}`}
        description="Comprehensive deal workspace, stage timeline, contact details, and audit history."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Leads", href: "/sales/leads" },
          { label: lead.name },
        ]}
      />

      <LeadDetailWorkspace
        lead={lead}
        onEditLead={() => setIsEditDrawerOpen(true)}
        onAssignLead={() => setIsAssignDialogOpen(true)}
        onChangeStage={() => setIsStageDialogOpen(true)}
      />

      {/* Slide-Over Edit Drawer */}
      <LeadDrawer
        open={isEditDrawerOpen}
        onOpenChange={setIsEditDrawerOpen}
        leadToEdit={lead}
        stages={stages}
        teamUsers={teamUsers}
        onSuccess={fetchLeadDetails}
      />

      <LeadAssignDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        lead={lead}
        teamUsers={teamUsers}
        onSuccess={fetchLeadDetails}
      />

      <LeadStageDialog
        open={isStageDialogOpen}
        onOpenChange={setIsStageDialogOpen}
        lead={lead}
        stages={stages}
        onSuccess={fetchLeadDetails}
      />
    </div>
  );
}
