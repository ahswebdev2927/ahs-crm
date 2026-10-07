"use client";

import * as React from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { LeadTable } from "@/features/leads/components/lead-table";
import { LeadDrawer } from "@/features/leads/components/lead-drawer";
import { LeadDialog } from "@/features/leads/components/lead-dialog";
import { LeadAssignDialog } from "@/features/leads/components/lead-assign-dialog";
import { LeadStageDialog } from "@/features/leads/components/lead-stage-dialog";
import { LeadStageManagerDialog } from "@/features/leads/components/lead-stage-manager-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import type { LeadItem, LeadStageItem, UserSummary } from "@/features/leads/types/lead.types";

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [leads, setLeads] = React.useState<LeadItem[]>([]);
  const [stages, setStages] = React.useState<LeadStageItem[]>([]);
  const [teamUsers, setTeamUsers] = React.useState<UserSummary[]>([]);
  const [currentUserRole, setCurrentUserRole] = React.useState<string>("");
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Filter & Pagination state
  const [search, setSearch] = React.useState<string>("");
  const [selectedStageId, setSelectedStageId] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [selectedSource, setSelectedSource] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("active");
  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<number>(10);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // URL-aware Lead Workspace Drawer state
  const leadQueryParam = searchParams.get("lead");
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(leadQueryParam);

  React.useEffect(() => {
    setSelectedLeadId(leadQueryParam);
  }, [leadQueryParam]);

  // Create / Edit modal dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState<boolean>(false);
  const [leadToEdit, setLeadToEdit] = React.useState<LeadItem | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState<boolean>(false);
  const [leadToAssign, setLeadToAssign] = React.useState<LeadItem | null>(null);

  const [isStageDialogOpen, setIsStageDialogOpen] = React.useState<boolean>(false);
  const [leadToStage, setLeadToStage] = React.useState<LeadItem | null>(null);

  const [isStageManagerOpen, setIsStageManagerOpen] = React.useState<boolean>(false);

  // Fetch Session user info
  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.user) {
          if (data.data.user.role?.code) {
            setCurrentUserRole(data.data.user.role.code);
          }
          if (data.data.user.id) {
            setCurrentUserId(data.data.user.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Lead Stages
  const fetchStages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/leads/stages");
      const data = await res.json();
      if (res.ok && data?.data?.stages) {
        setStages(data.data.stages);
      }
    } catch (_err) {}
  }, []);

  // Fetch Team Users for Owner dropdown
  const fetchTeamUsers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/team?limit=100");
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        setTeamUsers(data.data.items);
      }
    } catch (_err) {}
  }, []);

  // Fetch Leads List
  const fetchLeads = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (selectedStageId !== "all") query.set("stageId", selectedStageId);
      if (selectedPriority !== "all") query.set("priority", selectedPriority);
      if (selectedSource !== "all") query.set("source", selectedSource);
      if (selectedStatus) query.set("status", selectedStatus);
      query.set("page", page.toString());
      query.set("limit", limit.toString());

      const res = await fetch(`/api/leads?${query.toString()}`);
      const data = await res.json();

      if (res.ok && data?.data) {
        setLeads(data.data.items || []);
        if (data.data.pagination) {
          setPagination(data.data.pagination);
        }
      }
    } catch (_err) {
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStageId, selectedPriority, selectedSource, selectedStatus, page, limit]);

  React.useEffect(() => {
    fetchStages();
    fetchTeamUsers();
  }, [fetchStages, fetchTeamUsers]);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Drawer handlers with URL state synchronization
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

  // Handlers for Modals
  const handleCreateLead = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditLead = (lead: LeadItem) => {
    setLeadToEdit(lead);
    setIsEditDialogOpen(true);
  };

  const handleAssignLead = (lead: LeadItem) => {
    setLeadToAssign(lead);
    setIsAssignDialogOpen(true);
  };

  const handleChangeStage = (lead: LeadItem) => {
    setLeadToStage(lead);
    setIsStageDialogOpen(true);
  };

  const handleArchiveLead = async (lead: LeadItem) => {
    if (!confirm(`Are you sure you want to archive lead "${lead.name}"?`)) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLeads();
      }
    } catch (_err) {}
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedStageId("all");
    setSelectedPriority("all");
    setSelectedSource("all");
    setSelectedStatus("active");
    setPage(1);
    setLimit(10);
  };

  const isManagerOrAdmin =
    currentUserRole === "super_admin" || currentUserRole === "sales_manager";

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-5 xl:p-6 w-full">
      <PageHeader
        title="Leads Database"
        description="Capture, qualify, and track prospective sales deals across the pipeline."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Leads" },
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
            <Button size="sm" onClick={handleCreateLead} className="h-9 text-xs cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Create Lead</span>
            </Button>
          </div>
        }
      />

      {/* Filter Controls */}
      <LeadFilters
        stages={stages}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        selectedStageId={selectedStageId}
        onStageChange={(v) => {
          setSelectedStageId(v);
          setPage(1);
        }}
        selectedPriority={selectedPriority}
        onPriorityChange={(v) => {
          setSelectedPriority(v);
          setPage(1);
        }}
        selectedSource={selectedSource}
        onSourceChange={(v) => {
          setSelectedSource(v);
          setPage(1);
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(v) => {
          setSelectedStatus(v);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Leads Table */}
      <LeadTable
        leads={leads}
        isLoading={isLoading}
        currentUserId={currentUserId}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        onViewLead={handleViewLead}
        onEditLead={handleEditLead}
        onAssignLead={handleAssignLead}
        onChangeStage={handleChangeStage}
        onArchiveLead={handleArchiveLead}
      />

      {/* Unified Lead Workspace Drawer */}
      <LeadDrawer
        leadId={selectedLeadId}
        open={Boolean(selectedLeadId)}
        onOpenChange={(open) => {
          if (!open) handleCloseLeadDrawer();
        }}
        onLeadUpdated={fetchLeads}
      />

      {/* Create Lead Dialog */}
      <LeadDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        stages={stages}
        teamUsers={teamUsers}
        onSuccess={fetchLeads}
      />

      {/* Edit Lead Dialog */}
      <LeadDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        leadToEdit={leadToEdit}
        stages={stages}
        teamUsers={teamUsers}
        onSuccess={fetchLeads}
      />

      {/* Reassign Dialog */}
      <LeadAssignDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        lead={leadToAssign}
        teamUsers={teamUsers}
        onSuccess={fetchLeads}
      />

      {/* Change Stage Dialog */}
      <LeadStageDialog
        open={isStageDialogOpen}
        onOpenChange={setIsStageDialogOpen}
        lead={leadToStage}
        stages={stages}
        onSuccess={fetchLeads}
      />

      {/* Stage Manager Dialog (Admin / Manager only) */}
      {isManagerOrAdmin && (
        <LeadStageManagerDialog
          open={isStageManagerOpen}
          onOpenChange={setIsStageManagerOpen}
          stages={stages}
          onSuccess={() => {
            fetchStages();
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
