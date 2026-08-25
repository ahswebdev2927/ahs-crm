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
import { Loader2, ArrowRightLeft } from "lucide-react";
import type { LeadItem, LeadStageItem } from "../types/lead.types";

interface LeadStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadItem | null;
  stages: LeadStageItem[];
  onSuccess: () => void;
}

export function LeadStageDialog({
  open,
  onOpenChange,
  lead,
  stages,
  onSuccess,
}: LeadStageDialogProps) {
  const [selectedStageId, setSelectedStageId] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && lead) {
      setSelectedStageId(lead.stageId.toString());
      setReason("");
      setErrorMsg(null);
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !selectedStageId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStageId: parseInt(selectedStageId, 10),
          reason: reason || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update lead stage.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during stage transition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transition Lead Stage
          </DialogTitle>
          <DialogDescription>
            Move <span className="font-semibold text-foreground">{lead?.name}</span> to a new stage in the sales pipeline.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current Stage Display */}
          <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border flex items-center justify-between">
            <span className="text-muted-foreground">Current Stage:</span>
            {lead?.stage ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lead.stage.color }} />
                <span className="font-semibold text-foreground">{lead.stage.name}</span>
              </div>
            ) : (
              <span className="font-semibold text-foreground">—</span>
            )}
          </div>

          {/* New Stage Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Target Pipeline Stage *</label>
            <Select value={selectedStageId} onValueChange={(val) => setSelectedStageId(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select target stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span>{stage.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transition Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Transition Note / Reason</label>
            <Textarea
              placeholder="Why is this lead moving to this stage? (e.g. Budget verified during call)"
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
            <Button type="submit" disabled={isSubmitting || !selectedStageId}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Stage
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
