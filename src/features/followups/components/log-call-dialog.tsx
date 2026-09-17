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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneCall, Loader2, Building2 } from "lucide-react";
import type { FollowUpType } from "../schemas/followup.schema";

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadName?: string;
  currentUserId?: string;
  onSubmit: (data: {
    leadId?: string | null;
    outcome: string;
    nextFollowUp?: {
      type: FollowUpType;
      scheduledAt: Date;
      notes?: string;
      assignedToId?: string;
    };
  }) => Promise<void>;
}

export function LogCallDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  currentUserId,
  onSubmit,
}: LogCallDialogProps) {
  const [outcome, setOutcome] = React.useState("");
  const [scheduleNext, setScheduleNext] = React.useState(false);
  const [nextType, setNextType] = React.useState<FollowUpType>("call");
  const [nextDateStr, setNextDateStr] = React.useState("");
  const [nextTimeStr, setNextTimeStr] = React.useState("10:00");
  const [nextNotes, setNextNotes] = React.useState("");
  const [selectedLeadId, setSelectedLeadId] = React.useState("");
  const [availableLeads, setAvailableLeads] = React.useState<
    Array<{ id: string; name: string; company?: string | null }>
  >([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setOutcome("");
      setScheduleNext(false);
      setNextType("call");
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 2);
      setNextDateStr(nextDate.toISOString().split("T")[0]);
      setNextTimeStr("10:00");
      setNextNotes("");
      setSelectedLeadId(leadId || "");
      setErrorMsg(null);

      if (!leadId) {
        fetch("/api/leads?limit=100")
          .then((res) => res.json())
          .then((data) => {
            if (data.data?.items) {
              setAvailableLeads(data.data.items);
            }
          })
          .catch(() => {});
      }
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetLeadId = leadId || selectedLeadId || null;

    if (!targetLeadId) {
      setErrorMsg("Please select a lead for this call log");
      return;
    }

    if (!outcome.trim()) {
      setErrorMsg("Please enter call notes / outcome");
      return;
    }

    let nextFollowUpPayload = undefined;
    if (scheduleNext) {
      if (!nextDateStr || !nextTimeStr) {
        setErrorMsg("Please specify next follow-up date and time");
        return;
      }
      const [hours, minutes] = nextTimeStr.split(":").map(Number);
      const scheduledAt = new Date(nextDateStr);
      scheduledAt.setHours(hours || 0, minutes || 0, 0, 0);

      nextFollowUpPayload = {
        type: nextType,
        scheduledAt,
        notes: nextNotes.trim() || undefined,
        assignedToId: currentUserId || "current",
      };
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await onSubmit({
        leadId: targetLeadId,
        outcome: outcome.trim(),
        nextFollowUp: nextFollowUpPayload,
      });

      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to log call");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            Log Call Activity
          </DialogTitle>
          <DialogDescription>
            {leadName
              ? `Quick log a completed call with ${leadName}.`
              : "Record details of a completed phone conversation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {errorMsg}
            </div>
          )}

          {/* Lead Select if not prefilled */}
          {!leadId && availableLeads.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Select Lead <span className="text-destructive">*</span>
              </label>
              <Select value={selectedLeadId} onValueChange={(val) => val && setSelectedLeadId(val)}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Choose lead..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableLeads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.company ? `(${l.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Call Outcome / Summary */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Call Summary / Outcome <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="What was discussed during the call? Record key details or next steps..."
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="text-xs min-h-[90px]"
              required
            />
          </div>

          {/* Optional Next Follow-up */}
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="logNextFollowup"
                checked={scheduleNext}
                onCheckedChange={(checked) => setScheduleNext(Boolean(checked))}
              />
              <label
                htmlFor="logNextFollowup"
                className="text-xs font-semibold cursor-pointer text-foreground"
              >
                Schedule next follow-up
              </label>
            </div>

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
                    placeholder="Next step notes..."
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
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Call Log"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
