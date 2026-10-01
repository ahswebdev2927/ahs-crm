"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, User, Clock, FileText, CheckCircle2, RefreshCw, XCircle, Calendar, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { AppointmentItem } from "../types/appointment.types";
import type { AppointmentStatus } from "../schemas/appointment.schema";
import { getAppointmentStatusBadge } from "./appointment-table";

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentItem | null;
  onEdit: (apt: AppointmentItem) => void;
  onStatusChange: (apt: AppointmentItem, status: AppointmentStatus) => void;
  onReschedule: (apt: AppointmentItem) => void;
  onCancel: (apt: AppointmentItem) => void;
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  onEdit,
  onStatusChange,
  onReschedule,
  onCancel,
}: AppointmentDetailDialogProps) {
  const { user } = useAuth();

  if (!appointment) return null;

  const canEditStatus = user
    ? user.id === appointment.createdById || user.id === appointment.assignedToId
    : false;

  const startDate = new Date(appointment.startTime);
  const endDate = new Date(appointment.endTime);

  const clientName = appointment.lead
    ? appointment.lead.contactName
    : appointment.customer
    ? appointment.customer.name
    : "Client";
  const clientLink = appointment.leadId
    ? `/sales/leads/${appointment.leadId}`
    : appointment.customerId
    ? `/customers/${appointment.customerId}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold">{appointment.title}</DialogTitle>
              {getAppointmentStatusBadge(appointment.status)}
            </div>
            <Link
              href={`/sales/appointments/${appointment.id}`}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <span>Open Workspace</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <DialogDescription className="text-xs">
            Appointment Reference #{appointment.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Client Reference */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Associated Client</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{clientName}</p>
              {appointment.lead?.companyName && (
                <p className="text-[11px] text-muted-foreground">{appointment.lead.companyName}</p>
              )}
            </div>
            {clientLink && (
              <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => window.open(clientLink, '_blank')}>
                <span>View Profile</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border/50 space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                Date
              </p>
              <p className="font-semibold text-foreground">{format(startDate, "EEEE, MMM d, yyyy")}</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Time Slot
              </p>
              <p className="font-semibold text-foreground">
                {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
              </p>
            </div>
          </div>

          {/* Location */}
          {appointment.location && (
            <div className="p-3 rounded-lg border border-border/50 space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                Meeting Location
              </p>
              <p className="font-semibold text-foreground">{appointment.location}</p>
            </div>
          )}

          {/* Assigned & Created By */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-primary" />
                Assigned Representative
              </p>
              <p className="font-semibold text-foreground">{appointment.assignedTo.name}</p>
              <p className="text-[11px] text-muted-foreground">{appointment.assignedTo.email}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground font-medium">Created By</p>
              <p className="font-semibold text-foreground">{appointment.createdBy.name}</p>
              <p className="text-[11px] text-muted-foreground">{appointment.createdBy.email}</p>
            </div>
          </div>

          {/* Description / Notes */}
          {appointment.description && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Notes / Agenda
              </p>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-foreground whitespace-pre-wrap">
                {appointment.description}
              </div>
            </div>
          )}

          {/* Reschedule / Cancel Reasons */}
          {appointment.rescheduleReason && (
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 space-y-1">
              <p className="font-semibold text-[11px]">Reschedule Reason:</p>
              <p>{appointment.rescheduleReason}</p>
            </div>
          )}

          {appointment.cancellationReason && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-1">
              <p className="font-semibold text-[11px]">Cancellation Reason:</p>
              <p>{appointment.cancellationReason}</p>
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="pt-3 border-t border-border/60">
            {(() => {
              const isInsideTeam = user ? user.roleCode !== "field_sales" : false;
              const isAssigneeOrCreator = user ? (user.id === appointment.createdById || user.id === appointment.assignedToId) : false;
              const canEditDetails = isInsideTeam || (user ? user.id === appointment.createdById : false);
              const canCancel = isInsideTeam || (user ? user.id === appointment.createdById : false);
              const canFieldActions = isInsideTeam || isAssigneeOrCreator;

              if (!canFieldActions && !canEditDetails && !canCancel) {
                return (
                  <div className="p-2.5 rounded-md bg-muted/60 text-muted-foreground text-xs text-center border border-border italic">
                    View Only Mode
                  </div>
                );
              }

              return (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {canFieldActions && (
                      <>
                        {appointment.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusChange(appointment, "confirmed")}
                            className="h-8 text-xs text-emerald-600 border-emerald-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Confirm
                          </Button>
                        )}

                        {appointment.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusChange(appointment, "in_progress")}
                            className="h-8 text-xs text-amber-600 border-amber-300"
                          >
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Start Visit
                          </Button>
                        )}

                        {appointment.status === "in_progress" && (
                          <Link href={`/sales/appointments/${appointment.id}`}>
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Generate Report
                            </Button>
                          </Link>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReschedule(appointment)}
                          className="h-8 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1 text-purple-500" />
                          Reschedule
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canEditDetails && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(appointment)}
                        className="h-8 text-xs"
                      >
                        Edit
                      </Button>
                    )}
                    {canCancel && appointment.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onCancel(appointment)}
                        className="h-8 text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
