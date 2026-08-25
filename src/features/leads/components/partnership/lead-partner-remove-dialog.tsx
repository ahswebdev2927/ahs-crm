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
import { UserMinus, AlertCircle, Loader2 } from "lucide-react";
import type { LeadPartnerItem } from "../../types/lead.types";

interface LeadPartnerRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  partner: LeadPartnerItem | null;
  onPartnerRemoved: () => void;
}

export function LeadPartnerRemoveDialog({
  open,
  onOpenChange,
  leadId,
  partner,
  onPartnerRemoved,
}: LeadPartnerRemoveDialogProps) {
  const [removalReason, setRemovalReason] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setRemovalReason("");
      setErrorMsg(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/partners/${partner.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          removalReason: removalReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || (json.status !== true && json.success !== true)) {
        throw new Error(json.message || "Failed to remove lead partner.");
      }

      onPartnerRemoved();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!partner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
            <UserMinus className="h-4 w-4" />
            Remove Lead Partner
          </DialogTitle>
          <DialogDescription className="text-xs">
            Are you sure you want to remove <strong className="text-foreground">{partner.partner?.name}</strong> ({partner.percentage}% share) from this lead?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Removing this partner will release their allocated {partner.percentage}% share back to the lead owner and revoke partnered visibility.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Reason for Removal (Optional)</label>
            <Textarea
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="e.g. Reassigned to another account, deal scope changed..."
              className="text-xs resize-none"
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={submitting}
              className="text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Removing...
                </>
              ) : (
                "Confirm Removal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
