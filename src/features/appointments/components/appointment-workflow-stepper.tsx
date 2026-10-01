"use client";

import * as React from "react";
import { Check, Clock, FileText, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import type { AppointmentStatus } from "../schemas/appointment.schema";
import { cn } from "@/lib/utils";

interface AppointmentWorkflowStepperProps {
  status: AppointmentStatus;
  hasReport?: boolean;
  className?: string;
}

export function AppointmentWorkflowStepper({
  status,
  hasReport = false,
  className,
}: AppointmentWorkflowStepperProps) {
  // If cancelled, rescheduled, or no-show, show distinct alert state
  if (status === "cancelled" || status === "rescheduled" || status === "no_show") {
    return (
      <div className={cn("rounded-lg border border-border p-3.5 bg-muted/30 flex items-center justify-between text-xs", className)}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            Lifecycle Status:{" "}
            <span className="capitalize font-semibold">
              {status.replace("_", " ")}
            </span>
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {status === "cancelled"
            ? "Appointment was cancelled."
            : status === "rescheduled"
            ? "Appointment has been rescheduled."
            : "Client did not attend."}
        </span>
      </div>
    );
  }

  // Step Calculation:
  // 1 = Scheduled (Received)
  // 2 = Confirmed
  // 3 = In Progress (Report Unlocked)
  // 4 = Completed (Report Submitted)
  let currentStep = 1;
  if (status === "confirmed") currentStep = 2;
  else if (status === "in_progress") currentStep = 3;
  else if (status === "completed") currentStep = 4;

  const steps = [
    {
      step: 1,
      title: "Scheduled",
      subtitle: "Received & Assigned",
      actionLabel: "Mark Confirmed",
    },
    {
      step: 2,
      title: "Confirmed",
      subtitle: "Acknowledged by Agent",
      actionLabel: "Start Visit",
    },
    {
      step: 3,
      title: "In Progress",
      subtitle: "Report Unlocked",
      actionLabel: "Generate Report",
    },
    {
      step: 4,
      title: "Completed",
      subtitle: "Report Generated",
      actionLabel: "Auto-Completed",
    },
  ];

  return (
    <div className={cn("w-full bg-card rounded-lg border border-border p-4 shadow-2xs", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Field Sales Workflow Progression
        </span>
        <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {currentStep === 1 && "Action Required: Confirm Appointment"}
          {currentStep === 2 && "Action Required: Start Visit On-Site"}
          {currentStep === 3 && "Action Required: Generate Visit Report"}
          {currentStep === 4 && "Completed: Visit Report Generated & Filed"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
        {steps.map((item, idx) => {
          const isDone = currentStep > item.step || (item.step === 4 && currentStep === 4);
          const isCurrent = currentStep === item.step && currentStep !== 4;
          const isUpcoming = currentStep < item.step;

          return (
            <div
              key={item.step}
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-md border transition-all",
                isDone && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60",
                isCurrent && "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-xs",
                isUpcoming && "bg-muted/20 border-border/60 opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold shrink-0 mt-0.5",
                  isDone && "bg-emerald-600 text-white",
                  isCurrent && "bg-amber-500 text-white animate-pulse",
                  isUpcoming && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : item.step}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs font-semibold truncate",
                    isDone && "text-emerald-900 dark:text-emerald-300",
                    isCurrent && "text-amber-950 dark:text-amber-300 font-bold",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {item.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
