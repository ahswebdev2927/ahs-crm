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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Loader2, PhoneCall, User, Building2 } from "lucide-react";
import type { FollowUpItem } from "../types/followup.types";
import type { FollowUpType } from "../schemas/followup.schema";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: FollowUpItem | null;
  leadId?: string;
  customerId?: string;
  leadName?: string;
  customerName?: string;
  teamMembers?: Array<{ id: string; name: string }>;
  currentUserId?: string;
  onSubmit: (data: {
    leadId?: string | null;
    customerId?: string | null;
    type: FollowUpType;
    scheduledAt: Date;
    assignedToId: string;
    notes?: string;
  }) => Promise<void>;
}

export function FollowUpDialog({
  open,
  onOpenChange,
  initialData,
  leadId,
  customerId,
  leadName,
  customerName,
  teamMembers = [],
  currentUserId,
  onSubmit,
}: FollowUpDialogProps) {
  const isEditing = Boolean(initialData);

  const [type, setType] = React.useState<FollowUpType>("call");
  const [dateStr, setDateStr] = React.useState("");
  const [timeStr, setTimeStr] = React.useState("");
  const [assignedToId, setAssignedToId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [selectedLeadId, setSelectedLeadId] = React.useState("");
  const [availableLeads, setAvailableLeads] = React.useState<
    Array<{ id: string; name: string; company?: string | null }>
  >([]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Initialize form state ONLY when dialog transitions to open
  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      if (initialData) {
        setType(initialData.type);
        const d = new Date(initialData.scheduledAt);
        setDateStr(d.toISOString().split("T")[0]);
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        setTimeStr(`${hours}:${minutes}`);
        setAssignedToId(initialData.assignedToId || "current");
        setNotes(initialData.notes || "");
        setSelectedLeadId(initialData.leadId || "");
      } else {
        setType("call");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        setDateStr(tomorrow.toISOString().split("T")[0]);
        setTimeStr("10:00");
        setAssignedToId(currentUserId || (teamMembers[0]?.id || "current"));
        setNotes("");
        setSelectedLeadId(leadId || "");
      }

      // Fetch available leads if leadId/customerId not fixed
      if (!leadId && !customerId && !initialData) {
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

    const targetLeadId = leadId || selectedLeadId || initialData?.leadId || null;
    const targetCustomerId = customerId || initialData?.customerId || null;

    if (!targetLeadId && !targetCustomerId) {
      setErrorMsg("Please select a lead or customer for this follow-up");
      return;
    }

    if (!dateStr || !timeStr) {
      setErrorMsg("Please select both date and time");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const [hours, minutes] = timeStr.split(":").map(Number);
      const scheduledAt = new Date(dateStr);
      scheduledAt.setHours(hours || 0, minutes || 0, 0, 0);

      await onSubmit({
        leadId: targetLeadId,
        customerId: targetCustomerId,
        type,
        scheduledAt,
        assignedToId: assignedToId || "current",
        notes: notes.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to schedule follow-up");
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
            {isEditing ? "Reschedule Follow-up" : "Schedule Follow-up"}
          </DialogTitle>
          <DialogDescription>
            {leadName
              ? `Schedule sales communication with lead ${leadName}.`
              : customerName
              ? `Schedule sales communication with customer ${customerName}.`
              : "Set up upcoming calls, meetings, or communications."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
              {errorMsg}
            </div>
          )}

          {/* Lead Select (if not opened from a specific lead/customer and not editing) */}
          {!leadId && !customerId && !isEditing && availableLeads.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Select Lead <span className="text-destructive">*</span>
              </label>
              <Select value={selectedLeadId} onValueChange={(val) => val && setSelectedLeadId(val)}>
                <SelectTrigger className="text-xs">
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

          {/* Type Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Communication Type</label>
            <Select value={type} onValueChange={(val) => val && setType(val as FollowUpType)}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select type" />
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

          {/* Date and Time Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date
              </label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Time
              </label>
              <Input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Assigned Rep */}
          {teamMembers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Assigned Representative
              </label>
              <Select value={assignedToId} onValueChange={(val) => val && setAssignedToId(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select assigned user" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Agenda / Notes</label>
            <Textarea
              placeholder="Detail what needs to be discussed or prepared for this follow-up..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[90px]"
            />
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
              ) : isEditing ? (
                "Update Schedule"
              ) : (
                "Schedule Follow-up"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
