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
import { AlertTriangle, UserCheck } from "lucide-react";

interface FieldAwarenessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionTitle: string;
  appointmentTitle?: string;
  assignedToName?: string;
  onConfirm: () => void | Promise<void>;
}

export function FieldAwarenessDialog({
  open,
  onOpenChange,
  actionTitle,
  appointmentTitle,
  assignedToName,
  onConfirm,
}: FieldAwarenessDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to confirm field awareness action:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-base font-semibold">
              Confirm Field Action ({actionTitle})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            You are performing a field sales operation ({actionTitle}) for{" "}
            {appointmentTitle ? (
              <span className="font-semibold text-foreground">&quot;{appointmentTitle}&quot;</span>
            ) : (
              "this appointment"
            )}.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 my-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
            <UserCheck className="h-4 w-4 shrink-0" />
            Field Sales Representative Confirmation
          </div>
          <p className="leading-normal">
            Is the assigned Field Sales Representative{" "}
            {assignedToName ? (
              <strong className="text-amber-950 dark:text-amber-100">({assignedToName})</strong>
            ) : null}{" "}
            aware of this change?
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {isSubmitting ? "Confirming..." : "Yes, Representative is Aware"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
