"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Plus, RefreshCw } from "lucide-react";
import type { AppointmentItem, FieldSalesUser } from "../types/appointment.types";
import { AppointmentTable } from "./appointment-table";
import { AppointmentDialog } from "./appointment-dialog";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { RescheduleAppointmentDialog } from "./reschedule-appointment-dialog";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import type { CreateAppointmentInput, AppointmentStatus } from "../schemas/appointment.schema";

interface LeadAppointmentsTabProps {
  leadId: string;
  leadName: string;
  fieldSalesUsers: FieldSalesUser[];
}

export function LeadAppointmentsTab({
  leadId,
  leadName,
  fieldSalesUsers,
}: LeadAppointmentsTabProps) {
  const [appointments, setAppointments] = React.useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<AppointmentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);

  const fetchAppointments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/appointments?leadId=${leadId}&limit=50`);
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCreateSubmit = async (data: CreateAppointmentInput) => {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, leadId }),
    });
    if (!res.ok) throw new Error("Failed to create appointment");
    await fetchAppointments();
  };

  const handleStatusChange = async (apt: AppointmentItem, status: AppointmentStatus) => {
    const res = await fetch(`/api/appointments/${apt.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchAppointments();
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
    if (!res.ok) throw new Error("Failed to reschedule");
    await fetchAppointments();
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
    if (!res.ok) throw new Error("Failed to cancel");
    await fetchAppointments();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border dark:border-input/10 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold">Scheduled Appointments</CardTitle>
            <CardDescription className="text-xs">
              Field visits, site inspections, and client consultations for {leadName}.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Schedule Appointment
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading appointments...
            </div>
          ) : (
            <AppointmentTable
              items={appointments}
              onView={(apt) => {
                setSelectedAppointment(apt);
                setIsDetailOpen(true);
              }}
              onEdit={(apt) => {
                setSelectedAppointment(apt);
                setIsCreateOpen(true);
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
          )}
        </CardContent>
      </Card>

      {/* Dialog Modals */}
      <AppointmentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        appointmentToEdit={selectedAppointment}
        fieldSalesUsers={fieldSalesUsers}
        availableLeads={[{ id: leadId, name: leadName }]}
        onSubmit={handleCreateSubmit}
      />

      <AppointmentDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        appointment={selectedAppointment}
        onEdit={(apt) => {
          setIsDetailOpen(false);
          setSelectedAppointment(apt);
          setIsCreateOpen(true);
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
