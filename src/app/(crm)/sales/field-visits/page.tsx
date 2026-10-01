"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, RefreshCw } from "lucide-react";
import {
  FieldVisitStats,
  FieldVisitFilters,
  FieldVisitTable,
  FieldVisitCardList,
  FieldVisitDetailDialog,
  CompleteFieldVisitDialog,
  CreateFieldVisitDialog,
  type ViewMode,
  type FieldSalesUserOption,
} from "@/features/field-visits";
import type { FieldVisitItem, FieldVisitMetrics } from "@/features/field-visits/types/field-visit.types";

export default function FieldVisitsPage() {
  const [items, setItems] = React.useState<FieldVisitItem[]>([]);
  const [metrics, setMetrics] = React.useState<FieldVisitMetrics>({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    totalExpenses: 0,
    nextActionsBreakdown: {
      follow_up: 0,
      proposal: 0,
      second_visit: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    },
  });
  const [fieldSalesUsers, setFieldSalesUsers] = React.useState<FieldSalesUserOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter States
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [assignedToId, setAssignedToId] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");

  // Dialog States
  const [selectedVisit, setSelectedVisit] = React.useState<FieldVisitItem | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  // Fetch Lookups (Field Sales Users)
  React.useEffect(() => {
    async function loadLookups() {
      try {
        const res = await fetch("/api/appointments/field-sales");
        if (res.ok) {
          const json = await res.json();
          setFieldSalesUsers(json.data.users || []);
        }
      } catch (err) {
        console.error("Failed to load field sales users:", err);
      }
    }
    loadLookups();
  }, []);

  // Fetch Field Visits & Metrics
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (assignedToId && assignedToId !== "all") params.set("assignedToId", assignedToId);
      params.set("limit", "100");

      const res = await fetch(`/api/field-visits?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data.items || []);
        if (json.data.metrics) setMetrics(json.data.metrics);
      }
    } catch (err) {
      console.error("Error loading field visits:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, status, assignedToId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setAssignedToId("all");
  };

  return (
    <div className="flex-1">
      <PageHeader
        title="Field Visits & Site Reports"
        description="Track on-site client visits, submit visit reports, gather requirements, and record expenses."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Field Visits" },
        ]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Schedule Field Visit</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-5">
        {/* Consolidation Notice */}
        <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Consolidated Workspace:</strong> Field visits and execution reports are now directly integrated inside each appointment.
            </span>
          </div>
          <Link href="/sales/appointments">
            <Button variant="outline" size="sm" className="h-7 text-xs bg-background text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 shrink-0">
              Go to Appointments
            </Button>
          </Link>
        </div>

        {/* Metric Cards */}
        <FieldVisitStats metrics={metrics} />

        {/* Filters & View Switches */}
        <FieldVisitFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          assignedToId={assignedToId}
          onAssignedToChange={setAssignedToId}
          fieldSalesUsers={fieldSalesUsers}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onReset={handleResetFilters}
        />

        {/* Content View */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground bg-card border border-border rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p>Loading field visits...</p>
          </div>
        ) : viewMode === "table" ? (
          <FieldVisitTable
            items={items}
            onView={(visit) => {
              setSelectedVisit(visit);
              setDetailOpen(true);
            }}
            onComplete={(visit) => {
              setSelectedVisit(visit);
              setCompleteOpen(true);
            }}
            onEdit={(visit) => {
              setSelectedVisit(visit);
              setCreateOpen(true);
            }}
          />
        ) : (
          <FieldVisitCardList
            items={items}
            onView={(visit) => {
              setSelectedVisit(visit);
              setDetailOpen(true);
            }}
            onComplete={(visit) => {
              setSelectedVisit(visit);
              setCompleteOpen(true);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <CreateFieldVisitDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        fieldSalesUsers={fieldSalesUsers}
        onSuccess={fetchData}
      />

      <CompleteFieldVisitDialog
        visit={selectedVisit}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        onSuccess={fetchData}
      />

      <FieldVisitDetailDialog
        visit={selectedVisit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCompleteClick={(v) => {
          setSelectedVisit(v);
          setCompleteOpen(true);
        }}
      />
    </div>
  );
}
