"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentItem } from "../types/appointment.types";

interface RescheduleAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentItem | null;
  onSubmit: (id: string, newStartTime: number, newEndTime: number, reason: string) => Promise<void>;
}

export function RescheduleAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSubmit,
}: RescheduleAppointmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [dateStr, setDateStr] = React.useState("");
  const [startTimeStr, setStartTimeStr] = React.useState("");
  const [endTimeStr, setEndTimeStr] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    if (appointment && open) {
      const start = new Date(appointment.startTime);
      const end = new Date(appointment.endTime);
      setDateStr(format(start, "yyyy-MM-dd"));
      setStartTimeStr(format(start, "HH:mm"));
      setEndTimeStr(format(end, "HH:mm"));
      setReason("");
      setErrorMsg("");
    }
  }, [appointment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    if (!reason.trim()) {
      setErrorMsg("Reschedule reason is required.");
      return;
    }

    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const [startH, startM] = startTimeStr.split(":").map(Number);
      const [endH, endM] = endTimeStr.split(":").map(Number);

      const startObj = new Date(year, month - 1, day, startH, startM);
      const endObj = new Date(year, month - 1, day, endH, endM);

      if (endObj.getTime() <= startObj.getTime()) {
        setErrorMsg("End time must be after start time.");
        return;
      }

      setIsSubmitting(true);
      await onSubmit(appointment.id, startObj.getTime(), endObj.getTime(), reason);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to reschedule appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Reschedule Appointment</DialogTitle>
          <DialogDescription className="text-xs">
            Select a new date/time slot and provide a reason for rescheduling.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {errorMsg && <p className="text-[11px] text-rose-500 font-medium">{errorMsg}</p>}

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">New Date *</label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Start Time *</label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">End Time *</label>
              <Input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rescheduleReason" className="text-xs font-medium text-foreground">
              Reschedule Reason *
            </label>
            <Textarea
              id="rescheduleReason"
              placeholder="e.g., Customer requested timing change due to schedule conflict..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
