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
import { CheckCircle2, Loader2, DollarSign } from "lucide-react";
import {
  completeFieldVisitSchema,
  type CompleteFieldVisitInput,
  type NextActionType,
} from "../schemas/field-visit.schema";
import type { FieldVisitItem } from "../types/field-visit.types";

interface CompleteFieldVisitDialogProps {
  visit: FieldVisitItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CompleteFieldVisitDialog({
  visit,
  open,
  onOpenChange,
  onSuccess,
}: CompleteFieldVisitDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompleteFieldVisitInput>({
    resolver: zodResolver(completeFieldVisitSchema),
    defaultValues: {
      summary: "",
      requirements: "",
      outcome: "",
      feedback: "",
      expenses: 0,
      nextAction: "follow_up",
    },
  });

  const nextActionValue = watch("nextAction");

  React.useEffect(() => {
    if (visit && open) {
      reset({
        summary: visit.summary || "",
        requirements: visit.requirements || visit.lead?.requirements || "",
        outcome: visit.outcome || "",
        feedback: visit.feedback || "",
        expenses: visit.expenses ? visit.expenses / 100 : 0, // convert cents to dollars/units
        nextAction: visit.nextAction || "follow_up",
        nextActionDate: visit.nextActionDate || undefined,
      });
      setErrorMsg(null);
    }
  }, [visit, open, reset]);

  const onSubmit = async (data: CompleteFieldVisitInput) => {
    if (!visit) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      // Convert expenses number to cents integer for DB storage
      const expensesInCents = Math.round((data.expenses || 0) * 100);

      const res = await fetch(`/api/field-visits/${visit.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expenses: expensesInCents,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit field visit report.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Complete Field Visit Report</DialogTitle>
              <DialogDescription className="text-xs">
                Submit visit outcome details, site requirements, expenses, and schedule next actions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Executive Summary */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Visit Summary</label>
            <Textarea
              placeholder="Provide a concise summary of the site visit..."
              rows={3}
              className="text-xs resize-none"
              {...register("summary")}
            />
            {errors.summary && (
              <p className="text-[11px] text-rose-500">{errors.summary.message}</p>
            )}
          </div>

          {/* Gathered Site Requirements */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Gathered Site Requirements</label>
            <Textarea
              placeholder="Details on customer/site technical requirements, specifications, or machinery..."
              rows={3}
              className="text-xs resize-none"
              {...register("requirements")}
            />
            {errors.requirements && (
              <p className="text-[11px] text-rose-500">{errors.requirements.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Outcome Overview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Outcome / Interest Level</label>
              <Input
                placeholder="e.g. Highly Interested, Needs Budget Approval"
                className="text-xs h-9"
                {...register("outcome")}
              />
              {errors.outcome && (
                <p className="text-[11px] text-rose-500">{errors.outcome.message}</p>
              )}
            </div>

            {/* Expenses */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Recorded Trip Expenses ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-8 text-xs h-9"
                  {...register("expenses", { valueAsNumber: true })}
                />
              </div>
              {errors.expenses && (
                <p className="text-[11px] text-rose-500">{errors.expenses.message}</p>
              )}
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Additional Feedback & Notes</label>
            <Textarea
              placeholder="Client objections, competitor mentions, or specific follow-up instructions..."
              rows={2}
              className="text-xs resize-none"
              {...register("feedback")}
            />
            {errors.feedback && (
              <p className="text-[11px] text-rose-500">{errors.feedback.message}</p>
            )}
          </div>

          {/* Next Action Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Recommended Next Action</label>
              <Select
                value={nextActionValue || "follow_up"}
                onValueChange={(val) => setValue("nextAction", val as NextActionType)}
              >
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="Select Next Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">Follow-up Call / Callback</SelectItem>
                  <SelectItem value="proposal">Send Commercial Proposal</SelectItem>
                  <SelectItem value="second_visit">Schedule Second Visit</SelectItem>
                  <SelectItem value="negotiation">Contract Negotiation</SelectItem>
                  <SelectItem value="won">Mark Deal Won</SelectItem>
                  <SelectItem value="lost">Mark Deal Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next Action Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Next Action Target Date</label>
              <Input
                type="date"
                className="text-xs h-9 bg-background"
                onChange={(e) => {
                  if (e.target.value) {
                    setValue("nextActionDate", new Date(e.target.value).getTime());
                  } else {
                    setValue("nextActionDate", undefined);
                  }
                }}
              />
            </div>
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
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
