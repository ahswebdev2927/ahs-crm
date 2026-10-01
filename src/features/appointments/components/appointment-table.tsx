"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, User, MoreHorizontal, Calendar, Eye, RefreshCw, XCircle, CheckCircle2, Clock, ExternalLink, FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { AppointmentItem } from "../types/appointment.types";
import type { AppointmentStatus } from "../schemas/appointment.schema";

interface AppointmentTableProps {
  items: AppointmentItem[];
  onView: (apt: AppointmentItem) => void;
  onEdit: (apt: AppointmentItem) => void;
  onStatusChange: (apt: AppointmentItem, status: AppointmentStatus) => void;
  onReschedule: (apt: AppointmentItem) => void;
  onCancel: (apt: AppointmentItem) => void;
}

export function getAppointmentStatusBadge(status: AppointmentStatus) {
  switch (status) {
    case "scheduled":
      return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">Scheduled</Badge>;
    case "confirmed":
      return <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">Confirmed</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-emerald-500 text-white border-transparent">Completed</Badge>;
    case "rescheduled":
      return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">Rescheduled</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">Cancelled</Badge>;
    case "no_show":
      return <Badge variant="outline" className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700">No Show</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function AppointmentTable({
  items,
  onView,
  onEdit,
  onStatusChange,
  onReschedule,
  onCancel,
}: AppointmentTableProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card p-6">
        <Calendar className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No appointments found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No appointments match the current filters or query criteria. Schedule a new field visit to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border dark:border-input/10 bg-card shadow-2xs">
      <table className="w-full text-xs text-left">
        <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
          <tr>
            <th className="px-4 py-3">Title & Client</th>
            <th className="px-4 py-3">Date & Time</th>
            <th className="px-4 py-3">Location / Site</th>
            <th className="px-4 py-3">Assigned Representative</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {items.map((apt) => {
            const startDate = new Date(apt.startTime);
            const endDate = new Date(apt.endTime);
            const formattedDate = format(startDate, "EEE, MMM d, yyyy");
            const formattedTime = `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
            const canEditStatus = user ? (user.id === apt.createdById || user.id === apt.assignedToId) : false;

            const clientName = apt.lead
              ? apt.lead.contactName
              : apt.customer
              ? apt.customer.name
              : "Client";
            const clientLink = apt.leadId
              ? `/sales/leads/${apt.leadId}`
              : apt.customerId
              ? `/customers/${apt.customerId}`
              : null;

            return (
              <tr key={apt.id} className="hover:bg-muted/30 transition-colors">
                {/* Title & Client */}
                <td className="px-4 py-3">
                  <Link
                    href={`/sales/appointments/${apt.id}`}
                    className="font-semibold text-foreground text-sm hover:text-primary transition-colors block"
                  >
                    {apt.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {clientLink ? (
                      <Link href={clientLink} className="hover:underline text-primary font-medium">
                        {clientName}
                      </Link>
                    ) : (
                      <span>{clientName}</span>
                    )}
                  </div>
                </td>

                {/* Date & Time */}
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{formattedDate}</div>
                  <div className="text-muted-foreground text-[11px]">{formattedTime}</div>
                </td>

                {/* Location */}
                <td className="px-4 py-3">
                  {apt.location ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground max-w-xs truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="truncate" title={apt.location}>
                        {apt.location}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60 italic">Not specified</span>
                  )}
                </td>

                {/* Assigned Rep */}
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{apt.assignedTo.name}</div>
                  <div className="text-[11px] text-muted-foreground">{apt.assignedTo.email}</div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">{getAppointmentStatusBadge(apt.status)}</td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Inline Quick Action based on Field Agent Workflow Step */}
                    {apt.status === "scheduled" && canEditStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(apt, "confirmed")}
                        className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                        title="Confirm Appointment"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                        Confirm
                      </Button>
                    )}

                    {apt.status === "confirmed" && canEditStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(apt, "in_progress")}
                        className="h-7 text-[11px] px-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                        title="Start Visit / Mark In Progress"
                      >
                        <Clock className="h-3 w-3 mr-1 text-amber-500" />
                        Start Visit
                      </Button>
                    )}

                    {apt.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/sales/appointments/${apt.id}`)}
                        className="h-7 text-[11px] px-2 bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                        title="Open Field Visit Report Generator"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Generate Report
                      </Button>
                    )}

                    {apt.status === "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/sales/appointments/${apt.id}`)}
                        className="h-7 text-[11px] px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="View Completed Report"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                        Report Completed
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => router.push(`/sales/appointments/${apt.id}`)}>
                          <ExternalLink className="h-3.5 w-3.5 mr-2 text-primary" />
                          Open Workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onView(apt)}>
                          <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                          Quick View
                        </DropdownMenuItem>

                        {(() => {
                          const isInsideTeam = user ? user.roleCode !== "field_sales" : false;
                          const isAssigneeOrCreator = user ? (user.id === apt.createdById || user.id === apt.assignedToId) : false;
                          const canEditDetails = isInsideTeam || (user ? user.id === apt.createdById : false);
                          const canCancel = isInsideTeam || (user ? user.id === apt.createdById : false);
                          const canFieldActions = isInsideTeam || isAssigneeOrCreator;

                          if (!canFieldActions && !canEditDetails && !canCancel) {
                            return null;
                          }

                          return (
                            <>
                              {canEditDetails && (
                                <DropdownMenuItem onClick={() => onEdit(apt)}>
                                  <Calendar className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  Edit Details
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />

                              {canFieldActions && (
                                <>
                                  {apt.status === "scheduled" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(apt, "confirmed")}>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                      Mark Confirmed
                                    </DropdownMenuItem>
                                  )}

                                  {apt.status === "confirmed" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(apt, "in_progress")}>
                                      <Clock className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                      Start Visit
                                    </DropdownMenuItem>
                                  )}

                                  {apt.status === "in_progress" && (
                                    <DropdownMenuItem onClick={() => router.push(`/sales/appointments/${apt.id}`)}>
                                      <FileText className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                      Generate Report
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem onClick={() => onReschedule(apt)}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-2 text-purple-500" />
                                    Reschedule
                                  </DropdownMenuItem>
                                </>
                              )}

                              {canCancel && apt.status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => onCancel(apt)} className="text-rose-600 dark:text-rose-400">
                                  <XCircle className="h-3.5 w-3.5 mr-2" />
                                  Cancel Appointment
                                </DropdownMenuItem>
                              )}
                            </>
                          );
                        })()}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
