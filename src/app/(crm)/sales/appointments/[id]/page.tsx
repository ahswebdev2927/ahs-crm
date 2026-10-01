"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Building,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  AppointmentFieldVisitSection,
  RescheduleAppointmentDialog,
  CancelAppointmentDialog,
  getAppointmentStatusBadge,
  type AppointmentWithVisit,
  type AppointmentStatus,
} from "@/features/appointments";

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const appointmentId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const [appointment, setAppointment] = React.useState<AppointmentWithVisit | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog States
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);

  const fetchAppointment = React.useCallback(async () => {
    if (!appointmentId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/appointments/${appointmentId}?withVisit=true`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to load appointment details");
      }
      setAppointment(json.data.appointment);
    } catch (err: any) {
      setError(err.message || "Failed to load appointment");
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  React.useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAppointment();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span>Loading appointment workspace...</span>
        </div>
        <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-6">
        <Link
          href="/sales/appointments"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Appointments
        </Link>
        <div className="p-8 border border-dashed border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg text-center">
          <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">Unable to load appointment</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {error || "Appointment record was not found or you do not have permission to view it."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/sales/appointments")}
            className="mt-4 text-xs"
          >
            Return to Appointments List
          </Button>
        </div>
      </div>
    );
  }

  const startDate = new Date(appointment.startTime);
  const endDate = new Date(appointment.endTime);
  const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
  const formattedTime = `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;

  const clientName = appointment.lead
    ? appointment.lead.contactName
    : appointment.customer
    ? appointment.customer.name
    : "Client";
  const clientCompany = appointment.lead
    ? appointment.lead.companyName
    : null;
  const clientPhone = appointment.lead
    ? appointment.lead.phone
    : appointment.customer
    ? appointment.customer.phone
    : null;
  const clientEmail = appointment.lead
    ? appointment.lead.email
    : appointment.customer
    ? appointment.customer.email
    : null;
  const clientLink = appointment.leadId
    ? `/sales/leads/${appointment.leadId}`
    : appointment.customerId
    ? `/customers/${appointment.customerId}`
    : null;

  const isAssigned = user ? user.id === appointment.assignedToId : false;
  const isCreator = user ? user.id === appointment.createdById : false;
  const isManager = user ? (user.roleCode === "super_admin" || user.roleCode === "sales_manager") : false;
  const canModify = isAssigned || isCreator || isManager;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/sales/appointments"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Appointments
        </Link>
        <div className="text-[11px] text-muted-foreground">
          Appointment ID: <span className="font-mono">{appointment.id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {appointment.title}
            </h1>
            {getAppointmentStatusBadge(appointment.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>Created by {appointment.createdBy.name}</span>
            <span>•</span>
            <span>{format(new Date(appointment.createdAt), "MMM d, yyyy")}</span>
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {canModify && appointment.status !== "completed" && appointment.status !== "cancelled" && (
            <>
              {appointment.status === "scheduled" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("confirmed")}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Confirmed
                </Button>
              )}

              {appointment.status === "confirmed" && (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/appointments/${appointmentId}/field-visit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          purpose: appointment.title,
                          visitDate: Date.now(),
                        }),
                      });
                      if (res.ok) fetchAppointment();
                    } catch (err) {
                      console.error("Failed to start field visit", err);
                    }
                  }}
                  className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Start Visit
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRescheduleOpen(true)}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-purple-500" />
                Reschedule
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelOpen(true)}
                className="text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Appointment Context & Client Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Schedule & Timing */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Schedule & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-foreground text-sm">{formattedDate}</div>
              <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formattedTime}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <div className="text-muted-foreground font-medium text-[11px] mb-1">Site / Meeting Location:</div>
              {appointment.location ? (
                <div className="flex items-start gap-1.5 text-foreground bg-muted/30 p-2 rounded-md">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-snug">{appointment.location}</span>
                </div>
              ) : (
                <span className="text-muted-foreground/70 italic">No specific site address provided</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Client / Lead Information */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Client / Prospect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div>
              <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                {clientLink ? (
                  <Link href={clientLink} className="hover:underline text-primary flex items-center gap-1">
                    {clientName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span>{clientName}</span>
                )}
              </div>
              {clientCompany && (
                <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building className="h-3 w-3" />
                  {clientCompany}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/50 space-y-1.5">
              {clientPhone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3 text-emerald-600" />
                  <a href={`tel:${clientPhone}`} className="hover:underline text-foreground">
                    {clientPhone}
                  </a>
                </div>
              )}

              {clientEmail && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3 w-3 text-blue-600" />
                  <a href={`mailto:${clientEmail}`} className="hover:underline text-foreground truncate">
                    {clientEmail}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Assignment & Representatives */}
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Assigned Field Rep
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-foreground text-sm">
                {appointment.assignedTo.name}
              </div>
              <div className="text-muted-foreground">{appointment.assignedTo.email}</div>
            </div>

            <div className="pt-2 border-t border-border/50 text-[11px] space-y-1">
              <div className="text-muted-foreground">
                Scheduled by: <span className="text-foreground font-medium">{appointment.createdBy.name}</span>
              </div>
              {appointment.description && (
                <div className="text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">Appointment Notes: </span>
                  {appointment.description}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embedded Field Visit Execution & Reporting Workspace */}
      <AppointmentFieldVisitSection
        appointment={appointment}
        initialVisit={appointment.fieldVisit}
        currentUserId={user?.id || ""}
        userRoleCode={user?.roleCode || ""}
        onVisitUpdated={() => fetchAppointment()}
        onStatusChange={handleStatusChange}
      />

      {/* Reschedule Modal */}
      <RescheduleAppointmentDialog
        open={isRescheduleOpen}
        onOpenChange={setIsRescheduleOpen}
        appointment={appointment}
        onSubmit={async (id, newStartTime, newEndTime, reason) => {
          const res = await fetch(`/api/appointments/${id}/reschedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startTime: newStartTime,
              endTime: newEndTime,
              rescheduleReason: reason,
            }),
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message || "Failed to reschedule appointment");
          }
          setIsRescheduleOpen(false);
          fetchAppointment();
        }}
      />

      {/* Cancel Modal */}
      <CancelAppointmentDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        appointment={appointment}
        onSubmit={async (id, reason) => {
          const res = await fetch(`/api/appointments/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "cancelled",
              notes: reason,
            }),
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message || "Failed to cancel appointment");
          }
          setIsCancelOpen(false);
          fetchAppointment();
        }}
      />
    </div>
  );
}
