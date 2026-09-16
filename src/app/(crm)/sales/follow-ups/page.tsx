"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PhoneCall, Plus } from "lucide-react";
import { FollowUpStats } from "@/features/followups/components/followup-stats";
import { FollowUpFilters } from "@/features/followups/components/followup-filters";
import { FollowUpList } from "@/features/followups/components/followup-list";
import { FollowUpDialog } from "@/features/followups/components/followup-dialog";
import { CompleteFollowUpDialog } from "@/features/followups/components/complete-followup-dialog";
import { LogCallDialog } from "@/features/followups/components/log-call-dialog";
import type { FollowUpItem, FollowUpMetrics } from "@/features/followups/types/followup.types";

export default function FollowUpsPage() {
  const [items, setItems] = React.useState<FollowUpItem[]>([]);
  const [metrics, setMetrics] = React.useState<FollowUpMetrics>({
    overdueCount: 0,
    todayCount: 0,
    upcomingCount: 0,
    completedTodayCount: 0,
    totalPendingCount: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Filters state
  const [timeframe, setTimeframe] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [type, setType] = React.useState<string>("all");
  const [assignedToId, setAssignedToId] = React.useState<string>("all");

  // Dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);
  const [logCallDialogOpen, setLogCallDialogOpen] = React.useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = React.useState<FollowUpItem | null>(null);

  const fetchFollowUps = React.useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        timeframe,
      });

      if (search.trim()) params.append("search", search.trim());
      if (type !== "all") params.append("type", type);
      if (assignedToId !== "all") params.append("assignedToId", assignedToId);

      const res = await fetch(`/api/follow-ups?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data?.items || []);
        if (json.data?.metrics) {
          setMetrics(json.data.metrics);
        }
        if (json.data?.pagination) {
          setPagination(json.data.pagination);
        }
      }
    } catch {
      // Catch network errors
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, search, type, assignedToId]);

  React.useEffect(() => {
    fetchFollowUps(1);
  }, [fetchFollowUps]);

  const handleScheduleSubmit = async (payload: any) => {
    const res = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to schedule follow-up");
    }
    fetchFollowUps(pagination.page);
  };

  const handleCompleteSubmit = async (id: string, payload: any) => {
    const res = await fetch(`/api/follow-ups/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to complete follow-up");
    }
    fetchFollowUps(pagination.page);
  };

  const handleLogCallSubmit = async (payload: any) => {
    const createRes = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: payload.leadId,
        type: "call",
        scheduledAt: new Date(),
        assignedToId: "current",
        notes: "Logged Call",
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json();
      throw new Error(errData.message || "Failed to log call");
    }

    const createData = await createRes.json();
    const createdId = createData.data?.followUp?.id;

    if (createdId) {
      await handleCompleteSubmit(createdId, {
        outcome: payload.outcome,
        nextFollowUp: payload.nextFollowUp,
      });
    }
  };

  const handleCancel = async (followUp: FollowUpItem) => {
    if (!confirm("Are you sure you want to cancel this follow-up?")) return;
    try {
      const res = await fetch(`/api/follow-ups/${followUp.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFollowUps(pagination.page);
      }
    } catch {
      // Handled
    }
  };

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setAssignedToId("all");
    setTimeframe("all");
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <PageHeader
        title="Follow-ups Schedule"
        description="Schedule, filter, track, and complete sales communications with active leads and clients."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Follow-ups" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLogCallDialogOpen(true)}
            >
              <PhoneCall className="h-4 w-4 mr-1.5" />
              <span>Log Call</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedFollowUp(null);
                setScheduleDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Schedule Follow-up</span>
            </Button>
          </div>
        }
      />

      <div className="max-w-[1536px] mx-auto p-4 sm:p-5 xl:p-6 space-y-4 sm:space-y-6">
        {/* KPI Summary Header */}
        <FollowUpStats
          metrics={metrics}
          onFilterTimeframe={(tf) => setTimeframe(tf)}
          activeTimeframe={timeframe}
        />

        {/* Filter Controls */}
        <FollowUpFilters
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          search={search}
          onSearchChange={setSearch}
          type={type}
          onTypeChange={setType}
          assignedToId={assignedToId}
          onAssignedToChange={setAssignedToId}
          onResetFilters={resetFilters}
        />

        {/* Interactive Follow-ups List */}
        <FollowUpList
          items={items}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={(page) => fetchFollowUps(page)}
          onComplete={(item) => {
            setSelectedFollowUp(item);
            setCompleteDialogOpen(true);
          }}
          onReschedule={(item) => {
            setSelectedFollowUp(item);
            setScheduleDialogOpen(true);
          }}
          onCancel={handleCancel}
          onScheduleNew={() => {
            setSelectedFollowUp(null);
            setScheduleDialogOpen(true);
          }}
        />

        {/* Dialog Modals */}
        <FollowUpDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          initialData={selectedFollowUp}
          onSubmit={handleScheduleSubmit}
        />

        <CompleteFollowUpDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          followUp={selectedFollowUp}
          onSubmit={handleCompleteSubmit}
        />

        <LogCallDialog
          open={logCallDialogOpen}
          onOpenChange={setLogCallDialogOpen}
          currentUserId=""
          onSubmit={handleLogCallSubmit}
        />
      </div>
    </div>
  );
}
