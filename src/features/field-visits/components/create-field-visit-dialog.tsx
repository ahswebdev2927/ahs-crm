"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import { createFieldVisitSchema } from "../schemas/field-visit.schema";
import type { FieldSalesUserOption } from "./field-visit-filters";

interface CreateFieldVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldSalesUsers: FieldSalesUserOption[];
  defaultLeadId?: string;
  defaultCustomerId?: string;
  onSuccess: () => void;
}

interface FormValues {
  leadId?: string;
  customerId?: string;
  purpose: string;
  visitDate: number;
  assignedToId: string;
  expenses?: number;
  requirements?: string;
}

export function CreateFieldVisitDialog({
  open,
  onOpenChange,
  fieldSalesUsers,
  defaultLeadId,
  defaultCustomerId,
  onSuccess,
}: CreateFieldVisitDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createFieldVisitSchema) as any,
    defaultValues: {
      leadId: defaultLeadId || undefined,
      customerId: defaultCustomerId || undefined,
      purpose: "",
      visitDate: Date.now() + 86400000,
      assignedToId: fieldSalesUsers[0]?.id || "",
      expenses: 0,
      requirements: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        leadId: defaultLeadId || undefined,
        customerId: defaultCustomerId || undefined,
        purpose: "",
        visitDate: Date.now() + 86400000,
        assignedToId: fieldSalesUsers[0]?.id || "",
        expenses: 0,
        requirements: "",
      });
      setErrorMsg(null);
    }
  }, [open, defaultLeadId, defaultCustomerId, fieldSalesUsers, reset]);

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/field-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to schedule field visit.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Schedule Field Visit</DialogTitle>
              <DialogDescription className="text-xs">
                Schedule a site visit for a Field Sales agent.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2 text-xs">
          {/* Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Visit Purpose *</label>
            <Input
              placeholder="e.g. On-site HVAC ducting inspection"
              className="text-xs h-9"
              {...register("purpose")}
            />
            {errors.purpose && (
              <p className="text-[11px] text-rose-500">{errors.purpose.message}</p>
            )}
          </div>

          {/* Schedule Date & Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Visit Date & Time *</label>
            <Input
              type="datetime-local"
              className="text-xs h-9 bg-background"
              onChange={(e) => {
                if (e.target.value) {
                  setValue("visitDate", new Date(e.target.value).getTime());
                }
              }}
            />
            {errors.visitDate && (
              <p className="text-[11px] text-rose-500">{errors.visitDate.message}</p>
            )}
          </div>

          {/* Assigned Field Sales Representative */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Assigned Representative *</label>
            <Select onValueChange={(val) => setValue("assignedToId", val)}>
              <SelectTrigger className="text-xs h-9 bg-background">
                <SelectValue placeholder="Select Field Sales Representative" />
              </SelectTrigger>
              <SelectContent>
                {fieldSalesUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedToId && (
              <p className="text-[11px] text-rose-500">{errors.assignedToId.message}</p>
            )}
          </div>

          {/* Additional Requirements / Initial Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Initial Site Requirements / Notes</label>
            <Textarea
              placeholder="Any specific client requirements or site entry instructions..."
              rows={2}
              className="text-xs resize-none"
              {...register("requirements")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Visit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
