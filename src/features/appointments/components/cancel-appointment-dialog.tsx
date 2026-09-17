"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentItem } from "../types/appointment.types";

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentItem | null;
  onSubmit: (id: string, reason: string) => Promise<void>;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSubmit,
}: CancelAppointmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setReason("");
      setErrorMsg("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    if (!reason.trim()) {
      setErrorMsg("Cancellation reason is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(appointment.id, reason);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to cancel appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-rose-600 dark:text-rose-400">
            Cancel Appointment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Are you sure you want to cancel appointment &quot;{appointment?.title}&quot;? Please record the cancellation reason.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {errorMsg && <p className="text-[11px] text-rose-500 font-medium">{errorMsg}</p>}

          <div className="space-y-1.5">
            <label htmlFor="cancellationReason" className="text-xs font-medium text-foreground">
              Cancellation Reason *
            </label>
            <Textarea
              id="cancellationReason"
              placeholder="e.g., Client requested cancellation, project scope put on hold..."
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
              Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
