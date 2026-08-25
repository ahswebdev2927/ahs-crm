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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserCheck } from "lucide-react";
import type { LeadItem, UserSummary } from "../types/lead.types";

interface LeadAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadItem | null;
  teamUsers: UserSummary[];
  onSuccess: () => void;
}

export function LeadAssignDialog({
  open,
  onOpenChange,
  lead,
  teamUsers,
  onSuccess,
}: LeadAssignDialogProps) {
  const [selectedOwnerId, setSelectedOwnerId] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && lead) {
      setSelectedOwnerId(lead.ownerId || "");
      setReason("");
      setErrorMsg(null);
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !selectedOwnerId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: selectedOwnerId, reason: reason || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reassign lead.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during reassignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Reassign Lead Owner
          </DialogTitle>
          <DialogDescription>
            Change the assigned sales representative for <span className="font-semibold text-foreground">{lead?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current Owner Display */}
          <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border">
            <span className="text-muted-foreground">Current Owner: </span>
            <span className="font-semibold text-foreground">
              {lead?.owner ? lead.owner.name : "Unassigned"}
            </span>
          </div>

          {/* New Owner Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">New Assigned Owner *</label>
            <Select value={selectedOwnerId} onValueChange={(val) => setSelectedOwnerId(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select new owner" />
              </SelectTrigger>
              <SelectContent>
                {teamUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Reassignment Reason (Optional)</label>
            <Textarea
              placeholder="Provide context for transferring ownership..."
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedOwnerId}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reassign Owner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
