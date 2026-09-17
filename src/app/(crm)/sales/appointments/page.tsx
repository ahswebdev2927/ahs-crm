"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import {
  AppointmentStats,
  AppointmentFilters,
  AppointmentTable,
  AppointmentCalendarView,
  AppointmentDialog,
  AppointmentDetailDialog,
  RescheduleAppointmentDialog,
  CancelAppointmentDialog,
  type MainViewMode,
  type CalendarSubView,
  type AppointmentItem,
  type AppointmentMetrics,
  type FieldSalesUser,
  type CalendarEvent,
  type CreateAppointmentInput,
  type AppointmentStatus,
} from "@/features/appointments";

export default function AppointmentsPage() {
  const [items, setItems] = React.useState<AppointmentItem[]>([]);
  const [metrics, setMetrics] = React.useState<AppointmentMetrics>({
    total: 0,
    scheduled: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    rescheduled: 0,
    cancelled: 0,
    noShow: 0,
  });
  const [fieldSalesUsers, setFieldSalesUsers] = React.useState<FieldSalesUser[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [availableLeads, setAvailableLeads] = React.useState<Array<{ id: string; name: string }>>([]);
  const [availableCustomers, setAvailableCustomers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter States
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [assignedToId, setAssignedToId] = React.useState("all");

  // View Mode States
  const [mainView, setMainView] = React.useState<MainViewMode>("list");
  const [calendarSubView, setCalendarSubView] = React.useState<CalendarSubView>("month");

  // Dialog States
  const [isBookOpen, setIsBookOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<AppointmentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);

  // Fetch Lookups
  React.useEffect(() => {
    async function loadLookups() {
      try {
        const [fsRes, leadsRes, custRes] = await Promise.all([
          fetch("/api/appointments/field-sales"),
          fetch("/api/leads?limit=100"),
          fetch("/api/customers?limit=100"),
        ]);

        if (fsRes.ok) {
          const json = await fsRes.json();
          setFieldSalesUsers(json.data.users || []);
        }

        if (leadsRes.ok) {
          const json = await leadsRes.json();
          const mapped = (json.data.items || json.data.leads || []).map((l: any) => ({
            id: l.id,
            name: l.contactName || l.name,
          }));
          setAvailableLeads(mapped);
        }

        if (custRes.ok) {
          const json = await custRes.json();
          const mapped = (json.data.items || json.data.customers || []).map((c: any) => ({
            id: c.id,
            name: c.name,
          }));
          setAvailableCustomers(mapped);
        }
      } catch (err) {
        console.error("Failed to load appointment lookups:", err);
      }
    }
    loadLookups();
  }, []);

  // Fetch Appointments & Calendar Events
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (assignedToId && assignedToId !== "all") params.set("assignedToId", assignedToId);
      params.set("limit", "100");

      const [aptRes, calRes] = await Promise.all([
        fetch(`/api/appointments?${params.toString()}`),
        fetch("/api/appointments/calendar"),
      ]);

      if (aptRes.ok) {
        const json = await aptRes.json();
        setItems(json.data.items || []);
        if (json.data.metrics) setMetrics(json.data.metrics);
      }

      if (calRes.ok) {
        const json = await calRes.json();
        setCalendarEvents(json.data.events || []);
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
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

  const handleCreateSubmit = async (data: CreateAppointmentInput) => {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to schedule appointment");
    await fetchData();
  };

  const handleUpdateSubmit = async (data: CreateAppointmentInput) => {
    if (!selectedAppointment) return;
    const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update appointment");
    await fetchData();
  };

  const handleStatusChange = async (apt: AppointmentItem, newStatus: AppointmentStatus) => {
    const res = await fetch(`/api/appointments/${apt.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleRescheduleSubmit = async (
    id: string,
    newStartTime: number,
    newEndTime: number,
    reason: string
  ) => {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reschedule",
        startTime: newStartTime,
        endTime: newEndTime,
        rescheduleReason: reason,
      }),
    });
    if (!res.ok) throw new Error("Failed to reschedule appointment");
    await fetchData();
  };

  const handleCancelSubmit = async (id: string, reason: string) => {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        cancellationReason: reason,
      }),
    });
    if (!res.ok) throw new Error("Failed to cancel appointment");
    await fetchData();
  };

  return (
    <div className="flex-1">
      <PageHeader
        title="Appointments & Field Schedule"
        description="Plan meetings, site assessments, and assign consultations to Field Sales representatives."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Sales", href: "/sales/leads" },
          { label: "Appointments" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setSelectedAppointment(null);
              setIsBookOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Book Appointment</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6">
        {/* Metric Cards */}
        <AppointmentStats metrics={metrics} />

        {/* Filters & View Switches */}
        <AppointmentFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          assignedToId={assignedToId}
          onAssignedToChange={setAssignedToId}
          fieldSalesUsers={fieldSalesUsers}
          mainView={mainView}
          onMainViewChange={setMainView}
          calendarSubView={calendarSubView}
          onCalendarSubViewChange={setCalendarSubView}
          onReset={handleResetFilters}
        />

        {/* View Switch Content */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground bg-card border border-border rounded-lg">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p>Loading appointments & schedule...</p>
          </div>
        ) : mainView === "list" ? (
          <AppointmentTable
            items={items}
            onView={(apt) => {
              setSelectedAppointment(apt);
              setIsDetailOpen(true);
            }}
            onEdit={(apt) => {
              setSelectedAppointment(apt);
              setIsBookOpen(true);
            }}
            onStatusChange={handleStatusChange}
            onReschedule={(apt) => {
              setSelectedAppointment(apt);
              setIsRescheduleOpen(true);
            }}
            onCancel={(apt) => {
              setSelectedAppointment(apt);
              setIsCancelOpen(true);
            }}
          />
        ) : (
          <AppointmentCalendarView
            events={calendarEvents}
            subView={calendarSubView}
            onSelectEvent={(event) => {
              const matchedApt = items.find((i) => i.id === event.id);
              if (matchedApt) {
                setSelectedAppointment(matchedApt);
                setIsDetailOpen(true);
              }
            }}
          />
        )}
      </div>

      {/* Dialog Modals */}
      <AppointmentDialog
        open={isBookOpen}
        onOpenChange={setIsBookOpen}
        appointmentToEdit={selectedAppointment}
        fieldSalesUsers={fieldSalesUsers}
        availableLeads={availableLeads}
        availableCustomers={availableCustomers}
        onSubmit={selectedAppointment ? handleUpdateSubmit : handleCreateSubmit}
      />

      <AppointmentDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        appointment={selectedAppointment}
        onEdit={(apt) => {
          setIsDetailOpen(false);
          setSelectedAppointment(apt);
          setIsBookOpen(true);
        }}
        onStatusChange={handleStatusChange}
        onReschedule={(apt) => {
          setIsDetailOpen(false);
          setSelectedAppointment(apt);
          setIsRescheduleOpen(true);
        }}
        onCancel={(apt) => {
          setIsDetailOpen(false);
          setSelectedAppointment(apt);
          setIsCancelOpen(true);
        }}
      />

      <RescheduleAppointmentDialog
        open={isRescheduleOpen}
        onOpenChange={setIsRescheduleOpen}
        appointment={selectedAppointment}
        onSubmit={handleRescheduleSubmit}
      />

      <CancelAppointmentDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        appointment={selectedAppointment}
        onSubmit={handleCancelSubmit}
      />
    </div>
  );
}
