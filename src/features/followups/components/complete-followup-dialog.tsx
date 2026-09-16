"use client";

import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Calendar, Clock } from "lucide-react";
import type { FollowUpItem } from "../types/followup.types";
import type { FollowUpType } from "../schemas/followup.schema";

interface CompleteFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUpItem | null;
  onSubmit: (
    id: string,
    data: {
      outcome: string;
      completedAt?: Date;
      nextFollowUp?: {
        type: FollowUpType;
        scheduledAt: Date;
        notes?: string;
        assignedToId?: string;
      };
    }
  ) => Promise<void>;
}

export function CompleteFollowUpDialog({
  open,
  onOpenChange,
  followUp,
  onSubmit,
}: CompleteFollowUpDialogProps) {
  const [outcome, setOutcome] = React.useState("");
  const [scheduleNext, setScheduleNext] = React.useState(false);
  const [nextType, setNextType] = React.useState<FollowUpType>("call");
  const [nextDateStr, setNextDateStr] = React.useState("");
  const [nextTimeStr, setNextTimeStr] = React.useState("10:00");
  const [nextNotes, setNextNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setOutcome("");
      setScheduleNext(false);
      setNextType("call");
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 3);
      setNextDateStr(nextWeek.toISOString().split("T")[0]);
      setNextTimeStr("10:00");
      setNextNotes("");
      setErrorMsg(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUp) return;

    if (!outcome.trim()) {
      setErrorMsg("Please provide outcome details for this follow-up");
      return;
    }

    let nextFollowUpPayload = undefined;
    if (scheduleNext) {
      if (!nextDateStr || !nextTimeStr) {
        setErrorMsg("Please specify date and time for the next follow-up");
        return;
      }
      const [hours, minutes] = nextTimeStr.split(":").map(Number);
      const scheduledAt = new Date(nextDateStr);
      scheduledAt.setHours(hours || 0, minutes || 0, 0, 0);

      nextFollowUpPayload = {
        type: nextType,
        scheduledAt,
        notes: nextNotes.trim() || undefined,
        assignedToId: followUp.assignedToId,
      };
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await onSubmit(followUp.id, {
        outcome: outcome.trim(),
        completedAt: new Date(),
        nextFollowUp: nextFollowUpPayload,
      });

      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to mark follow-up complete");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!followUp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            Complete Follow-up
          </DialogTitle>
          <DialogDescription>
            Record the outcome and conversation notes for this {followUp.type.replace("_", " ")}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {errorMsg}
            </div>
          )}

          {/* Outcome Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Call / Communication Outcome <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="What was discussed? What was the outcome or client feedback?"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="text-xs min-h-[90px]"
              required
            />
          </div>

          {/* Toggle Next Follow-up */}
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="scheduleNext"
                checked={scheduleNext}
                onCheckedChange={(checked) => setScheduleNext(Boolean(checked))}
              />
              <label
                htmlFor="scheduleNext"
                className="text-xs font-semibold cursor-pointer text-foreground"
              >
                Schedule next follow-up immediately
              </label>
            </div>

            {/* Next Follow-up Form Fields */}
            {scheduleNext && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Next Type</label>
                  <Select value={nextType} onValueChange={(val) => val && setNextType(val as FollowUpType)}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Message</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="site_visit">Site Visit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Next Date</label>
                    <Input
                      type="date"
                      value={nextDateStr}
                      onChange={(e) => setNextDateStr(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Next Time</label>
                    <Input
                      type="time"
                      value={nextTimeStr}
                      onChange={(e) => setNextTimeStr(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Next Agenda</label>
                  <Input
                    placeholder="Next step agenda..."
                    value={nextNotes}
                    onChange={(e) => setNextNotes(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Follow-up"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
